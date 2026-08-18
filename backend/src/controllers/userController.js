import { User } from '../models/User.js';
import { getIO } from '../socket/socket.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get all users except currently logged-in user
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select('name email avatar lastSeen');
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get Users Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving users list',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get Me Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
};

// Helper to broadcast user update
const broadcastUserUpdate = (user) => {
  const io = getIO();
  if (io) {
    io.emit('user_profile_updated', {
      userId: user._id,
      name: user.name,
      avatar: user.avatar,
      about: user.about,
    });
  }
};

// @desc    Update current user profile (name, about)
// @route   PUT /api/users/me
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, about } = req.body;
    
    const user = await User.findById(req.user._id).select('-password');
    
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      user.name = name;
    }
    
    if (about !== undefined) {
      user.about = about.substring(0, 139);
    }
    
    await user.save();
    
    broadcastUserUpdate(user);
    
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// Helper to remove old local avatar safely (backward compatibility)
const removeOldAvatar = (avatarUrl) => {
  if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
    try {
      const filename = path.basename(avatarUrl);
      const filePath = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Error removing old avatar:', e.message);
    }
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/me/profile-picture
// @access  Private
export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const user = await User.findById(req.user._id).select('-password');
    
    // Remove old avatar if local
    removeOldAvatar(user.avatar);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'whatsapp/profile-pictures', 'image');
    user.avatar = result.secure_url;
    
    await user.save();
    
    broadcastUserUpdate(user);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Upload Avatar Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to upload profile picture' });
  }
};

// @desc    Remove profile picture
// @route   DELETE /api/users/me/profile-picture
// @access  Private
export const removeProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    removeOldAvatar(user.avatar);
    
    user.avatar = '';
    await user.save();
    
    broadcastUserUpdate(user);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Remove Avatar Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to remove profile picture' });
  }
};

// @desc    Search for a user by phone number
// @route   GET /api/users/search-phone?phone=...
// @access  Private
export const searchByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number parameter is required' });
    }

    const parsedNumber = parsePhoneNumberFromString(phone, 'US'); // Fallback country doesn't matter much if + is provided
    
    // Attempt to match even if parsing fails strictly, but ideally we use the normalized number
    let searchQuery = phone;
    if (parsedNumber && parsedNumber.isValid()) {
       searchQuery = parsedNumber.number;
    } else {
       // Just strip whitespace and see if it matches
       searchQuery = phone.replace(/\s+/g, '');
    }

    const user = await User.findOne({
      phoneNumberNormalized: searchQuery,
      _id: { $ne: req.user._id } // Don't return self
    }).select('name avatar about lastSeen phoneNumber phoneNumberNormalized countryCode');

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with this phone number' });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Search Phone Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during phone search' });
  }
};

