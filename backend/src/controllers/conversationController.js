import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { getIO } from '../socket/socket.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

// Helper to create and broadcast a system message
const createSystemMessage = async (conversationId, senderId, text) => {
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    text,
    type: 'system',
    status: 'sent',
  });
  
  await message.populate('sender', 'name avatar');
  
  const conversation = await Conversation.findById(conversationId);
  if (conversation) {
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = Date.now();
    await conversation.save();
  }

  const io = getIO();
  if (io) {
    const emitMsg = message.toJSON();
    io.to(`conversation_${conversationId}`).emit('message_received', emitMsg);
    
    // Update chat previews for all participants
    if (conversation) {
      conversation.participants.forEach((pId) => {
        io.to(`user_${pId.toString()}`).emit('conversation_updated', {
          conversationId,
          lastMessage: emitMsg,
        });
      });
    }
  }
  return message;
};

// @desc    Get conversations for logged-in user
// @route   GET /api/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email avatar lastSeen')
      .populate({
        path: 'lastMessage',
        select: 'sender text createdAt status',
      })
      .sort({ lastMessageAt: -1 });

    // Populate unread count for each conversation dynamically
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await Message.countDocuments({
          conversation: c._id,
          sender: { $ne: req.user._id },
          status: { $ne: 'read' },
        });
        return {
          ...c.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    console.error('Get Conversations Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving conversations list',
    });
  }
};

// @desc    Create or retrieve a 1-to-1 conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid target user ID (userId)',
      });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot start a conversation with yourself',
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    // Sort participants to ensure matching of the index constraint
    const sortedParticipants = [req.user._id.toString(), userId.toString()].sort();

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: sortedParticipants },
    }).populate('participants', 'name email avatar lastSeen');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: sortedParticipants,
      });
      // Populate participants for the new conversation
      conversation = await conversation.populate('participants', 'name email avatar lastSeen');
    }

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Create Conversation Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error starting conversation',
    });
  }
};

// @desc    Mark all messages in a conversation as read
// @route   PUT /api/conversations/:conversationId/read
// @access  Private
export const readConversation = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
      (pId) => pId.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this conversation',
      });
    }

    // Bulk update unread messages sent by the other participant in this conversation
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        status: { $ne: 'read' },
      },
      {
        $set: { status: 'read' },
      }
    );

    // Notify the other participant that messages were read
    const io = getIO();
    if (io) {
      const otherParticipantId = conversation.participants.find(
        (pId) => pId.toString() !== req.user._id.toString()
      );
      if (otherParticipantId) {
        io.to(`user_${otherParticipantId.toString()}`).emit('messages_read', {
          conversationId,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read',
    });
  } catch (error) {
    console.error('Read Conversation Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error marking conversation as read',
    });
  }
};

// @desc    Create a new group conversation
// @route   POST /api/conversations/group
// @access  Private
export const createGroup = async (req, res) => {
  const { name, participants } = req.body;

  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ success: false, message: 'A group requires at least 2 other members' });
    }

    const allParticipants = [...new Set([...participants, req.user._id.toString()])];

    let groupImage = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'whatsapp/group-pictures', 'image');
      groupImage = result.secure_url;
    }

    let conversation = await Conversation.create({
      isGroup: true,
      groupName: name.trim(),
      groupImage,
      participants: allParticipants,
      groupAdmin: req.user._id,
      createdBy: req.user._id,
    });

    conversation = await conversation.populate('participants', 'name email avatar lastSeen');

    await createSystemMessage(conversation._id, req.user._id, `${req.user.name} created the group`);

    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Create Group Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error creating group' });
  }
};

// @desc    Rename a group
// @route   PUT /api/conversations/:conversationId/group/rename
// @access  Private
export const renameGroup = async (req, res) => {
  const { conversationId } = req.params;
  const { name } = req.body;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admins can rename the group' });
    }

    conversation.groupName = name.trim();
    await conversation.save();

    await createSystemMessage(conversationId, req.user._id, `${req.user.name} changed the group name to "${name.trim()}"`);

    res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Rename Group Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error renaming group' });
  }
};

// @desc    Update group image
// @route   PUT /api/conversations/:conversationId/group/image
// @access  Private
export const updateGroupImage = async (req, res) => {
  const { conversationId } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image provided' });
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admins can change group image' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'whatsapp/group-pictures', 'image');
    conversation.groupImage = result.secure_url;
    await conversation.save();

    await createSystemMessage(conversationId, req.user._id, `${req.user.name} changed the group icon`);

    res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Update Group Image Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating group image' });
  }
};

// @desc    Add member to group
// @route   PUT /api/conversations/:conversationId/group/add
// @access  Private
export const addGroupMember = async (req, res) => {
  const { conversationId } = req.params;
  const { userId } = req.body;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admins can add members' });
    }

    if (conversation.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    const newMember = await User.findById(userId);
    if (!newMember) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    conversation.participants.push(userId);
    await conversation.save();

    await createSystemMessage(conversationId, req.user._id, `${req.user.name} added ${newMember.name}`);

    const populated = await conversation.populate('participants', 'name email avatar lastSeen');
    
    // Explicitly notify the added user via a direct socket event so their client knows to refetch or append the chat
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit('conversation_updated', {
        conversationId,
        lastMessage: await Message.findById(conversation.lastMessage).populate('sender', 'name avatar')
      });
    }

    res.status(200).json({ success: true, conversation: populated });
  } catch (error) {
    console.error('Add Member Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error adding member' });
  }
};

// @desc    Remove member from group
// @route   PUT /api/conversations/:conversationId/group/remove
// @access  Private
export const removeGroupMember = async (req, res) => {
  const { conversationId } = req.params;
  const { userId } = req.body;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admins can remove members' });
    }

    if (userId === conversation.groupAdmin.toString()) {
      return res.status(400).json({ success: false, message: 'Admin cannot remove themselves. Use leave instead.' });
    }

    conversation.participants = conversation.participants.filter(pId => pId.toString() !== userId);
    await conversation.save();

    const removedMember = await User.findById(userId);
    await createSystemMessage(conversationId, req.user._id, `${req.user.name} removed ${removedMember?.name || 'a member'}`);

    const populated = await conversation.populate('participants', 'name email avatar lastSeen');
    res.status(200).json({ success: true, conversation: populated });
  } catch (error) {
    console.error('Remove Member Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error removing member' });
  }
};

// @desc    Leave group
// @route   PUT /api/conversations/:conversationId/group/leave
// @access  Private
export const leaveGroup = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id.toString();

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!conversation.participants.some(p => p.toString() === userId)) {
      return res.status(400).json({ success: false, message: 'You are not a member of this group' });
    }

    conversation.participants = conversation.participants.filter(pId => pId.toString() !== userId);

    if (conversation.participants.length === 0) {
      // Last member left, delete group
      await Conversation.findByIdAndDelete(conversationId);
      await Message.deleteMany({ conversation: conversationId });
      return res.status(200).json({ success: true, message: 'Group deleted' });
    }

    // If admin leaves, transfer admin to oldest member (first in array typically, or just the next one)
    if (conversation.groupAdmin.toString() === userId) {
      conversation.groupAdmin = conversation.participants[0];
    }

    await conversation.save();

    await createSystemMessage(conversationId, req.user._id, `${req.user.name} left`);

    res.status(200).json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave Group Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error leaving group' });
  }
};
