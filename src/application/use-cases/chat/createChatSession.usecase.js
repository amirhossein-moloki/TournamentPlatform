// src/application/use-cases/chat/createChatSession.usecase.js

const { ChatSession } = require('../../../domain/chat/chat_session.entity');

class CreateChatSessionUseCase {
  constructor({ chatRepository, userRepository }) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
  }

  async execute({ userId, tournamentId = null }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Optional: Check if there's an existing open session for this user and tournament
    const existingSession = await this.chatRepository.findOpenSessionByUser(userId, tournamentId);
    if (existingSession) {
      return existingSession;
    }

    const newSession = new ChatSession({
      userId,
      tournamentId,
      status: ChatSession.Status.OPEN,
    });

    const createdSession = await this.chatRepository.createSession(newSession);
    return createdSession;
  }
}

module.exports = CreateChatSessionUseCase;
