import express from 'express';
import { register, login, logout, getMe, requestOtp, verifyOtp } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Phone Auth Routes
router.post('/phone/request-otp', requestOtp);
router.post('/phone/verify-otp', verifyOtp);

export default router;
