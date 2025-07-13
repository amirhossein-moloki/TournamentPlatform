// src/presentation/api/chat.routes.js

const express = require('express');
const { authMiddleware } = require('../../middleware/auth.middleware');

function createChatRouter(chatController) {
  const router = express.Router();

  // Create a new chat session
  router.post(
    '/',
    authMiddleware, // Protect this route
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
    chatController.getHistory
  );

  return router;
}

module.exports = createChatRouter;
