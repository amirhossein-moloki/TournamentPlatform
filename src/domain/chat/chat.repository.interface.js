class ChatRepositoryInterface {
  async createSession(session) {
    throw new Error('Not implemented');
  }

  async findSessionById(sessionId) {
    throw new Error('Not implemented');
  }

  async findSessionsByUserId(userId) {
    throw new Error('Not implemented');
  }

  async updateSession(session) {
    throw new Error('Not implemented');
  }

  async createMessage(message) {
    throw new Error('Not implemented');
  }

  async findMessagesBySessionId(sessionId, limit = 50, offset = 0) {
    throw new Error('Not implemented');
  }
}

module.exports = ChatRepositoryInterface;
