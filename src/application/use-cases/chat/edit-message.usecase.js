class EditMessageUseCase {
  constructor(chatRepository) {
    this.chatRepository = chatRepository;
  }

  async execute({ messageId, newContent, userId }) {
    const message = await this.chatRepository.findMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You are not authorized to edit this message');
    }

    message.edit(newContent);

    return this.chatRepository.updateMessage(message);
  }
}

module.exports = EditMessageUseCase;
