const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../utils/logger');
const {
  CreateChatSessionUseCase,
  SendMessageUseCase,
  GetChatHistoryUseCase,
  AssignSupportToChatUseCase,
} = require('../../../application/use-cases/chat'); // Assuming a barrel export

// --- Joi Schemas for Validation ---
const joinRoomSchema = Joi.object({
  roomId: Joi.string().required(), // Corresponds to sessionId
});

const sendMessageSchema = Joi.object({
  roomId: Joi.string().required(),
  text: Joi.string().min(1).max(1000).required(),
});

const typingSchema = Joi.object({
    roomId: Joi.string().required(),
    isTyping: Joi.boolean().required()
});

/**
 * Registers chat-related event handlers for a connected socket.
 * @param {SocketIO.Server} io - The Socket.IO server instance.
 * @param {SocketIO.Socket} socket - The connected socket instance.
 * @param {Map} activeSockets - Map of active sockets.
 * @param {object} dependencies - Injected dependencies (use cases, etc.).
 */
function chatHandler(io, socket, activeSockets, dependencies) {
  const { sendMessageUseCase, getChatHistoryUseCase } = dependencies;

  // --- Event Handler: joinRoom ---
  const handleJoinRoom = async (payload, callback) => {
    const { error } = joinRoomSchema.validate(payload);
    if (error) {
      logger.warn(`Invalid joinRoom payload from ${socket.user.id}: ${error.message}`);
      return callback({ success: false, error: error.message });
    }

    const { roomId } = payload;
    const user = socket.user;

    try {
      // Authorization: In a real app, check if user has permission to join this room.
      // For now, we assume if they have the roomId, they can join.
      // This is where GetChatHistoryUseCase can also validate session existence.
      const messages = await getChatHistoryUseCase.execute({ sessionId: roomId });

      await socket.join(roomId);
      activeSockets.get(socket.id)?.rooms.add(roomId);

      logger.info(`User ${user.id} (${socket.id}) joined chat room: ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit('userJoined', {
        roomId,
        userId: user.id,
        username: user.email,
      });

      // Send chat history to the user who just joined
      callback({ success: true, roomId, history: messages.map(m => m.toPlainObject()) });
    } catch (err) {
      logger.error(`Error in joinRoom for user ${user.id} in room ${roomId}:`, err);
      callback({ success: false, error: err.message || 'Could not join room.' });
    }
  };

  // --- Event Handler: leaveRoom ---
  const handleLeaveRoom = (payload, callback) => {
    // Similar to joinRoom, but for leaving
    const { error } = joinRoomSchema.validate(payload);
    if (error) {
        return callback({ success: false, error: error.message });
    }

    const { roomId } = payload;
    socket.leave(roomId);
    activeSockets.get(socket.id)?.rooms.delete(roomId);

    logger.info(`User ${socket.user.id} left room: ${roomId}`);

    socket.to(roomId).emit('userLeft', {
        roomId,
        userId: socket.user.id,
        username: socket.user.email
    });

    callback({ success: true, roomId });
  };

  // --- Event Handler: sendMessage ---
  const handleSendMessage = async (payload, callback) => {
    const { error } = sendMessageSchema.validate(payload);
    if (error) {
      return callback({ success: false, error: error.message });
    }

    const { roomId, text } = payload;
    const sender = socket.user;

    // Basic authorization check: is the socket in the room it's trying to send a message to?
    if (!socket.rooms.has(roomId)) {
        return callback({ success: false, error: 'Not a member of this room.' });
    }

    try {
        const message = await sendMessageUseCase.execute({
            sessionId: roomId,
            senderId: sender.id,
            senderType: 'USER', // Or determine based on user role
            messageContent: text
        });

        const messageData = message.toPlainObject();

        // Broadcast the new message to everyone in the room
        io.to(roomId).emit('newMessage', messageData);

        logger.info(`Message from ${sender.id} in room ${roomId}: ${text}`);
        callback({ success: true, messageId: message.id });

    } catch(err) {
        logger.error(`Error sending message for user ${sender.id} in room ${roomId}:`, err);
        callback({ success: false, error: err.message || 'Failed to send message.' });
    }
  };

  // --- Event Handler: typing indicator ---
  const handleTyping = (payload) => {
    const { error } = typingSchema.validate(payload);
    if(error) {
        logger.warn(`Invalid typing payload from ${socket.user.id}: ${error.message}`);
        return;
    }
    const { roomId, isTyping } = payload;
    socket.to(roomId).emit('typing', {
        userId: socket.user.id,
        username: socket.user.email,
        isTyping
    });
  };


  // Register all handlers for this socket
  socket.on('joinRoom', handleJoinRoom);
  socket.on('leaveRoom', handleLeaveRoom);
  socket.on('sendMessage', handleSendMessage);
  socket.on('typing', handleTyping);
}

module.exports = chatHandler;
