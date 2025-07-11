// src/domain/chat/chat_session.entity.js

const uuid = require('uuid');

class ChatSession {
  /**
   * @param {string} id - The unique identifier for the chat session (UUID).
   * @param {string} userId - ID of the user initiating or involved in the chat.
   * @param {string|null} supportId - ID of the support agent assigned to the chat (if any).
   * @param {string} status - Current status of the chat session.
   * @param {string|null} tournamentId - Optional ID of the tournament this chat is related to.
   * @param {Date} createdAt - Timestamp of when the session was created.
   * @param {Date} updatedAt - Timestamp of when the session was last updated.
   * @param {Date|null} userLastSeenAt - Timestamp of when the user last viewed messages in this session.
   * @param {Date|null} supportLastSeenAt - Timestamp of when the support agent last viewed messages in this session.
   */
  constructor({
    id = uuid.v4(),
    userId,
    supportId = null,
    status = ChatSession.Status.OPEN,
    tournamentId = null,
    createdAt = new Date(),
    updatedAt = new Date(),
    userLastSeenAt = null,
    supportLastSeenAt = null,
  }) {
    if (!userId) throw new Error('User ID is required for a chat session.');
    if (!Object.values(ChatSession.Status).includes(status)) {
      throw new Error(`Invalid chat session status: ${status}`);
    }

    this.id = id;
    this.userId = userId;
    this.supportId = supportId;
    this.status = status;
    this.tournamentId = tournamentId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.userLastSeenAt = userLastSeenAt ? new Date(userLastSeenAt) : null;
    this.supportLastSeenAt = supportLastSeenAt ? new Date(supportLastSeenAt) : null;
  }

  static Status = Object.freeze({
    OPEN: 'OPEN', // Session initiated by user, waiting for support or first user message.
    PENDING_SUPPORT: 'PENDING_SUPPORT', // User has sent a message, waiting for support to pick up or reply.
    PENDING_USER: 'PENDING_USER',       // Support has replied, waiting for user's response.
    ASSIGNED: 'ASSIGNED',             // Session assigned to a specific support agent.
    CLOSED_BY_USER: 'CLOSED_BY_USER',   // Session closed by the user.
    CLOSED_BY_SUPPORT: 'CLOSED_BY_SUPPORT', // Session closed by the support agent.
    CLOSED_AUTOMATICALLY: 'CLOSED_AUTOMATICALLY', // Session closed due to inactivity.
    // TODO: Consider if ESCALATED status is needed.
  });

  assignSupport(supportId) {
    if (!supportId) throw new Error('Support ID is required to assign.');
    if (this.status === ChatSession.Status.CLOSED_BY_USER ||
        this.status === ChatSession.Status.CLOSED_BY_SUPPORT ||
        this.status === ChatSession.Status.CLOSED_AUTOMATICALLY) {
      throw new Error(`Cannot assign support to a closed session (status: ${this.status}).`);
    }
    this.supportId = supportId;
    this.status = ChatSession.Status.ASSIGNED; // Or PENDING_USER if support agent is expected to reply first
    this.updatedAt = new Date();
  }

  unassignSupport() {
    if (this.status === ChatSession.Status.CLOSED_BY_USER ||
        this.status === ChatSession.Status.CLOSED_BY_SUPPORT ||
        this.status === ChatSession.Status.CLOSED_AUTOMATICALLY) {
        // Allow unassigning from closed sessions for archival or reassignment logic if needed,
        // but typically this might not be a common operation on truly closed sessions.
    }
    this.supportId = null;
    // Consider reverting status, e.g., to OPEN or PENDING_SUPPORT if it was ASSIGNED
    if(this.status === ChatSession.Status.ASSIGNED) {
        this.status = ChatSession.Status.OPEN; // Or determine based on last message sender
    }
    this.updatedAt = new Date();
  }

  closeSession(closerType = 'USER' /* 'USER', 'SUPPORT', 'SYSTEM' */) {
    switch (closerType.toUpperCase()) {
      case 'USER':
        this.status = ChatSession.Status.CLOSED_BY_USER;
        break;
      case 'SUPPORT':
        this.status = ChatSession.Status.CLOSED_BY_SUPPORT;
        break;
      case 'SYSTEM':
        this.status = ChatSession.Status.CLOSED_AUTOMATICALLY;
        break;
      default:
        throw new Error(`Invalid closer type: ${closerType}`);
    }
    this.updatedAt = new Date();
  }

  isClosed() {
    return [
        ChatSession.Status.CLOSED_BY_USER,
        ChatSession.Status.CLOSED_BY_SUPPORT,
        ChatSession.Status.CLOSED_AUTOMATICALLY,
    ].includes(this.status);
  }

  updateStatus(newStatus) {
    if (!Object.values(ChatSession.Status).includes(newStatus)) {
      throw new Error(`Invalid chat session status: ${newStatus}`);
    }
    // Add more sophisticated status transition logic if needed
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  updateUserLastSeen() {
    this.userLastSeenAt = new Date();
    this.updatedAt = new Date();
  }

  updateSupportLastSeen() {
    this.supportLastSeenAt = new Date();
    this.updatedAt = new Date();
  }

  static fromPersistence(data) {
    if (!data) return null;
    return new ChatSession({
      id: data.id,
      userId: data.user_id || data.userId,
      supportId: data.support_id || data.supportId,
      status: data.status,
      tournamentId: data.tournament_id || data.tournamentId,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
      userLastSeenAt: data.user_last_seen_at || data.userLastSeenAt,
      supportLastSeenAt: data.support_last_seen_at || data.supportLastSeenAt,
    });
  }

  toPlainObject() {
    return {
      id: this.id,
      userId: this.userId,
      supportId: this.supportId,
      status: this.status,
      tournamentId: this.tournamentId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userLastSeenAt: this.userLastSeenAt,
      supportLastSeenAt: this.supportLastSeenAt,
    };
  }
}

module.exports = { ChatSession };
