import { Status } from '../models/Status.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';
import { getIO } from '../socket/socket.js';
import mongoose from 'mongoose';

// Create a new status
export const createStatus = async (req, res) => {
  try {
    const { type, text, backgroundColor, textColor } = req.body;
    const file = req.file;

    if (!['text', 'image', 'video'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid status type' });
    }

    let mediaUrl = null;
    let mediaPublicId = null;
    let mediaResourceType = null;

    if ((type === 'image' || type === 'video') && file) {
      const folder = 'whatsapp/statuses';
      const resourceType = type === 'video' ? 'video' : 'image';
      
      const cloudinaryResult = await uploadToCloudinary(file.buffer, folder, resourceType);
      mediaUrl = cloudinaryResult.secure_url;
      mediaPublicId = cloudinaryResult.public_id;
      mediaResourceType = cloudinaryResult.resource_type;
    } else if (type !== 'text' && !file) {
      return res.status(400).json({ success: false, message: 'Media file is required for image/video status' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const newStatus = await Status.create({
      user: req.user._id,
      type,
      text: text || '',
      mediaUrl,
      mediaPublicId,
      mediaResourceType,
      backgroundColor: backgroundColor || '#000000',
      textColor: textColor || '#ffffff',
      expiresAt,
    });

    const populatedStatus = await Status.findById(newStatus._id).populate('user', 'name avatar about');

    // Broadcast new status event to all online users
    const io = getIO();
    if (io) {
      io.emit('status_created', populatedStatus);
    }

    res.status(201).json({
      success: true,
      status: populatedStatus,
    });
  } catch (error) {
    console.error('Create Status Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all active statuses grouped by user
export const getActiveStatuses = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const activeStatuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'name avatar about')
      .sort({ createdAt: -1 });

    // We can group them by user on the frontend or backend, backend might be cleaner
    res.status(200).json({
      success: true,
      statuses: activeStatuses,
    });
  } catch (error) {
    console.error('Get Active Statuses Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get current user's active statuses
export const getMyStatuses = async (req, res) => {
  try {
    const activeStatuses = await Status.find({
      user: req.user._id,
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'name avatar about')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      statuses: activeStatuses,
    });
  } catch (error) {
    console.error('Get My Statuses Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Record a view for a status
export const viewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findOne({ _id: id, expiresAt: { $gt: new Date() } });

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found or expired' });
    }

    // Check if already viewed
    const alreadyViewed = status.viewers.some((viewer) => viewer.user.toString() === currentUserId.toString());

    if (!alreadyViewed) {
      status.viewers.push({ user: currentUserId, viewedAt: new Date() });
      await status.save();
    }

    res.status(200).json({ success: true, message: 'View recorded' });
  } catch (error) {
    console.error('View Status Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get viewers for a specific status (owner only)
export const getStatusViewers = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findOne({ _id: id, user: currentUserId })
      .populate('viewers.user', 'name avatar');

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found or unauthorized' });
    }

    // Sort viewers by viewedAt descending
    const viewers = status.viewers.sort((a, b) => b.viewedAt - a.viewedAt);

    res.status(200).json({
      success: true,
      viewers,
    });
  } catch (error) {
    console.error('Get Status Viewers Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete a status
export const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findOne({ _id: id, user: currentUserId });

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found or unauthorized' });
    }

    // Delete media from Cloudinary if exists
    if (status.mediaPublicId) {
      try {
        await deleteFromCloudinary(status.mediaPublicId, status.mediaResourceType);
      } catch (err) {
        console.error('Failed to delete media from Cloudinary:', err);
      }
    }

    await Status.deleteOne({ _id: id });

    // Broadcast deletion event
    const io = getIO();
    if (io) {
      io.emit('status_deleted', { statusId: id, userId: currentUserId });
    }

    res.status(200).json({ success: true, message: 'Status deleted' });
  } catch (error) {
    console.error('Delete Status Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
