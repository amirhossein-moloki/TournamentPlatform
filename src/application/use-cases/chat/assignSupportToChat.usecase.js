const { BadRequestError, NotFoundError } = require('../../../utils/errors');

class AssignSupportToChatUseCase {
  constructor({ chatRepository, userRepository }) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
  }

  async execute({ sessionId, supportId }) {
    if (!sessionId || !supportId) {
      throw new BadRequestError('Session ID and Support ID are required.');
    }
    const session = await this.chatRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    const supportUser = await this.userRepository.findById(supportId);
    if (!supportUser || !supportUser.roles.includes('SUPPORT')) { // Assuming roles are stored in user model
        throw new BadRequestError('Invalid support user');
    }

    session.assignSupport(supportId);

    await this.chatRepository.updateSession(session);
    return session;
  }
}

module.exports = AssignSupportToChatUseCase;
