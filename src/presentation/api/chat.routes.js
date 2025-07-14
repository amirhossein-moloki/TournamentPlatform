const express = require('express');
const { authMiddleware } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validation.middleware');
const { getChatHistorySchema, createChatSessionSchema } = require('../validators/chat.validator');

function createChatRouter(chatController) {
  const router = express.Router();

  // Create a new chat session
  router.post(
    '/',
    authMiddleware, // Protect this route
    validate(createChatSessionSchema),
    chatController.createSession
  );

  // Get all chat sessions for the authenticated user
  router.get(
    '/',
    authMiddleware,
    chatController.getUserSessions
  );

  // Get message history for a specific chat session
  router.get(
    '/:sessionId/messages',
    authMiddleware,
    validate(getChatHistorySchema),
    chatController.getHistory
  );

  return router;
}

module.exports = createChatRouter;
