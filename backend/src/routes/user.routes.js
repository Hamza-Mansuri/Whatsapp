import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middlewares/upload.middleware.js';
import { 
  getUsers, 
  getMe, 
  updateProfile, 
  updateProfilePicture, 
  removeProfilePicture,
  searchByPhone
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.get('/', getUsers);
router.get('/me', getMe);
router.put('/me', updateProfile);
router.post('/me/profile-picture', upload.single('profilePicture'), updateProfilePicture);
router.delete('/me/profile-picture', removeProfilePicture);
router.get('/search-phone', searchByPhone);

export default router;
