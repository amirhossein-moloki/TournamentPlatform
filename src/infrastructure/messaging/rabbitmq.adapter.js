const amqp = require('amqplib');
const { appConfig } = require('../../../config/config');
const logger = require('../../utils/logger');

let connection = null;
let channel = null;
let connectionPromise = null;
let isClosing = false;

const MAX_RETRIES = appConfig.rabbitmq.maxRetries || 5; // Max retries for connection
const RETRY_DELAY = appConfig.rabbitmq.retryDelay || 5000; // Delay between retries in ms

/**
 * Connects to RabbitMQ and creates a channel.
 * Handles connection retries.
 * @param {number} attempt - Current connection attempt number.
 * @returns {Promise<void>}
 */
async function connectWithRetry(attempt = 1) {
  if (isClosing) {
    logger.info('RabbitMQ adapter is closing, aborting connection attempt.');
    return;
  }
  try {
    logger.info(`Attempting to connect to RabbitMQ (Attempt ${attempt}/${MAX_RETRIES}). URL: ${appConfig.rabbitmq.url}`);
    connection = await amqp.connect(appConfig.rabbitmq.url);
    logger.info('Successfully connected to RabbitMQ.');

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err.message);
      // Handle connection errors, e.g., by trying to reconnect if not already handled by 'close'
      if (!isClosing) {
        closeConnectionAndReconnect(); // Attempt to re-establish
      }
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed.');
      if (!isClosing) { // If not an intentional close, try to reconnect
        logger.info('Attempting to reconnect to RabbitMQ due to unexpected close...');
        connection = null;
        channel = null;
        connectionPromise = null; // Reset promise to allow re-initialization
        connectWithRetry(); // Start reconnection attempts
      }
    });

    channel = await connection.createChannel();
    logger.info('RabbitMQ channel created successfully.');

    // Assert queues to ensure they exist (optional, can be done by consumers/producers too)
    // This makes the adapter responsible for queue existence on startup.
    await assertQueues();

    connectionPromise = null; // Clear promise as connection is successful
  } catch (error) {
    logger.error(`RabbitMQ connection attempt ${attempt} failed:`, error.message);
    if (attempt < MAX_RETRIES && !isClosing) {
      logger.info(`Retrying RabbitMQ connection in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectWithRetry(attempt + 1);
    } else if (!isClosing) {
      logger.error(`Failed to connect to RabbitMQ after ${MAX_RETRIES} attempts. Application may not function correctly.`);
      connectionPromise = null; // Clear promise on final failure
      throw error; // Re-throw the last error to indicate connection failure
    }
  }
}


/**
 * Initializes the RabbitMQ connection.
 * This should be called at application startup.
 * @returns {Promise<void>}
 */
async function connect() {
  if (channel && connection && connection.isConnected) { // `isConnected` might not be a public AMQP property
                                                          // Check `channel` as a proxy for successful connection
    logger.info('RabbitMQ already connected.');
    return;
  }
  if (connectionPromise) {
    return connectionPromise; // Another connect call is already in progress
  }

  isClosing = false;
  connectionPromise = connectWithRetry();
  return connectionPromise;
}

/**
 * Asserts that all configured queues exist.
 * This can be called after a channel is established.
 */
async function assertQueues() {
  if (!channel) {
    logger.warn('Cannot assert queues, RabbitMQ channel not available.');
    return;
  }
  try {
    const queues = appConfig.rabbitmq.queues || {};
    for (const queueName of Object.values(queues)) {
      if (queueName) {
        // durable: true means messages will survive broker restart if they are persisted
        // and the queue itself will survive broker restart.
        await channel.assertQueue(queueName, { durable: true });
        logger.info(`Queue asserted: ${queueName}`);
      }
    }
  } catch (error) {
    logger.error('Error asserting RabbitMQ queues:', error);
    throw error; // Rethrow to indicate failure during setup
  }
}

/**
 * Closes the RabbitMQ connection and channel.
 * This should be called on graceful application shutdown.
 */
async function close() {
  isClosing = true; // Signal that closure is intentional
  if (connectionPromise) {
    try {
      await connectionPromise; // Wait for any ongoing connection attempt to resolve or fail
    } catch (e) {
      logger.info('Ongoing connection attempt failed during close operation.');
    }
    connectionPromise = null;
  }

  if (channel) {
    try {
      await channel.close();
      logger.info('RabbitMQ channel closed.');
    } catch (error) {
      logger.error('Error closing RabbitMQ channel:', error);
    } finally {
      channel = null;
    }
  }
  if (connection) {
    try {
      await connection.close();
      logger.info('RabbitMQ connection closed.');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    } finally {
      connection = null;
    }
  }
  logger.info('RabbitMQ adapter cleanup complete.');
}


/**
 * Helper function to gracefully close current connection and attempt reconnection.
 */
async function closeConnectionAndReconnect() {
    if (channel) {
        try { await channel.close(); } catch (e) { /* ignore */ }
        channel = null;
    }
    if (connection) {
        try { await connection.close(); } catch (e) { /* ignore */ }
        connection = null;
    }
    connectionPromise = null; // Reset connection promise
    if (!isClosing) { // Only reconnect if not intentionally closing
        logger.info('Attempting to re-establish RabbitMQ connection after error/close event.');
        connectWithRetry();
    }
}


/**
 * Publishes a message to a specified queue.
 * @param {string} queueName - The name of the queue.
 * @param {object|string} message - The message to publish (will be stringified if an object).
 * @param {object} [options={}] - AMQP publish options (e.g., { persistent: true }).
 * @returns {Promise<boolean>} True if message was published, false otherwise.
 */
async function publishMessage(queueName, message, options = {}) {
  if (!channel) {
    logger.error(`Cannot publish message to ${queueName}: RabbitMQ channel not available.`);
    // Optional: try to connect again or throw a more specific error.
    // For now, return false or throw to indicate failure.
    // await connect(); // This could lead to complex retry logic here.
    // if (!channel) throw new Error('RabbitMQ channel unavailable after attempting reconnect.');
    throw new Error('RabbitMQ channel is not available. Ensure connect() was called and succeeded.');
  }

  try {
    const bufferMessage = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
    const publishOptions = {
      persistent: true, // Ensures messages are stored on disk if the queue is durable
      ...options,
    };
    const success = channel.sendToQueue(queueName, bufferMessage, publishOptions);
    if (success) {
      logger.debug(`Message published to queue "${queueName}"`); // Content logged if debug level allows
    } else {
      // sendToQueue can return false if the channel's write buffer is full.
      // Proper handling might involve waiting for 'drain' event or implementing publisher confirms.
      logger.warn(`Failed to publish message to queue "${queueName}" (possibly buffer full). Implement drain handling or publisher confirms for reliability.`);
      // For simplicity, we'll treat this as a failure for now.
      // In a robust system, you'd handle this with backpressure mechanisms.
    }
    return success;
  } catch (error) {
    logger.error(`Error publishing message to queue "${queueName}":`, error);
    throw error; // Re-throw to allow caller to handle (e.g., retry, dead-lettering)
  }
}

/**
 * Consumes messages from a specified queue.
 * @param {string} queueName - The name of the queue.
 * @param {function(object, amqp.Message): Promise<void>} onMessageCallback - Async function to process each message.
 *        It receives the parsed message content and the raw AMQP message.
 *        The callback should handle its own errors. If it throws, message might be nack'd.
 *        To acknowledge (ack) or reject (nack) a message, use methods on the raw AMQP message object.
 * @param {object} [options={}] - AMQP consume options (e.g., { noAck: false }).
 * @returns {Promise<{consumerTag: string}>} Object containing the consumerTag.
 */
async function consumeMessages(queueName, onMessageCallback, options = {}) {
  if (!channel) {
    logger.error(`Cannot consume messages from ${queueName}: RabbitMQ channel not available.`);
    throw new Error('RabbitMQ channel is not available. Ensure connect() was called and succeeded.');
  }

  const consumeOptions = {
    noAck: false, // Manual acknowledgment is generally safer
    ...options,
  };

  try {
    // Ensure queue exists before consuming
    await channel.assertQueue(queueName, { durable: true });

    logger.info(`Starting consumer for queue "${queueName}"...`);
    const { consumerTag } = await channel.consume(queueName, async (msg) => {
      if (msg === null) {
        // This can happen if the channel or connection is closed while consuming.
        logger.warn(`Consumer for queue "${queueName}" received null message (possibly channel closed).`);
        return;
      }

      let parsedContent;
      try {
        // Assuming messages are JSON strings
        parsedContent = JSON.parse(msg.content.toString());
      } catch (parseError) {
        logger.error(`Failed to parse message content from queue "${queueName}":`, parseError, `Raw: ${msg.content.toString()}`);
        // Decide how to handle unparseable messages: nack without requeue, or move to dead-letter queue.
        channel.nack(msg, false, false); // nack(message, allUpTo, requeue)
        return;
      }

      try {
        await onMessageCallback(parsedContent, msg); // Pass raw msg for ack/nack control
        // If onMessageCallback doesn't throw and doesn't manually ack/nack,
        // and if noAck: false, the message will remain unacknowledged.
        // It's typical for onMessageCallback to handle ack/nack.
        // If it's not handled there, and noAck is false, you must ack here if successful.
        // However, it's better to delegate ack/nack to the callback for finer control.
        // Example: if (consumeOptions.noAck === false && !ackedInCallback) channel.ack(msg);
      } catch (processingError) {
        logger.error(`Error processing message from queue "${queueName}":`, processingError);
        // Decide on nack strategy: requeue (true) or send to dead-letter (false).
        // Requeuing immediately might cause infinite loops for persistently failing messages.
        // A dead-letter exchange (DLX) is usually a better approach for failed messages.
        if (consumeOptions.noAck === false) {
          // Check if message has been redelivered too many times (requires x-death header inspection)
          // For simplicity, nack without requeue.
          try {
            channel.nack(msg, false, false);
          } catch (nackError) {
            logger.error(`Error nacking message after processing error:`, nackError);
          }
        }
      }
    }, consumeOptions);

    logger.info(`Consumer started for queue "${queueName}" with tag "${consumerTag}".`);
    return { consumerTag };
  } catch (error) {
    logger.error(`Error setting up consumer for queue "${queueName}":`, error);
    throw error;
  }
}

/**
 * Acknowledges a message.
 * @param {amqp.Message} msg - The AMQP message object received by a consumer.
 */
function ackMessage(msg) {
  if (!channel) {
    logger.warn('Cannot ACK message: RabbitMQ channel not available.');
    return;
  }
  try {
    channel.ack(msg);
  } catch (error) {
    logger.error('Error ACKing message:', error);
  }
}

/**
 * Negatively acknowledges a message.
 * @param {amqp.Message} msg - The AMQP message object received by a consumer.
 * @param {boolean} [requeue=false] - Whether to requeue the message. Defaults to false (send to DLX or discard).
 */
function nackMessage(msg, requeue = false) {
  if (!channel) {
    logger.warn('Cannot NACK message: RabbitMQ channel not available.');
    return;
  }
  try {
    channel.nack(msg, false, requeue); // allUpTo is false
  } catch (error) {
    logger.error('Error NACKing message:', error);
  }
}


module.exports = {
  connect,
  close,
  publishMessage,
  consumeMessages,
  ackMessage, // Expose manual ack/nack for consumers
  nackMessage,
  getChannel: () => channel, // For advanced use cases, e.g., publisher confirms, transactions
};

// This adapter provides:
// - Connection management with retries and event handling (error, close).
// - Publishing messages (with persistence by default).
// - Consuming messages (with manual acknowledgment by default).
// - Helper functions for explicit ack/nack.
// - Queue assertion on connect to ensure queues exist.
//
// Important considerations for production:
// - Publisher Confirms: For ensuring messages are actually received by the broker.
// - Consumer Error Handling: Dead-letter exchanges (DLX) for messages that cannot be processed.
// - Prefetch Count (channel.prefetch): To limit the number of unacknowledged messages a consumer holds.
// - Connection/Channel recovery is handled by amqplib to some extent, but robust applications
//   often build more sophisticated logic on top, especially for consumers.
// The current reconnect logic is basic and might need enhancement for complex failure scenarios.
// The `isClosing` flag helps prevent reconnection attempts during intentional shutdown.
// The `appConfig.rabbitmq.queues` should be an object like:
// queues: {
//   prizePayout: 'prize_payout_queue',
//   disputeResolution: 'dispute_resolution_queue',
//   fileScan: 'file_scan_queue',
// }
// which is already in `config/config.js`.
// The `assertQueues` function iterates over these values.
// MAX_RETRIES and RETRY_DELAY can be added to `appConfig.rabbitmq` if not already there.
// Example: `rabbitmq: { url: ..., queues: {...}, maxRetries: 5, retryDelay: 5000 }`
// If not in config, using hardcoded defaults here.
// Added MAX_RETRIES and RETRY_DELAY to use values from appConfig or default.
