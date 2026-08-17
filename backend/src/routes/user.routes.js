import express from 'express';
import { getUsers, getMe, updateProfile, updateProfilePicture, removeProfilePicture } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

// Mount user fetch route with auth protection middleware
router.get('/', protect, getUsers);

// Profile routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.post('/me/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.delete('/me/profile-picture', protect, removeProfilePicture);

export default router;
