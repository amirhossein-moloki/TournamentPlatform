require('dotenv').config(); // Load environment variables from .env file

const http = require('http');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs'); // Import fs module
const path = require('path');
const { sequelize } = require('./src/infrastructure/database/postgres.connector');
const rabbitMQAdapter = require('./src/infrastructure/messaging/rabbitmq.adapter');
// const { initialize: initializeRedis } = require('./src/infrastructure/cache/redis.adapter'); // If Redis needs explicit init
const initializeSocketIO = require('./src/presentation/sockets');

const PORT = process.env.PORT || 3000;

// Swagger setup
const swaggerFilePath = path.join(__dirname, 'docs/swagger-generated.json');
const expressOasGenerator = require('express-oas-generator');
expressOasGenerator.init(app, {});
const swaggerFile = fs.readFileSync(swaggerFilePath, 'utf8');
const swaggerDocument = JSON.parse(swaggerFile);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const server = http.createServer(app);

async function connectToDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    // Optional: Sync models if you're not using migrations or want to ensure tables exist
    // await sequelize.sync({ alter: process.env.NODE_ENV === 'development' }); // Use with caution in production
    // logger.info('Database synchronized.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1); // Exit if database connection fails
  }
}

async function connectToMessageQueue() {
  try {
    await rabbitMQAdapter.connect();
    logger.info('Successfully connected to RabbitMQ.');
    // Initialize workers that depend on RabbitMQ connection
    // e.g., require('./src/workers/prize.distribution.worker').start();
    // require('./src/workers/dispute.resolution.worker').start();
    // require('./src/workers/file.scan.worker').start();
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    process.exit(1); // Exit if RabbitMQ connection fails
  }
}

// async function connectToCache() {
//   try {
//     await initializeRedis(); // Assuming initializeRedis returns a promise or is async
//     logger.info('Successfully connected to Redis.');
//   } catch (error) {
//     logger.error('Failed to connect to Redis:', error);
//     // Decide if Redis connection failure is critical enough to exit
//     // process.exit(1);
//   }
// }

async function startServer() {
  try {
    // 1. Connect to Database
    await connectToDatabase();

    // 2. Connect to Cache (e.g., Redis)
    // await connectToCache(); // Uncomment if Redis needs explicit async initialization

    // 3. Connect to Message Queue (e.g., RabbitMQ) and initialize workers
    await connectToMessageQueue();

    // 4. Initialize Socket.IO
    initializeSocketIO(server); // Pass the HTTP server instance
    logger.info('Socket.IO initialized.');

    // 5. Start the HTTP server
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API available at ${process.env.API_BASE_URL || '/api/v1'}`);
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Swagger UI (if configured): http://localhost:${PORT}/api-docs`);
      }
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      // 1. Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed.');
      });

      // 2. Close RabbitMQ connection
      if (rabbitMQAdapter && typeof rabbitMQAdapter.close === 'function') {
        await rabbitMQAdapter.close();
        logger.info('RabbitMQ connection closed.');
      }

      // 3. Close Database connection
      if (sequelize && typeof sequelize.close === 'function') {
        await sequelize.close();
        logger.info('Database connection closed.');
      }

      // 4. Close Redis connection (if applicable)
      // const redisClient = require('./src/infrastructure/cache/redis.adapter').getClient(); // Assuming getClient exists
      // if (redisClient && typeof redisClient.quit === 'function') {
      //   await redisClient.quit();
      //   logger.info('Redis connection closed.');
      // }

      logger.info('Graceful shutdown complete.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  // Optionally, shut down gracefully
  // process.exit(1); // Consider if this is too abrupt
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Application specific logging
  // It's often recommended to shut down after an uncaught exception,
  // as the application might be in an inconsistent state.
  process.exit(1); // Exit after logging
});

// Start the server
startServer();

module.exports = server; // Export for testing or programmatic use if needed
