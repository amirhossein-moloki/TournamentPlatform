// src/application/use-cases/chat/sendMessage.usecase.js

const { ChatMessage } = require('../../../domain/chat/chat_message.entity');

class SendMessageUseCase {
  constructor({ chatRepository, userRepository }) {
    this.chatRepository = chatRepository;
    this.userRepository = userRepository;
  }

  async execute({ sessionId, senderId, senderType, messageContent, messageType = 'TEXT' }) {
    const session = await this.chatRepository.findSessionById(sessionId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    if (session.isClosed()) {
        throw new Error('Cannot send message to a closed chat session');
    }

    // Authorization: Check if the sender is part of this chat session
    if (senderType === 'USER' && session.userId !== senderId) {
        throw new Error('User is not a participant in this chat session.');
    }
    if (senderType === 'SUPPORT' && session.supportId !== senderId) {
        throw new Error('Support agent is not assigned to this chat session.');
    }

    const message = new ChatMessage({
      sessionId,
      senderId,
      senderType,
      messageContent,
      messageType,
    });

    const createdMessage = await this.chatRepository.createMessage(message);

    // Update session's updatedAt timestamp
    session.updatedAt = new Date();
    await this.chatRepository.updateSession(session);

    return createdMessage;
  }
}

module.exports = SendMessageUseCase;
