import express from 'express';
import { deleteMessage, toggleReaction, bulkDeleteMessages, editMessage, forwardMessages } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Forward messages endpoint
router.post('/forward', protect, forwardMessages);

// Bulk delete messages endpoint
router.post('/bulk-delete', protect, bulkDeleteMessages);

// Delete message endpoint (with auth verification)
router.delete('/:messageId', protect, deleteMessage);

// Edit message endpoint
router.put('/:messageId/edit', protect, editMessage);

// Reaction endpoints
router.post('/:messageId/reaction', protect, toggleReaction);
router.delete('/:messageId/reaction', protect, toggleReaction);

export default router;
