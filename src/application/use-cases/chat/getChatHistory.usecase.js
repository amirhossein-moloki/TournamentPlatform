// src/application/use-cases/chat/getChatHistory.usecase.js

class GetChatHistoryUseCase {
  constructor({ chatRepository }) {
    this.chatRepository = chatRepository;
  }

  async execute({ sessionId, limit = 50, offset = 0 }) {
    const session = await this.chatRepository.findSessionById(sessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    const messages = await this.chatRepository.findMessagesBySessionId(sessionId, limit, offset);
    return messages;
  }
}

module.exports = GetChatHistoryUseCase;
