const logger = require('../../../utils/logger');

/**
 * Registers notification-related event handlers for a connected socket.
 * This handler is more about server-initiated notifications to clients.
 * Clients typically don't "send" notifications in the same way they send chat messages.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @param {import('socket.io').Socket} socket - The individual client socket.
 * @param {Map<string, { userId: string, username: string, rooms: Set<string> }>} activeSockets - Map of active sockets.
 */
function registerNotificationHandlers(io, socket, activeSockets) {
  const userId = socket.user.id;
  logger.info(`[NotificationHandler] Setting up for user ${userId} (socket ${socket.id})`);

  // Example: Client acknowledges receipt of a notification (optional)
  socket.on('notificationAck', (data) => {
    logger.info(`[NotificationHandler] User ${userId} acknowledged notification:`, data);
    // Store acknowledgement or perform related actions if needed
  });

  // Server-side logic to send notifications would typically be triggered by other services/events.
  // For example, after a match result is confirmed, or a prize is paid out.

  // Example function that could be called from elsewhere in the application
  // (e.g., from a use case, or an event subscriber)
  // This is not a socket event listener, but a function that USES the `io` or `socket` instance.
  // It's often better to have a dedicated NotificationService that can access `io`
  // or use a message bus to decouple this.
  // For demonstration, placing a conceptual sender here.

  // This function would not be directly part of this handler registration,
  // but shows how notifications could be sent.
  // const sendPersonalNotification = (targetUserId, notificationPayload) => {
  //   // Find socket(s) for targetUserId
  //   for (const [socketId, activeSocket] of activeSockets.entries()) {
  //     if (activeSocket.userId === targetUserId) {
  //       io.to(socketId).emit('notification', notificationPayload);
  //       logger.info(`[NotificationHandler] Sent personal notification to user ${targetUserId} (socket ${socketId})`, notificationPayload);
  //       // Could break if only one socket per user is expected, or send to all user's sockets
  //     }
  //   }
  // };
  // Example: sendPersonalNotification(someUserId, { type: 'info', message: 'Your withdrawal was approved.' });

  // Example: Sending a welcome notification upon connection (can also be in main connection handler)
  // socket.emit('notification', {
  //   id: require('uuid').v4(),
  //   type: 'welcome',
  //   message: `Welcome, ${socket.user.username || socket.user.email}!`,
  //   timestamp: new Date(),
  //   isRead: false,
  // });
}

module.exports = registerNotificationHandlers;

// Notes:
// - This handler is primarily for server-to-client notifications.
// - Actual sending of notifications (e.g., `io.to(socketId).emit('notification', ...)` or `io.to(roomId).emit(...)`)
//   would be triggered by application logic (use cases, services, event handlers for domain events).
// - A robust notification system might involve:
//   - A `NotificationService` that abstracts Socket.IO interactions.
//   - Storing notifications in a database so users can retrieve them later or if they were offline.
//   - User preferences for notifications.
//   - Different types of notifications (info, alert, success, error).
// - The `notificationAck` is an example of a client-side event if needed.
// - The `activeSockets` map can be used to find a user's socket(s) if you need to send a direct notification.
//   For room-based notifications (e.g., new tournament announcement), `io.to(roomName).emit(...)` would be used.
//   This implies that users join relevant "notification rooms" (e.g., a general 'announcements' room,
//   or rooms for specific tournaments they are interested in).
// - This file sets up the structure. The actual "sending" logic will be called from other parts of the system.
