// src/presentation/controllers/chat.controller.js

class ChatController {
    constructor({
      createChatSessionUseCase,
      getUserChatSessionsUseCase,
      getChatHistoryUseCase,
      // No sendMessageUseCase here, as it's handled by sockets
    }) {
      this.createChatSessionUseCase = createChatSessionUseCase;
      this.getUserChatSessionsUseCase = getUserChatSessionsUseCase;
      this.getChatHistoryUseCase = getChatHistoryUseCase;
    }

    createSession = async (req, res, next) => {
      try {
        const { id: userId } = req.user; // Assuming auth middleware provides user
        const { tournamentId } = req.body;

        const session = await this.createChatSessionUseCase.execute({ userId, tournamentId });

        res.status(201).json(session.toPlainObject());
      } catch (error) {
        next(error);
      }
    };

    getUserSessions = async (req, res, next) => {
      try {
        const { id: userId } = req.user;
        const sessions = await this.getUserChatSessionsUseCase.execute({ userId });
        res.status(200).json(sessions.map(s => s.toPlainObject()));
      } catch (error) {
        next(error);
      }
    };

    getHistory = async (req, res, next) => {
      try {
        const { sessionId } = req.params;
        const { limit, offset } = req.query;

        // Optional: Add authorization check here to ensure user can access this session

        const messages = await this.getChatHistoryUseCase.execute({
          sessionId,
          limit: parseInt(limit, 10) || 50,
          offset: parseInt(offset, 10) || 0,
        });

        res.status(200).json(messages.map(m => m.toPlainObject()));
      } catch (error) {
        next(error);
      }
    };
  }

  module.exports = ChatController;
