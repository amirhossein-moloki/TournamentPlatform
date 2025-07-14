const { BadRequestError } = require('../../../utils/errors');

class GetUserChatSessionsUseCase {
  constructor({ chatRepository }) {
    this.chatRepository = chatRepository;
  }

  async execute({ userId }) {
    const sessions = await this.chatRepository.findSessionsByUserId(userId);
    return sessions;
  }
}

module.exports = GetUserChatSessionsUseCase;
