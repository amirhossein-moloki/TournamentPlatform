// src/domain/chat/chat_message.entity.js

const uuid = require('uuid');

class ChatMessage {
  /**
   * @param {string} id - The unique identifier for the chat message (UUID).
   * @param {string} sessionId - ID of the chat session this message belongs to.
   * @param {string} senderId - ID of the user or support agent who sent the message.
   * @param {string} senderType - Type of sender ('USER' or 'SUPPORT').
   * @param {string} messageContent - The actual content of the message.
   * @param {string} messageType - Type of message content (e.g., 'TEXT', 'IMAGE_URL', 'SYSTEM').
   * @param {Date} timestamp - Timestamp of when the message was sent.
   * @param {boolean} isRead - Flag indicating if the message has been read by the recipient(s).
   * @param {object|null} metadata - Optional metadata for the message (e.g., for system messages).
   */
  constructor({
    id = uuid.v4(),
    sessionId,
    senderId,
    senderType, // 'USER' or 'SUPPORT'
    messageContent,
    messageType = ChatMessage.MessageType.TEXT,
    timestamp = new Date(),
    isRead = false, // This might be more complex in a multi-participant chat; true if recipient has read.
                     // For user-support chat, indicates if the other party has read it.
    metadata = null,
  }) {
    if (!sessionId) throw new Error('Session ID is required for a chat message.');
    if (!senderId) throw new Error('Sender ID is required for a chat message.');
    if (!senderType || !Object.values(ChatMessage.SenderType).includes(senderType)) {
      throw new Error(`Invalid sender type: ${senderType}. Must be 'USER' or 'SUPPORT'.`);
    }
    if (messageContent === undefined || messageContent === null || messageContent.trim() === '') {
        if(messageType !== ChatMessage.MessageType.SYSTEM) { // System messages can be empty if metadata carries info
             throw new Error('Message content is required for non-system messages.');
        }
    }
    if (!Object.values(ChatMessage.MessageType).includes(messageType)) {
        throw new Error(`Invalid message type: ${messageType}.`);
    }


    this.id = id;
    this.sessionId = sessionId;
    this.senderId = senderId;
    this.senderType = senderType;
    this.messageContent = messageContent;
    this.messageType = messageType;
    this.timestamp = timestamp;
    this.isRead = isRead;
    this.metadata = metadata;
  }

  static SenderType = Object.freeze({
    USER: 'USER',
    SUPPORT: 'SUPPORT',
    SYSTEM: 'SYSTEM', // For system-generated messages within a session
  });

  static MessageType = Object.freeze({
    TEXT: 'TEXT',
    IMAGE_URL: 'IMAGE_URL', // If sending links to images
    FILE_URL: 'FILE_URL',   // If sending links to files
    SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION', // e.g., "Support agent X has joined the chat."
    // Potentially more types like 'AUDIO_URL', 'VIDEO_URL'
  });

  markAsRead() {
    if (!this.isRead) {
      this.isRead = true;
      // Note: In a real system, you might also want to set an `readAt` timestamp.
      // this.updatedAt = new Date(); // If ChatMessage has an updatedAt field.
    }
  }

  static fromPersistence(data) {
    if (!data) return null;
    return new ChatMessage({
      id: data.id,
      sessionId: data.session_id || data.sessionId,
      senderId: data.sender_id || data.senderId,
      senderType: data.sender_type || data.senderType,
      messageContent: data.message_content || data.messageContent,
      messageType: data.message_type || data.messageType || ChatMessage.MessageType.TEXT,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      isRead: data.is_read === undefined ? data.isRead : data.is_read, // Handle both snake_case and camelCase
      metadata: data.metadata,
    });
  }

  toPlainObject() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      senderId: this.senderId,
      senderType: this.senderType,
      messageContent: this.messageContent,
      messageType: this.messageType,
      timestamp: this.timestamp,
      isRead: this.isRead,
      metadata: this.metadata,
    };
  }
}

module.exports = { ChatMessage };
