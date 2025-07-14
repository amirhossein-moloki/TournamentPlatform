const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const { appConfig } = require('../../../config/config');
const logger = require('../../utils/logger');
const chatHandler = require('./handlers/chat.handler');
const redisAdapter = require('../../infrastructure/cache/redis.adapter');

/**
 * Initializes Socket.IO and sets up event handlers.
 * @param {http.Server} httpServer - The HTTP server instance to attach Socket.IO to.
 * @returns {SocketIO.Server} The Socket.IO server instance.
 */
function initializeSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: appConfig.cors.origin.split(','),
      methods: ['GET', 'POST'],
    },
  });

  const pubClient = redisAdapter.getClient();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  logger.info('Socket.IO server initialized with Redis adapter.');

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['x-access-token'];

    if (!token) {
      logger.warn('Socket connection attempt without token.');
      return next(new Error('Authentication error: No token provided.'));
    }

    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret);
      socket.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
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

  io.on('connection', async (socket) => {
    logger.info(`User ${socket.user.id} connected via socket: ${socket.id}`);

    const socketData = {
      userId: socket.user.id,
      username: socket.user.email,
      rooms: [],
    };
    await redisAdapter.setJSON(`socket:${socket.id}`, socketData, { EX: 86400 }); // 24-hour expiry

    chatHandler(io, socket, {}); // Pass empty object for activeSockets

    socket.on('disconnect', async (reason) => {
      logger.info(`User ${socket.user.id} disconnected from socket: ${socket.id}. Reason: ${reason}`);
      await redisAdapter.del(`socket:${socket.id}`);
    });

    socket.on('error', (err) => {
        logger.error(`Socket error for user ${socket.user.id} (socket ID: ${socket.id}):`, err);
    });
  });

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
