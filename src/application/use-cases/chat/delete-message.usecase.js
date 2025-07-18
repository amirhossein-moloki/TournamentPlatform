class DeleteMessageUseCase {
  constructor(chatRepository) {
    this.chatRepository = chatRepository;
  }

  async execute({ messageId, userId }) {
    const message = await this.chatRepository.findMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You are not authorized to delete this message');
    }

    message.delete();

    return this.chatRepository.updateMessage(message);
  }
}

module.exports = DeleteMessageUseCase;
