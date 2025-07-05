const Joi = require('joi');
const logger = require('../../../utils/logger');
// const ChatMessageRepository = require('../../../infrastructure/database/repositories/chat.message.repository'); // Conceptual
// const { ChatMessage } = require('../../../domain/chat/chat.message.entity'); // Conceptual

// const chatMessageRepository = new ChatMessageRepository(); // Conceptual

// --- Joi Schemas for Chat Event Payloads ---
const joinRoomSchema = Joi.object({
  roomId: Joi.string().required().description('ID of the room to join (e.g., tournamentId, matchId)'),
});

const sendMessageSchema = Joi.object({
  roomId: Joi.string().required(),
  text: Joi.string().trim().min(1).max(1000).required().description('Message text content'),
});

/**
 * Registers chat-related event handlers for a connected socket.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @param {import('socket.io').Socket} socket - The individual client socket.
 * @param {Map<string, { userId: string, username: string, rooms: Set<string> }>} activeSockets - Map of active sockets.
 */
function registerChatHandlers(io, socket, activeSockets) {
  const userId = socket.user.id; // Assuming socket.user is populated by auth middleware
  const username = socket.user.email; // Or actual username if available

  logger.info(`[ChatHandler] Registering chat events for user ${userId} (socket ${socket.id})`);

  /**
   * Handle 'joinRoom' event from client.
   */
  socket.on('joinRoom', async (payload, callback) => {
    try {
      const { error, value } = joinRoomSchema.validate(payload);
      if (error) {
        logger.warn(`[ChatHandler] Invalid joinRoom payload from user ${userId}:`, error.details);
        if (typeof callback === 'function') callback({ success: false, error: error.details.map(d => d.message).join(', ') });
        return;
      }

      const { roomId } = value;

      // TODO: Authorization - Check if user is allowed to join this room
      // e.g., if it's a tournament room, is user a participant or admin?
      // if (!await canUserAccessRoom(userId, roomId)) {
      //   if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized to join this room.' });
      //   return;
      // }

      await socket.join(roomId);
      const activeSocketInfo = activeSockets.get(socket.id);
      if (activeSocketInfo) {
        activeSocketInfo.rooms.add(roomId);
      }

      logger.info(`[ChatHandler] User ${username} (${userId}) joined room: ${roomId} (socket ${socket.id})`);

      // Notify other clients in the room that a user has joined (optional)
      socket.to(roomId).emit('userJoined', { roomId, userId, username });

      // (Conceptual) Fetch and send recent message history for the room
      // const recentMessages = await chatMessageRepository.findRecentMessages(roomId, 20);
      // socket.emit('messageHistory', { roomId, messages: recentMessages });

      if (typeof callback === 'function') callback({ success: true, roomId });

    } catch (err) {
      logger.error(`[ChatHandler] Error in joinRoom for user ${userId}, room ${payload?.roomId}:`, err);
      if (typeof callback === 'function') callback({ success: false, error: 'Server error joining room.' });
    }
  });

  /**
   * Handle 'leaveRoom' event from client.
   */
  socket.on('leaveRoom', async (payload, callback) => {
    try {
      // Payload should contain roomId, similar to joinRoomSchema
      const { error, value } = joinRoomSchema.validate(payload); // Re-use schema for roomId
      if (error) {
        if (typeof callback === 'function') callback({ success: false, error: error.details.map(d => d.message).join(', ') });
        return;
      }
      const { roomId } = value;

      await socket.leave(roomId);
      const activeSocketInfo = activeSockets.get(socket.id);
      if (activeSocketInfo) {
        activeSocketInfo.rooms.delete(roomId);
      }

      logger.info(`[ChatHandler] User ${username} (${userId}) left room: ${roomId} (socket ${socket.id})`);
      socket.to(roomId).emit('userLeft', { roomId, userId, username });
      if (typeof callback === 'function') callback({ success: true, roomId });

    } catch (err) {
      logger.error(`[ChatHandler] Error in leaveRoom for user ${userId}, room ${payload?.roomId}:`, err);
      if (typeof callback === 'function') callback({ success: false, error: 'Server error leaving room.' });
    }
  });

  /**
   * Handle 'sendMessage' event from client.
   */
  socket.on('sendMessage', async (payload, callback) => {
    try {
      const { error, value } = sendMessageSchema.validate(payload);
      if (error) {
        logger.warn(`[ChatHandler] Invalid sendMessage payload from user ${userId}:`, error.details);
        if (typeof callback === 'function') callback({ success: false, error: error.details.map(d => d.message).join(', ') });
        return;
      }

      const { roomId, text } = value;

      // Check if socket is actually in the room it's trying to send a message to
      if (!socket.rooms.has(roomId)) {
         logger.warn(`[ChatHandler] User ${userId} tried to send message to room ${roomId} without joining.`);
         if (typeof callback === 'function') callback({ success: false, error: 'Not joined to this room.' });
         return;
      }

      const messageData = {
        id: require('uuid').v4(), // Generate message ID
        roomId,
        sender: { id: userId, username },
        text,
        timestamp: new Date(),
      };

      // (Conceptual) Persist message to database
      // const chatMessageEntity = new ChatMessage(messageData.id, roomId, userId, username, text, messageData.timestamp);
      // await chatMessageRepository.create(chatMessageEntity);

      // Broadcast the new message to all clients in the room (including sender)
      io.to(roomId).emit('newMessage', messageData);
      logger.debug(`[ChatHandler] User ${username} (${userId}) sent message to room ${roomId}: "${text}"`);

      if (typeof callback === 'function') callback({ success: true, messageId: messageData.id });

    } catch (err) {
      logger.error(`[ChatHandler] Error in sendMessage for user ${userId}, room ${payload?.roomId}:`, err);
      if (typeof callback === 'function') callback({ success: false, error: 'Server error sending message.' });
    }
  });

  /**
   * Handle client disconnect.
   * This is not an event handler directly on `socket` here, but called from `sockets/index.js`
   * when a socket disconnects, to clean up chat-specific state.
   * However, Socket.IO's `socket.on('disconnect', ...)` in `sockets/index.js` is the primary place.
   * This function could be called from there if chat handler needs specific cleanup.
   * For now, primary disconnect logic (leaving rooms automatically) is handled by Socket.IO itself
   * or can be augmented in `sockets/index.js` `disconnect` handler.
   */
  // function handleDisconnect() {
  //   const activeSocketInfo = activeSockets.get(socket.id);
  //   if (activeSocketInfo && activeSocketInfo.rooms) {
  //     activeSocketInfo.rooms.forEach(roomId => {
  //       socket.to(roomId).emit('userLeft', { roomId, userId, username });
  //       logger.info(`[ChatHandler] User ${username} (${userId}) auto-left room ${roomId} on disconnect.`);
  //     });
  //   }
  // }
  // socket.on('disconnect', handleDisconnect); // Or call this function from the main disconnect handler
}

module.exports = registerChatHandlers;

// Notes:
// - This handler is modular and gets registered by `sockets/index.js`.
// - It uses Joi for validating incoming event payloads.
// - `joinRoom` and `leaveRoom` manage socket's room membership and update `activeSockets`.
// - `sendMessage` broadcasts messages to specific rooms using `io.to(roomId).emit()`.
// - Conceptual placeholders for:
//   - Authorization: Checking if a user *can* join a specific room.
//   - Message Persistence: Saving/loading messages from a `ChatMessageRepository`.
// - Error handling and acknowledgements (callbacks) are included for client feedback.
// - Assumes `socket.user` is populated by the authentication middleware in `sockets/index.js`.
// - `uuid` is used to generate message IDs; this dependency should be in `package.json` (it is).
// - Logging is used for server-side visibility of chat actions.
// - Disconnect handling: Socket.IO automatically handles leaving rooms on disconnect.
//   The `userLeft` event can be broadcast from the main `disconnect` handler in `sockets/index.js`
//   by iterating through `activeSockets.get(socket.id).rooms`.
//
// TODO (Conceptual - requires new entities/repos):
// - Implement ChatMessage entity and repository for message persistence.
// - Implement room authorization logic (e.g., `canUserAccessRoom(userId, roomId)`).
//   This might involve checking tournament participation, match participation, team membership, etc.
// - Load message history when a user joins a room.
// - Consider rate limiting for `sendMessage`.
// - More sophisticated user presence and "is typing" indicators if needed.
// - Potentially use Redis for `activeSockets` and room memberships in a multi-instance setup.
