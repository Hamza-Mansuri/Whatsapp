import express from 'express';
import { 
  getConversations, 
  createConversation, 
  readConversation,
  createGroup,
  renameGroup,
  updateGroupImage,
  addGroupMember,
  removeGroupMember,
  leaveGroup
} from '../controllers/conversationController.js';
import { getMessages, createMessage, createMediaMessage } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

// Mount all routes with auth protection middleware
router.get('/', protect, getConversations);
router.post('/', protect, createConversation);
router.post('/group', protect, upload.single('groupImage'), createGroup);

router.put('/:conversationId/read', protect, readConversation);

// Group specific routes
router.put('/:conversationId/group/rename', protect, renameGroup);
router.put('/:conversationId/group/image', protect, upload.single('groupImage'), updateGroupImage);
router.put('/:conversationId/group/add', protect, addGroupMember);
router.put('/:conversationId/group/remove', protect, removeGroupMember);
router.put('/:conversationId/group/leave', protect, leaveGroup);

router.get('/:conversationId/messages', protect, getMessages);
router.post('/:conversationId/messages', protect, createMessage);
router.post('/:conversationId/messages/media', protect, upload.single('media'), createMediaMessage);

export default router;
