const rabbitMQAdapter = require('../infrastructure/messaging/rabbitmq.adapter');
const logger = require('../utils/logger');
const { appConfig } = require('../../config/config');
// const s3Service = require('../infrastructure/s3.service'); // Conceptual
// const malwareScanner = require('../services/malware.scanner'); // Conceptual
// const fileUploadRepository = require('../infrastructure/database/repositories/file.upload.repository'); // Conceptual

const QUEUE_NAME = appConfig.rabbitmq.queues.fileScan || 'file_scan_queue'; // From config

/**
 * Simulates downloading a file from S3.
 * @param {string} fileKey - The S3 key of the file.
 * @returns {Promise<Buffer|null>} A mock file buffer.
 */
async function mockDownloadFile(fileKey) {
  logger.info(`[FileScanWorker] Simulating download of file: ${fileKey}`);
  // In a real scenario, use AWS S3 SDK to getObject
  // For now, return a dummy buffer or null
  if (!fileKey) return null;
  return Buffer.from(`Mock content for ${fileKey}`);
}

/**
 * Simulates scanning a file for malware.
 * @param {Buffer} fileBuffer - The file content.
 * @param {string} fileKey - The S3 key, for context.
 * @returns {Promise<'clean'|'infected'>} The scan result.
 */
async function mockScanFile(fileBuffer, fileKey) {
  logger.info(`[FileScanWorker] Simulating malware scan for file: ${fileKey}`);
  // In a real scenario, use a library like clamscan or an API
  // For now, randomly determine or always return 'clean'
  if (!fileBuffer) return 'infected'; // Or handle error
  return Math.random() > 0.1 ? 'clean' : 'infected'; // 10% chance of being "infected"
}

/**
 * Simulates updating the file's status in the database.
 * @param {string} fileKey - The S3 key of the file.
 * @param {string} scanStatus - The result of the scan ('clean' or 'infected').
 * @param {object} messagePayload - The original message payload for context.
 */
async function mockUpdateFileStatus(fileKey, scanStatus, messagePayload) {
  logger.info(`[FileScanWorker] Updating status for file ${fileKey} to ${scanStatus}. Match ID: ${messagePayload.matchId}, User ID: ${messagePayload.userId}`);
  // In a real scenario, update a record in DB, e.g., FileUploads table
  // await fileUploadRepository.updateStatus(fileKey, scanStatus, { matchId: messagePayload.matchId });

  if (scanStatus === 'infected') {
    logger.warn(`[FileScanWorker] File ${fileKey} is INFECTED. Quarantine actions would be taken.`);
    // E.g., move file in S3, notify admin
  } else {
    logger.info(`[FileScanWorker] File ${fileKey} is CLEAN. Result submission can proceed for match ${messagePayload.matchId}.`);
    // E.g., emit an event or update match result eligibility
  }
}

/**
 * Processes a message from the file scan queue.
 * @param {object} parsedMessage - The parsed message content.
 * @param {import('amqplib').Message} originalMessage - The raw AMQP message.
 */
async function processMessage(parsedMessage, originalMessage) {
  const { fileKey, s3Bucket, originalFilename, matchId, userId } = parsedMessage;
  logger.info(`[FileScanWorker] Received file scan request for: ${fileKey} (Bucket: ${s3Bucket}, Match: ${matchId}, User: ${userId})`);

  if (!fileKey || !s3Bucket) {
    logger.error('[FileScanWorker] Invalid message payload: missing fileKey or s3Bucket.', parsedMessage);
    rabbitMQAdapter.nackMessage(originalMessage, false); // Do not requeue malformed messages
    return;
  }

  try {
    // 1. (Mock) Download file from S3
    // In a real app, you'd use s3Service.downloadFile(s3Bucket, fileKey);
    const fileBuffer = await mockDownloadFile(fileKey);
    if (!fileBuffer) {
      logger.error(`[FileScanWorker] Failed to download file (mock): ${fileKey}. Nacking message.`);
      rabbitMQAdapter.nackMessage(originalMessage, false); // Or requeue based on error type
      return;
    }

    // 2. (Mock) Scan file for malware
    const scanResult = await mockScanFile(fileBuffer, fileKey);

    // 3. (Mock) Update file status in DB and take action
    await mockUpdateFileStatus(fileKey, scanResult, parsedMessage);

    // 4. Acknowledge message
    rabbitMQAdapter.ackMessage(originalMessage);
    logger.info(`[FileScanWorker] Successfully processed and ACKed message for file: ${fileKey}`);

  } catch (error) {
    logger.error(`[FileScanWorker] Error processing file scan for ${fileKey}:`, error);
    // Decide whether to requeue based on the error type.
    // For persistent errors, nack without requeue to avoid infinite loops.
    // For transient errors (e.g., network issue with scanner service), requeue might be okay.
    const shouldRequeue = false; // Example: don't requeue by default for unhandled errors
    rabbitMQAdapter.nackMessage(originalMessage, shouldRequeue);
    logger.info(`[FileScanWorker] NACKed message for file: ${fileKey} (requeue: ${shouldRequeue})`);
  }
}

/**
 * Starts the file scan worker.
 * Connects to RabbitMQ and consumes messages from the designated queue.
 */
async function start() {
  logger.info('[FileScanWorker] Starting...');
  try {
    // Ensure RabbitMQ connection is established (adapter handles retries)
    // The connect call is idempotent in the adapter
    await rabbitMQAdapter.connect();

    // Consume messages
    // The rabbitMQAdapter.consumeMessages should ideally handle channel errors and reconnections for the consumer.
    await rabbitMQAdapter.consumeMessages(QUEUE_NAME, processMessage, {
      // Prefetch count: How many messages the server will deliver, at maximum,
      // to this consumer before receiving an ack/nack.
      // Helps with load balancing if multiple worker instances.
      prefetch: parseInt(process.env.FILE_SCAN_WORKER_PREFETCH_COUNT || '1', 10), // Example: configurable prefetch
    });
    logger.info(`[FileScanWorker] Worker started. Consuming messages from queue: ${QUEUE_NAME}`);
  } catch (error) {
    logger.error('[FileScanWorker] Failed to start:', error);
    // Implement a retry mechanism for starting the worker or exit if critical
    // For now, log and exit to allow process manager (like PM2) to restart.
    process.exit(1); // Or throw error to be caught by a global handler
  }
}

/**
 * Stops the file scan worker gracefully.
 * (Currently, rabbitMQAdapter.close() handles general cleanup)
 */
async function stop() {
  logger.info('[FileScanWorker] Stopping...');
  // rabbitMQAdapter.close() will be called globally on server shutdown.
  // If specific consumer cancellation is needed:
  // if (consumerTag) await rabbitMQAdapter.cancelConsumer(consumerTag);
  logger.info('[FileScanWorker] Stopped.');
}

module.exports = {
  start,
  stop,
  // Expose processMessage for testing if needed
  // processMessage_FOR_TESTING: processMessage
};

// To run this worker:
// In your main application or a separate worker process:
// require('./src/workers/file.scan.worker').start();
//
// Message payload expected on RABBITMQ_FILE_SCAN_QUEUE:
// {
//   fileKey: "tournaments/tourney123/matches/match456/results/user789_uuid.png",
//   s3Bucket: "your-s3-bucket-name",
//   originalFilename: "result.png",
//   matchId: "match456",
//   userId: "user789", // User who uploaded
//   tournamentId: "tourney123"
// }
//
// The `appConfig.rabbitmq.queues.fileScan` should be defined in `config/config.js`.
// It's referenced like: `RABBITMQ_FILE_SCAN_QUEUE: Joi.string().default('file_scan_queue')`
// and then used in `appConfig.rabbitmq.queues.fileScan`.
//
// This worker is simplified:
// - Actual S3 download and malware scanning are mocked.
// - Database interaction for file status update is mocked.
// - Error handling for message processing is basic (nack without requeue).
//   A robust worker would use a dead-letter queue (DLQ) for messages that repeatedly fail.
// - Assumes `rabbitMQAdapter.consumeMessages` handles consumer setup and recovery.
// - Prefetch count is made configurable via environment variable as an example.
// - `stop()` function is basic; RabbitMQ adapter's global close is relied upon.
//   For more fine-grained control, specific consumer cancellation might be needed.
