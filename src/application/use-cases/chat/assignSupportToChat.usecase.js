// src/application/use-cases/chat/assignSupportToChat.usecase.js

class AssignSupportToChatUseCase {
  constructor({ chatRepository, userRepository }) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
  }

  async execute({ sessionId, supportId }) {
    const session = await this.chatRepository.findSessionById(sessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    const supportUser = await this.userRepository.findById(supportId);
    if (!supportUser || !supportUser.roles.includes('SUPPORT')) { // Assuming roles are stored in user model
        throw new Error('Invalid support user');
    }

    session.assignSupport(supportId);

    await this.chatRepository.updateSession(session);
    return session;
  }
}

module.exports = AssignSupportToChatUseCase;
