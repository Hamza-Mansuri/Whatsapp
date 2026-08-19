import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { getIO, getUserSockets } from '../socket/socket.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

// @desc    Get messages for a conversation
// @route   GET /api/conversations/:conversationId/messages
// @access  Private
export const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Verify user belongs to the conversation
    const isParticipant = conversation.participants.some(
      (pId) => pId.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this conversation',
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    // Get messages, sort newest -> oldest for skipping, then reverse chronologically
    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatar')
      .populate({
        path: 'replyTo',
        select: 'text sender type mediaUrl isDeleted createdAt',
        populate: {
          path: 'sender',
          select: 'name',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    messages.reverse();

    const totalMessages = await Message.countDocuments({ conversation: conversationId });
    const hasMore = skip + messages.length < totalMessages;

    res.status(200).json({
      success: true,
      messages,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    });
  } catch (error) {
    console.error('Get Messages Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving messages list',
    });
  }
};

// @desc    Send a message in a conversation
// @route   POST /api/conversations/:conversationId/messages
// @access  Private
export const createMessage = async (req, res) => {
  const { conversationId } = req.params;
    const { text, replyTo, isForwarded, type, callType, callStatus } = req.body;

    try {
      if ((!text || !text.trim()) && type !== 'call') {
        return res.status(400).json({
          success: false,
          message: 'Message text cannot be empty',
        });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      // Verify user belongs to the conversation
      const isParticipant = conversation.participants.some(
        (pId) => pId.toString() === req.user.id
      );
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to send messages to this conversation',
        });
      }

      // Resolve dynamic message status based on recipient online state and conversation room presence
      const otherParticipantId = conversation.participants.find(
        (pId) => pId.toString() !== req.user._id.toString()
      );

      let status = 'sent';
      const io = getIO();

      if (otherParticipantId) {
        const otherSockets = getUserSockets(otherParticipantId.toString());
        if (otherSockets.length > 0) {
          const roomName = `conversation_${conversationId}`;
          const roomSockets = io?.sockets?.adapter?.rooms?.get(roomName);
          const isRecipientViewing = otherSockets.some((socketId) => roomSockets?.has(socketId));
          status = isRecipientViewing ? 'read' : 'delivered';
        }
      }

      const messageData = {
        conversation: conversationId,
        sender: req.user.id,
        text: text ? text.trim() : '',
        status,
      };

      if (type === 'call') {
        messageData.type = 'call';
        messageData.callType = callType;
        messageData.callStatus = callStatus;
      }

      if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
        messageData.replyTo = replyTo;
      }

      if (isForwarded === true || isForwarded === 'true') {
        messageData.isForwarded = true;
        if (req.body.type === 'image' && req.body.mediaUrl) {
          messageData.type = 'image';
          messageData.mediaUrl = req.body.mediaUrl;
        }
      }

      // Create the message
      const message = await Message.create(messageData);

    // Populate details for the response
    await message.populate([
      { path: 'sender', select: 'name avatar' },
      {
        path: 'replyTo',
        select: 'text sender type mediaUrl isDeleted createdAt',
        populate: {
          path: 'sender',
          select: 'name',
        },
      },
    ]);

    // Update conversation last message details
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = Date.now();
    await conversation.save();

    // Broadcast newly created message to conversation room and trigger recipient list updates
    if (io) {
      const emitMsg = message.toJSON();
      // Emit the message to the conversation room
      io.to(`conversation_${conversationId}`).emit('message_received', emitMsg);

      // Notify the recipient's personal room to update their conversation preview
      if (otherParticipantId) {
        io.to(`user_${otherParticipantId.toString()}`).emit('conversation_updated', {
          conversationId,
          lastMessage: emitMsg,
        });
      }
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Create Message Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error sending message',
    });
  }
};

// @desc    Send a media message in a conversation
// @route   POST /api/conversations/:conversationId/messages/media
// @access  Private
export const createMediaMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { text, replyTo, isForwarded, mediaDuration } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No media file provided' });
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (pId) => pId.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'You are not authorized to send messages to this conversation' });
    }

    const otherParticipantId = conversation.participants.find(
      (pId) => pId.toString() !== req.user._id.toString()
    );

    let status = 'sent';
    const io = getIO();

    if (otherParticipantId) {
      const otherSockets = getUserSockets(otherParticipantId.toString());
      if (otherSockets.length > 0) {
        const roomName = `conversation_${conversationId}`;
        const roomSockets = io?.sockets?.adapter?.rooms?.get(roomName);
        const isRecipientViewing = otherSockets.some((socketId) => roomSockets?.has(socketId));
        status = isRecipientViewing ? 'read' : 'delivered';
      }
    }

    // Determine type based on mimetype
    let type = 'file';
    let resourceType = 'raw';
    let folder = 'whatsapp/messages/docs';

    if (req.file.mimetype.startsWith('audio/')) {
      type = 'audio';
      resourceType = 'video'; // Cloudinary handles audio as video
      folder = 'whatsapp/messages/voice';
    } else if (req.file.mimetype.startsWith('video/')) {
      type = 'image'; // Frontend currently treats video messages as type='image' and renders conditionally
      resourceType = 'video';
      folder = 'whatsapp/messages/videos';
    } else if (req.file.mimetype.startsWith('image/')) {
      type = 'image';
      resourceType = 'image';
      folder = 'whatsapp/messages/images';
    }
    
    const result = await uploadToCloudinary(req.file.buffer, folder, resourceType);
    const mediaUrl = result.secure_url;

    const messageData = {
      conversation: conversationId,
      sender: req.user.id,
      text: text ? text.trim() : '',
      type,
      mediaUrl,
      fileSize: req.file.size,
      status,
    };

    if (type === 'audio' && mediaDuration) {
      messageData.mediaDuration = parseFloat(mediaDuration) || 0;
    }

    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      messageData.replyTo = replyTo;
    }

    if (isForwarded === true || isForwarded === 'true') {
      messageData.isForwarded = true;
    }

    const message = await Message.create(messageData);

    await message.populate([
      { path: 'sender', select: 'name avatar' },
      {
        path: 'replyTo',
        select: 'text sender type mediaUrl isDeleted createdAt',
        populate: {
          path: 'sender',
          select: 'name',
        },
      },
    ]);

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = Date.now();
    await conversation.save();

    if (io) {
      const emitMsg = message.toJSON();
      io.to(`conversation_${conversationId}`).emit('message_received', emitMsg);
      if (otherParticipantId) {
        io.to(`user_${otherParticipantId.toString()}`).emit('conversation_updated', {
          conversationId,
          lastMessage: emitMsg,
        });
      }
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Create Media Message Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error sending media message' });
  }
};

// @desc    Forward messages to multiple conversations
// @route   POST /api/messages/forward
// @access  Private
export const forwardMessages = async (req, res) => {
  const { messageIds, conversationIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Message IDs are required' });
  }

  if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Conversation IDs are required' });
  }

  try {
    // 1. Fetch original messages and ensure they aren't deleted
    const originalMessages = await Message.find({
      _id: { $in: messageIds },
      isDeleted: false,
    }).sort({ createdAt: 1 }); // Preserve chronological order

    if (originalMessages.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid messages found to forward' });
    }

    const userId = req.user._id;

    // 2. Validate user access to all target conversations
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      participants: userId,
    });

    if (conversations.length !== conversationIds.length) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to one or more conversations' });
    }

    const newMessagesToInsert = [];

    // 3. Prepare new messages payload
    conversations.forEach((conversation) => {
      originalMessages.forEach((msg) => {
        newMessagesToInsert.push({
          conversation: conversation._id,
          sender: userId,
          text: msg.text,
          type: msg.type,
          mediaUrl: msg.mediaUrl,
          isForwarded: true,
          status: 'sent',
          reactions: [],
        });
      });
    });

    // 4. Insert multiple messages efficiently
    const createdMessages = await Message.insertMany(newMessagesToInsert);

    // Populate sender info for the newly created messages
    const populatedMessages = await Message.populate(createdMessages, {
      path: 'sender',
      select: 'name avatar',
    });

    // 5. Broadcast via Socket.IO
    const io = getIO();
    if (io) {
      populatedMessages.forEach((msg) => {
        io.to(`conversation_${msg.conversation.toString()}`).emit('receive_message', msg);
      });
      
      // Update chat previews for all involved users
      conversations.forEach((conversation) => {
        conversation.participants.forEach((participantId) => {
          io.to(`user_${participantId.toString()}`).emit('conversation_updated', {
            conversationId: conversation._id,
            lastMessage: populatedMessages.filter((m) => m.conversation.toString() === conversation._id.toString()).pop(),
            timestamp: new Date(),
          });
        });
      });
    }

    res.status(201).json({
      success: true,
      messages: populatedMessages,
    });
  } catch (error) {
    console.error('Forward Messages Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to forward messages' });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Verify sender ownership
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this message',
      });
    }

    const conversationId = message.conversation;

    // Soft delete message
    message.isDeleted = true;
    message.text = 'This message was deleted';
    message.reactions = [];
    message.mediaUrl = null;
    await message.save();

    // Update conversation lastMessage reference if necessary
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      if (conversation.lastMessage && conversation.lastMessage.toString() === messageId) {
        // Broadcast the updated soft-deleted message as the last message
        const io = getIO();
        if (io) {
          conversation.participants.forEach((pId) => {
            io.to(`user_${pId.toString()}`).emit('conversation_updated', {
              conversationId,
              lastMessage: message,
            });
          });
        }
      }
    }

    // Broadcast delete event to conversation room
    const io = getIO();
    if (io) {
      io.to(`conversation_${conversationId.toString()}`).emit('message_deleted', {
        messageId,
        conversationId,
        isDeleted: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete Message Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting message',
    });
  }
};

// @desc    Toggle reaction on a message
// @route   POST /api/messages/:messageId/reaction
// @access  Private
export const toggleReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({ success: false, message: 'Emoji is required' });
  }

  const validEmojis = ['❤️', '😂', '😮', '😢', '🙏', '👍'];
  if (!validEmojis.includes(emoji)) {
    return res.status(400).json({ success: false, message: 'Invalid reaction emoji' });
  }

  try {
    const message = await Message.findById(messageId).populate('conversation');
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Verify conversation membership
    const conversation = message.conversation;
    const isParticipant = conversation.participants.some(
      (pId) => pId.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Unauthorized conversation view' });
    }

    const userIdStr = req.user._id.toString();

    // Find if the user already reacted with anything
    let existingReactionEmoji = null;
    message.reactions.forEach((r) => {
      if (r.users.some(uId => uId.toString() === userIdStr)) {
        existingReactionEmoji = r.emoji;
      }
    });

    // Remove the user from any existing reactions
    message.reactions.forEach((r) => {
      const uIdx = r.users.findIndex(uId => uId.toString() === userIdStr);
      if (uIdx > -1) {
        r.users.splice(uIdx, 1);
      }
    });

    // Clean up empty reactions
    message.reactions = message.reactions.filter(r => r.users.length > 0);

    let action = 'removed';

    // If the user clicked a different emoji, or they hadn't reacted yet, add the new reaction
    if (existingReactionEmoji !== emoji) {
      const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);
      if (reactionIndex > -1) {
        message.reactions[reactionIndex].users.push(req.user._id);
      } else {
        message.reactions.push({
          emoji,
          users: [req.user._id],
        });
      }
      action = 'added';
    }

    // Use updateOne to bypass updating the updatedAt timestamp
    await Message.updateOne(
      { _id: messageId },
      { $set: { reactions: message.reactions } },
      { timestamps: false }
    );

    // Broadcast reaction updates
    const io = getIO();
    if (io) {
      io.to(`conversation_${conversation._id.toString()}`).emit('message_reaction_updated', {
        messageId,
        reactions: message.reactions,
      });
    }

    res.status(200).json({
      success: true,
      reactions: message.reactions,
      action,
    });
  } catch (error) {
    console.error('Toggle Reaction Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error toggling reaction' });
  }
};

// @desc    Edit a text message
// @route   PUT /api/messages/:messageId/edit
// @access  Private
export const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
  }

  try {
    const message = await Message.findById(messageId).populate('conversation');
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Verify sender ownership
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this message' });
    }

    // Verify it's not deleted or an image
    if (message.isDeleted) {
      return res.status(400).json({ success: false, message: 'Cannot edit a deleted message' });
    }
    if (message.type !== 'text') {
      return res.status(400).json({ success: false, message: 'Only text messages can be edited' });
    }

    message.text = text.trim();
    message.isEdited = true;
    await message.save();

    await message.populate([
      { path: 'sender', select: 'name avatar' },
      {
        path: 'replyTo',
        select: 'text sender type mediaUrl isDeleted createdAt',
        populate: { path: 'sender', select: 'name' }
      }
    ]);

    const io = getIO();
    if (io) {
      const emitMsg = message.toJSON();
      io.to(`conversation_${message.conversation._id.toString()}`).emit('message_updated', emitMsg);
      
      // Notify the recipient's personal room to update preview if this is the last message
      const conversation = message.conversation;
      if (conversation.lastMessage && conversation.lastMessage.toString() === messageId) {
        const otherParticipantId = conversation.participants.find(pId => pId.toString() !== req.user._id.toString());
        if (otherParticipantId) {
          io.to(`user_${otherParticipantId.toString()}`).emit('conversation_updated', {
            conversationId: conversation._id,
            lastMessage: emitMsg,
          });
        }
      }
    }

    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Edit Message Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error editing message' });
  }
};

// @desc    Bulk delete messages
// @route   POST /api/messages/bulk-delete
// @access  Private
export const bulkDeleteMessages = async (req, res) => {
  const { messageIds } = req.body;

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No messages provided for deletion' });
  }

  try {
    const messages = await Message.find({ _id: { $in: messageIds } });
    if (messages.length === 0) {
      return res.status(404).json({ success: false, message: 'Messages not found' });
    }

    // Verify ownership
    const allOwned = messages.every(msg => msg.sender.toString() === req.user._id.toString());
    if (!allOwned) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete some of these messages' });
    }

    const conversationId = messages[0].conversation;
    let updateLastMessage = false;

    // Process deletions
    const io = getIO();
    for (const msg of messages) {
      msg.isDeleted = true;
      msg.text = 'This message was deleted';
      msg.reactions = [];
      msg.mediaUrl = null;
      await msg.save();

      // Broadcast delete event for each
      if (io) {
        io.to(`conversation_${conversationId.toString()}`).emit('message_deleted', {
          messageId: msg._id,
          conversationId,
          isDeleted: true,
        });
      }
    }

    // Update conversation lastMessage reference if necessary
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.lastMessage) {
      const isLastDeleted = messageIds.includes(conversation.lastMessage.toString());
      if (isLastDeleted && io) {
        const lastMsg = await Message.findById(conversation.lastMessage);
        conversation.participants.forEach((pId) => {
          io.to(`user_${pId.toString()}`).emit('conversation_updated', {
            conversationId,
            lastMessage: lastMsg,
          });
        });
      }
    }

    res.status(200).json({ success: true, message: 'Messages deleted successfully' });
  } catch (error) {
    console.error('Bulk Delete Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error bulk deleting messages' });
  }
};

