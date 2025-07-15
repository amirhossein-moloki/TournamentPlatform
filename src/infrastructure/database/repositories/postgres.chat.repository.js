const ChatRepositoryInterface = require('../../../domain/chat/chat.repository.interface');
const { ChatSession } = require('../../../domain/chat/chat_session.entity');
const { ChatMessage } = require('../../../domain/chat/chat_message.entity');

class PostgresChatRepository extends ChatRepositoryInterface {
  constructor({ ChatSessionModel, ChatMessageModel }) {
    super();
    this.ChatSessionModel = ChatSessionModel;
    this.ChatMessageModel = ChatMessageModel;
  }

  async createSession(session) {
    const sessionData = await this.ChatSessionModel.create(session.toPlainObject());
    return ChatSession.fromPersistence(sessionData);
  }

  async findSessionById(sessionId) {
    const sessionData = await this.ChatSessionModel.findByPk(sessionId);
    return sessionData ? ChatSession.fromPersistence(sessionData) : null;
  }

  async findSessionsByUserId(userId) {
    const sessionsData = await this.ChatSessionModel.findAll({ where: { userId } });
    return sessionsData.map(ChatSession.fromPersistence);
  }

  async updateSession(session) {
    await this.ChatSessionModel.update(session.toPlainObject(), { where: { id: session.id } });
    return session;
  }

  async createMessage(message) {
    const messageData = await this.ChatMessageModel.create(message.toPlainObject());
    return ChatMessage.fromPersistence(messageData);
  }

  async findMessageById(messageId) {
    const messageData = await this.ChatMessageModel.findByPk(messageId);
    return messageData ? ChatMessage.fromPersistence(messageData) : null;
  }

  async findMessagesBySessionId(sessionId, limit = 50, offset = 0) {
    const messagesData = await this.ChatMessageModel.findAll({
      where: { sessionId },
      limit,
      offset,
      order: [['timestamp', 'DESC']],
    });
    return messagesData.map(ChatMessage.fromPersistence);
  }

  async updateMessage(message) {
    await this.ChatMessageModel.update(message.toPlainObject(), { where: { id: message.id } });
    return message;
  }
}

module.exports = PostgresChatRepository;
