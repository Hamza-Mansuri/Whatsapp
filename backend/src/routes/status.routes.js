import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  createStatus,
  getActiveStatuses,
  getMyStatuses,
  viewStatus,
  getStatusViewers,
  deleteStatus,
} from '../controllers/statusController.js';

const router = express.Router();

router.use(protect);

router.post('/', upload.single('media'), createStatus);
router.get('/', getActiveStatuses);
router.get('/me', getMyStatuses);
router.post('/:id/view', viewStatus);
router.get('/:id/viewers', getStatusViewers);
router.delete('/:id', deleteStatus);

export default router;
