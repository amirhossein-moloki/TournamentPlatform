const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { appConfig } = require('../../../config/config');
const logger = require('../../utils/logger');
const chatHandler = require('./handlers/chat.handler');
// const { authenticateSocketToken } = require('../../middleware/auth.middleware'); // A socket-specific auth middleware

// In-memory store for active users/sockets (simple example, Redis might be better for multi-instance)
const activeSockets = new Map(); // Map<socket.id, { userId: string, username: string, rooms: Set<string> }>

/**
 * Initializes Socket.IO and sets up event handlers.
 * @param {http.Server} httpServer - The HTTP server instance to attach Socket.IO to.
 * @returns {SocketIO.Server} The Socket.IO server instance.
 */
function initializeSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: appConfig.cors.origin.split(','), // Allow origins from config (split if multiple)
      methods: ['GET', 'POST'],
      // credentials: true // If you need to send cookies with socket requests (less common with token auth)
    },
    // path: '/socket.io', // Default path, can be customized
    // transports: ['websocket', 'polling'], // Default
  });

  logger.info('Socket.IO server initialized.');

  // --- Socket.IO Authentication Middleware ---
  // This middleware runs for every new connection.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['x-access-token'];

    if (!token) {
      logger.warn('Socket connection attempt without token.');
      return next(new Error('Authentication error: No token provided.'));
    }

    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret);
      // `decoded` should contain user info like id (sub), email, role.
      socket.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        // username might not be in JWT, could fetch from DB if needed, or passed in handshake.auth
        // For now, assume JWT has enough for basic identification.
      };
      // TODO: Check against tokenVersion if implementing JWT invalidation via User entity's tokenVersion.
      // const userRecord = await userRepository.findById(decoded.sub);
      // if (!userRecord || userRecord.tokenVersion !== decoded.tokenVersion) {
      //   return next(new Error('Authentication error: Invalid token (version mismatch).'));
      // }

      logger.info(`Socket authenticated: User ${socket.user.id} (socket ID: ${socket.id})`);
      next();
    } catch (err) {
      logger.warn(`Socket authentication failed: ${err.message} (socket ID: ${socket.id})`);
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired.'));
      }
      return next(new Error('Authentication error: Invalid token.'));
    }
  });


  // --- Main Connection Handler ---
  io.on('connection', (socket) => {
    logger.info(`User ${socket.user.id} connected via socket: ${socket.id}`);
    activeSockets.set(socket.id, {
        userId: socket.user.id,
        username: socket.user.email, // Or actual username if fetched/in token
        rooms: new Set(),
    });

    // Register event handlers for this socket
    chatHandler(io, socket, activeSockets);
    // otherHandler(io, socket, activeSockets); // e.g., for bracket updates, notifications

    // --- Disconnect Handler ---
    socket.on('disconnect', (reason) => {
      logger.info(`User ${socket.user.id} disconnected from socket: ${socket.id}. Reason: ${reason}`);
      activeSockets.delete(socket.id);
      // Handle leaving rooms, notifying others, etc.
      // chatHandler might also have a disconnect part: chatHandler.onDisconnect(socket, activeSockets)
    });

    // --- Error Handling for Socket ---
    socket.on('error', (err) => {
        logger.error(`Socket error for user ${socket.user.id} (socket ID: ${socket.id}):`, err);
        // Depending on the error, you might want to disconnect the socket or take other actions.
    });


    // --- Example: Personal Notification ---
    // This shows how to send a message directly to this user's socket.
    // Could be triggered by other parts of the system (e.g., via a message bus event).
    // socket.emit('notification', { type: 'welcome', message: `Welcome, ${socket.user.email || 'User'}!` });

  });


  // --- Broadcasting System-Wide Messages (Example) ---
  // function broadcastSystemMessage(message) {
  //   io.emit('systemMessage', { text: message, timestamp: new Date() });
  //   logger.info(`Broadcasted system message: ${message}`);
  // }
  // Example usage: broadcastSystemMessage('Server maintenance starting in 10 minutes.');

  return io;
}

module.exports = initializeSocketIO;

// Notes:
// - Socket.IO server is initialized and attached to the existing HTTP server.
// - CORS is configured based on `appConfig.cors.origin`.
// - **Authentication**: A middleware (`io.use`) is implemented to authenticate sockets.
//   - It expects a JWT access token either in `socket.handshake.auth.token` (preferred for Socket.IO v3+)
//     or in a custom header `x-access-token`.
//   - If authentication is successful, `socket.user` is populated with decoded token data.
//   - If authentication fails, the connection is rejected.
//   - A TODO is included for checking against `tokenVersion` from a user record for more robust JWT invalidation.
// - **Connection Handling**:
//   - On successful connection, user details are logged, and the socket is added to an `activeSockets` map.
//   - Event handlers (like `chatHandler`) are registered for the connected socket.
//   - A `disconnect` handler removes the socket from `activeSockets` and logs disconnection.
//   - A basic `error` handler for socket-specific errors is included.
// - **`activeSockets` Map**: This is a simple in-memory store for tracking connected sockets and their associated user/room info.
//   For multi-instance deployments, a shared store like Redis would be necessary for this kind of state.
// - **Modularity**: Event handling logic (e.g., for chat) is delegated to separate handler files (`chat.handler.js`).
// - The `chatHandler` function is expected to take `io`, `socket`, and `activeSockets` as arguments.
// - Placeholder for `authenticateSocketToken` from `auth.middleware.js` is noted; the current implementation
//   has the auth logic directly in `io.use()`. A shared middleware function could be used if preferred.
// - The `appConfig.cors.origin` might be a single string or comma-separated. `split(',')` handles the latter.
// - The blueprint specifies `connection` (Handshake) where "Authentication with an Access Token is performed". This is implemented by `io.use`.
// - The other Socket.IO events (`joinRoom`, `sendMessage`, `newMessage`, `notification`, `bracketUpdate`)
//   will be handled within their respective handlers (e.g., `chat.handler.js` for chat events).
//   `bracketUpdate` would likely be in a `tournament.handler.js` or similar.
// - This `index.js` provides the core Socket.IO setup and authentication layer.
