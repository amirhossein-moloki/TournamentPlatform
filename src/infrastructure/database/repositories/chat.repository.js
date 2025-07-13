// src/infrastructure/database/repositories/chat.repository.js

const ChatRepositoryInterface = require('../../../domain/chat/chat.repository.interface');
const { ChatSession } = require('../../../domain/chat/chat_session.entity');
const { ChatMessage } = require('../../../domain/chat/chat_message.entity');
const { Op } = require('sequelize');

class ChatRepository extends ChatRepositoryInterface {
  constructor({
    chatSessionModel,
    chatMessageModel,
    userModel,
    db, // Sequelize instance
  }) {
    super();
    this.chatSessionModel = chatSessionModel;
    this.chatMessageModel = chatMessageModel;
    this.userModel = userModel;
    this.db = db;
  }

  async createSession(session) {
    const sessionData = {
      id: session.id,
      user_id: session.userId,
      support_id: session.supportId,
      status: session.status,
      tournament_id: session.tournamentId,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    };
    const newSession = await this.chatSessionModel.create(sessionData);
    return ChatSession.fromPersistence(newSession);
  }

  async findSessionById(sessionId) {
    const session = await this.chatSessionModel.findByPk(sessionId);
    return session ? ChatSession.fromPersistence(session) : null;
  }

  async findOpenSessionByUser(userId, tournamentId = null) {
    const whereClause = {
      user_id: userId,
      status: { [Op.notIn]: [
        ChatSession.Status.CLOSED_BY_USER,
        ChatSession.Status.CLOSED_BY_SUPPORT,
        ChatSession.Status.CLOSED_AUTOMATICALLY
      ]},
    };
    if (tournamentId) {
      whereClause.tournament_id = tournamentId;
    } else {
      whereClause.tournament_id = { [Op.is]: null };
    }
    const session = await this.chatSessionModel.findOne({ where: whereClause });
    return session ? ChatSession.fromPersistence(session) : null;
  }

  async findSessionsByUserId(userId) {
    const sessions = await this.chatSessionModel.findAll({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']],
    });
    return sessions.map(s => ChatSession.fromPersistence(s));
  }

  async updateSession(session) {
    await this.chatSessionModel.update(
      {
        support_id: session.supportId,
        status: session.status,
        updated_at: new Date(),
      },
      { where: { id: session.id } }
    );
    return session;
  }

  async createMessage(message) {
    const messageData = {
        id: message.id,
        session_id: message.sessionId,
        sender_id: message.senderId,
        sender_type: message.senderType,
        message_content: message.messageContent,
        message_type: message.messageType,
        timestamp: message.timestamp,
        is_read: message.isRead,
        metadata: message.metadata
    };
    const newMessage = await this.chatMessageModel.create(messageData);
    return ChatMessage.fromPersistence(newMessage);
  }

  async findMessagesBySessionId(sessionId, limit = 50, offset = 0) {
    const messages = await this.chatMessageModel.findAll({
      where: { session_id: sessionId },
      order: [['timestamp', 'ASC']],
      limit,
      offset,
    });
    return messages.map(m => ChatMessage.fromPersistence(m));
  }
}

module.exports = ChatRepository;
