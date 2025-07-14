const { ChatSession } = require('../../../domain/chat/chat_session.entity');
const { NotFoundError, BadRequestError } = require('../../../utils/errors');

class CreateChatSessionUseCase {
  constructor({ chatRepository, userRepository }) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
  }

  async execute({ userId, tournamentId = null }) {
    if(!userId) {
        throw new BadRequestError('User ID is required.');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
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
