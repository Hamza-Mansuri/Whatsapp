import { Server } from 'socket.io';
import { socketAuth } from './socketAuth.js';
import { config, corsOptions } from '../config/env.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

let io;
// Map tracking userId -> array of active socket IDs
const userSocketsMap = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: corsOptions,
  });

  // Apply authentication middleware
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket Connected: ${socket.user.name} (${userId})`);

    // Add socket ID to user tracking list
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, []);
    }
    userSocketsMap.get(userId).push(socket.id);

    // Join user's personal room for individual targeted events
    socket.join(`user_${userId}`);

    // If this is the user's first active tab/socket connection, broadcast online status
    if (userSocketsMap.get(userId).length === 1) {
      socket.broadcast.emit('user_status', { userId, status: 'online' });

      // Handle offline deliveries: mark all pending 'sent' messages to 'delivered'
      try {
        const userConvs = await Conversation.find({ participants: socket.user._id });
        const convIds = userConvs.map((c) => c._id);

        await Message.updateMany(
          { conversation: { $in: convIds }, sender: { $ne: socket.user._id }, status: 'sent' },
          { $set: { status: 'delivered' } }
        );

        for (const c of userConvs) {
          const otherParticipantId = c.participants.find((pId) => pId.toString() !== userId);
          if (otherParticipantId) {
            io.to(`user_${otherParticipantId.toString()}`).emit('messages_delivered', {
              conversationId: c._id,
            });
          }
        }
      } catch (err) {
        console.error('Offline delivery update failed:', err.message);
      }
    }

    // Return the list of currently online user IDs to the connecting user
    socket.emit('online_users_list', Array.from(userSocketsMap.keys()));

    // Map conversation room requests
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} left conversation: ${conversationId}`);
    });

    socket.on('typing_start', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('typing_start', {
        conversationId,
        userId,
      });
    });

    socket.on('typing_stop', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('typing_stop', {
        conversationId,
        userId,
      });
    });

    // --- WebRTC Signaling Events ---
    socket.on('call:initiate', ({ targetId, callType, callerData }) => {
      socket.to(`user_${targetId}`).emit('call:ring', {
        callerId: userId,
        callType,
        callerData // { name, avatar }
      });
    });

    const createCallMessage = async (targetId, callType, callStatus) => {
      try {
        const conv = await Conversation.findOne({
          participants: { $all: [userId, targetId] },
          isGroup: false
        });
        if (conv) {
          const msg = await Message.create({
            conversation: conv._id,
            sender: userId,
            type: 'call',
            callType: callType || 'audio', // Default to audio if undefined
            callStatus: callStatus
          });
          
          await msg.populate([
            { path: 'sender', select: 'name avatar' }
          ]);
          
          conv.lastMessage = msg._id;
          conv.lastMessageAt = Date.now();
          await conv.save();

          // Emit to both users
          io.to(`conversation_${conv._id}`).emit('message_received', msg.toJSON());
          
          // Emit conversation preview updates
          io.to(`user_${targetId}`).emit('conversation_updated', {
            conversationId: conv._id,
            lastMessage: msg.toJSON(),
          });
          io.to(`user_${userId}`).emit('conversation_updated', {
            conversationId: conv._id,
            lastMessage: msg.toJSON(),
          });
        }
      } catch (err) {
        console.error('Error creating call message:', err);
      }
    };

    socket.on('call:accept', ({ targetId }) => {
      socket.to(`user_${targetId}`).emit('call:accept', { responderId: userId });
    });

    socket.on('call:reject', ({ targetId, callType }) => {
      socket.to(`user_${targetId}`).emit('call:reject', { responderId: userId });
      createCallMessage(targetId, callType, 'rejected');
    });

    socket.on('call:busy', ({ targetId, callType }) => {
      socket.to(`user_${targetId}`).emit('call:busy', { responderId: userId });
      createCallMessage(targetId, callType, 'missed');
    });

    socket.on('call:cancel', ({ targetId, callType }) => {
      socket.to(`user_${targetId}`).emit('call:cancel', { callerId: userId });
      createCallMessage(targetId, callType, 'missed');
    });

    socket.on('call:end', ({ targetId, callType }) => {
      socket.to(`user_${targetId}`).emit('call:end', { enderId: userId });
      createCallMessage(targetId, callType, 'ended');
    });

    socket.on('call:offer', ({ targetId, offer }) => {
      socket.to(`user_${targetId}`).emit('call:offer', { callerId: userId, offer });
    });

    socket.on('call:answer', ({ targetId, answer }) => {
      socket.to(`user_${targetId}`).emit('call:answer', { responderId: userId, answer });
    });

    socket.on('call:ice-candidate', ({ targetId, candidate }) => {
      socket.to(`user_${targetId}`).emit('call:ice-candidate', { senderId: userId, candidate });
    });

    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: ${socket.user.name}`);
      
      const sockets = userSocketsMap.get(userId);
      if (sockets) {
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        
        if (sockets.length === 0) {
          userSocketsMap.delete(userId);
          
          try {
            // Update User lastSeen in database
            const now = new Date();
            await User.findByIdAndUpdate(userId, { lastSeen: now });
            
            // Broadcast offline status with the new lastSeen timestamp
            socket.broadcast.emit('user_status', { userId, status: 'offline', lastSeen: now });
          } catch (err) {
            console.error('Failed to update lastSeen on disconnect:', err);
          }
        } else {
          userSocketsMap.set(userId, sockets);
        }
      }
    });
  });

  return io;
};

export const getIO = () => io;

export const getUserSockets = (userId) => {
  return userSocketsMap.get(userId) || [];
};
