const redis = require('redis');
const { appConfig } = require('../../../config/config');
const logger = require('../../utils/logger');

let redisClient;
let connectionPromise;

/**
 * Initializes the Redis client and connects to the server.
 * This function should be called once at application startup.
 * It handles connection retries internally if configured.
 * @returns {Promise<redis.RedisClientType>} A promise that resolves with the connected client.
 */
async function initialize() {
  if (redisClient && redisClient.isOpen) {
    logger.info('Redis client already connected.');
    return redisClient;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const redisOptions = {
    socket: {
      host: appConfig.redis.host,
      port: appConfig.redis.port,
      tls: appConfig.redis.tls || undefined, // Pass TLS options if configured
      // connectTimeout: 10000, // Optional: connection timeout
      // Reconnect strategy can be configured here if needed, though node-redis has defaults
    },
  };

  if (appConfig.redis.password) {
    redisOptions.password = appConfig.redis.password;
  }

  // For Redis versions < 4 (node-redis v3), connection was:
  // client = redis.createClient(appConfig.redis.port, appConfig.redis.host, redisOptions);
  // For node-redis v4:
  const client = redis.createClient(redisOptions);

  client.on('connect', () => {
    logger.info(`Connecting to Redis on ${appConfig.redis.host}:${appConfig.redis.port}...`);
  });

  client.on('ready', () => {
    logger.info('Redis client connected successfully and ready to use.');
    redisClient = client; // Assign to global client variable once ready
  });

  client.on('error', (err) => {
    logger.error('Redis client error:', err);
    // Depending on the error, you might want to attempt to reconnect or handle it.
    // node-redis v4 handles reconnections automatically by default.
    // If connection is critical, server might exit or enter a degraded state.
  });

  client.on('end', () => {
    logger.info('Redis client connection ended.');
    redisClient = null; // Clear client on disconnection
    connectionPromise = null; // Allow re-initialization
  });

  // `client.connect()` returns a promise that resolves when connected, or rejects on error.
  connectionPromise = client.connect()
    .then(() => {
      redisClient = client; // Ensure redisClient is set upon successful connection
      return client;
    })
    .catch((err) => {
      logger.error('Failed to connect to Redis during initialization:', err);
      connectionPromise = null; // Reset promise on failure to allow retry
      // Optionally rethrow or handle critical failure (e.g., process.exit)
      throw err; // Rethrow to indicate critical failure to connect initially
    });

  return connectionPromise;
}

/**
 * Gets the Redis client instance.
 * Throws an error if the client is not initialized or not connected.
 * @returns {redis.RedisClientType} The Redis client.
 * @throws {Error} If client is not available.
 */
function getClient() {
  if (!redisClient || !redisClient.isOpen) {
    // logger.warn('Redis client not available or not connected. Attempting to initialize...');
    // It might be too late to initialize here if called during active request.
    // Best practice is to ensure `initialize()` is called at startup.
    // For robustness in dev, you could try initialize(). Await it if so.
    // if (!connectionPromise) initialize(); // This would be problematic if not awaited.
    throw new Error('Redis client is not connected. Ensure initialize() was called and succeeded.');
  }
  return redisClient;
}

/**
 * Sets a value in Redis.
 * @param {string} key - The key to set.
 * @param {string|number|Buffer} value - The value to set.
 * @param {object} [options] - Options for SET command (e.g., EX for expiry in seconds, PX for expiry in ms).
 *                             Example: { EX: 3600 } for 1 hour expiry.
 * @returns {Promise<string|null>} Promise resolving to 'OK' or null.
 */
async function set(key, value, options = {}) {
  const client = getClient();
  try {
    return await client.set(key, value, options);
  } catch (err) {
    logger.error(`Redis SET error for key "${key}":`, err);
    throw err; // Re-throw to allow caller to handle
  }
}

/**
 * Gets a value from Redis.
 * @param {string} key - The key to get.
 * @returns {Promise<string|null>} Promise resolving to the value or null if key doesn't exist.
 */
async function get(key) {
  const client = getClient();
  try {
    return await client.get(key);
  } catch (err) {
    logger.error(`Redis GET error for key "${key}":`, err);
    throw err; // Re-throw
  }
}

/**
 * Deletes one or more keys from Redis.
 * @param {string|string[]} keys - A single key or an array of keys to delete.
 * @returns {Promise<number>} Promise resolving to the number of keys deleted.
 */
async function del(keys) {
  const client = getClient();
  try {
    return await client.del(keys);
  } catch (err) {
    logger.error(`Redis DEL error for keys "${keys}":`, err);
    throw err; // Re-throw
  }
}

/**
 * Sets a JSON object in Redis. Automatically stringifies the object.
 * @param {string} key - The key to set.
 * @param {object} value - The JSON object to set.
 * @param {object} [options] - Options for SET command (e.g., EX for expiry).
 * @returns {Promise<string|null>}
 */
async function setJSON(key, value, options = {}) {
  try {
    const stringValue = JSON.stringify(value);
    return await set(key, stringValue, options);
  } catch (err) {
    logger.error(`Redis setJSON error for key "${key}" (JSON.stringify failed or SET failed):`, err);
    throw err;
  }
}

/**
 * Gets a JSON object from Redis. Automatically parses the JSON string.
 * @param {string} key - The key to get.
 * @returns {Promise<object|null>} Promise resolving to the parsed object or null.
 */
async function getJSON(key) {
  try {
    const stringValue = await get(key);
    if (stringValue === null) {
      return null;
    }
    return JSON.parse(stringValue);
  } catch (err) {
    // Handle JSON parsing errors specifically, or Redis GET errors
    if (err instanceof SyntaxError) {
      logger.error(`Redis getJSON error for key "${key}": Invalid JSON format. Value: "${await get(key)}"`, err);
    } else {
      logger.error(`Redis getJSON error for key "${key}" (GET failed or JSON.parse failed):`, err);
    }
    throw err; // Re-throw to allow caller to handle (e.g. cache miss / corruption)
  }
}

/**
 * Flushes all keys from the current Redis database.
 * Use with extreme caution, especially in production.
 * @returns {Promise<string>} Promise resolving to 'OK'.
 */
async function flushDb() {
  if (appConfig.env === 'production') {
    logger.warn('FLUSHDB command called in production environment. This is highly discouraged.');
    // throw new Error('FLUSHDB is disabled in production for safety.'); // Or just log and don't execute
    // For now, let's allow it but log heavily.
  }
  const client = getClient();
  try {
    logger.warn(`Executing FLUSHDB on Redis database. All keys will be removed.`);
    return await client.flushDb();
  } catch (err) {
    logger.error('Redis FLUSHDB error:', err);
    throw err;
  }
}

/**
 * Closes the Redis connection.
 * Should be called on application shutdown.
 * @returns {Promise<void>}
 */
async function close() {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit(); // Gracefully close connection
      logger.info('Redis client connection closed successfully.');
    } catch (err) {
      logger.error('Error closing Redis client connection:', err);
      // Force close if quit fails?
      // await redisClient.disconnect();
    } finally {
      redisClient = null;
      connectionPromise = null;
    }
  } else {
    logger.info('Redis client already closed or not initialized.');
  }
}

module.exports = {
  initialize,
  getClient, // Exposing getClient might be useful for advanced direct usage, but generally use specific methods.
  set,
  get,
  del,
  setJSON,
  getJSON,
  flushDb, // Be cautious with exposing this
  close,
};

// The `initialize` function is designed to be called at server startup.
// Example in server.js:
// const redisAdapter = require('./src/infrastructure/cache/redis.adapter');
// await redisAdapter.initialize();
// ...
// And for shutdown:
// await redisAdapter.close();
//
// This adapter provides a basic set of common Redis operations.
// More advanced operations (lists, hashes, sorted sets, pub/sub, transactions/pipelining)
// can be added as needed, or `getClient()` can be used to access the raw node-redis client.
// Error handling: Errors from node-redis are re-thrown by default after logging,
// allowing the calling service/use-case to decide on cache-miss strategies or error propagation.
// Consider a more sophisticated error handling or retry mechanism for specific use cases if needed.
