require('dotenv').config(); // Load environment variables from .env file

const http = require('http');
// const logger = require('./src/utils/logger'); // <-- Commented out to use console.log/error directly
const swaggerUi = require('swagger-ui-express');
const fs = require('fs'); // Import fs module
const path = require('path');
const { sequelize } = require('./src/infrastructure/database/postgres.connector');
const rabbitMQAdapter = require('./src/infrastructure/messaging/rabbitmq.adapter');
const { initialize: initializeRedis, getClient: getRedisClient } = require('./src/infrastructure/cache/redis.adapter'); // If Redis needs explicit init

const { initialize, getDependencies } = require('./src/config/dependencies');


const initializeSocketIO = require('./src/presentation/sockets');

const PORT = process.env.PORT || 3000;

// Swagger setup
const swaggerFilePath = path.join(__dirname, 'docs/swagger-generated.json');
const expressOasGenerator = require('express-oas-generator');

// --- Define helper connection functions ---
async function connectToDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        // Optional: Sync models if you're not using migrations or want to ensure tables exist
        // await sequelize.sync({ alter: process.env.NODE_ENV === 'development' }); // Use with caution in production
        // console.log('Database synchronized.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        console.error('Raw Error Object from connectToDatabase:', error);
        process.exit(1); // Exit if database connection fails
    }
}

async function connectToMessageQueue() {
    try {
        await rabbitMQAdapter.connect();
        console.log('Successfully connected to RabbitMQ.');
        // Initialize workers that depend on RabbitMQ connection
        // e.g., require('./src/workers/prize.distribution.worker').start();
        // require('./src/workers/dispute.resolution.worker').start();
        // require('./src/workers/file.scan.worker').start();
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        console.error('Raw Error Object from connectToMessageQueue:', error);
        process.exit(1); // Exit if RabbitMQ connection fails
    }
}

async function connectToCache() {
    try {
        const redisClient = await initializeRedis(); // Assuming initializeRedis returns a promise or is async
        console.log('Successfully connected to Redis.');
        // initializeDependencies(redisClient); // Moved to separate function initDependenciesAndCatch for clarity
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        console.error('Raw Error Object from connectToCache:', error);
        // Decide if Redis connection failure is critical enough to exit
        process.exit(1);
    }
}

// --- Main server start function ---
async function startServer() {
    try {
        console.log('Starting server initialization process...'); // <-- NEW LINE FOR DEBUGGING
        const app = require('./src/app');

        // Initialize Swagger before creating the server if expressOasGenerator needs the app instance
        expressOasGenerator.init(app, {});
        const swaggerFile = fs.readFileSync(swaggerFilePath, 'utf8');
        const swaggerDocument = JSON.parse(swaggerFile);
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        const server = http.createServer(app);

        // 1. Connect to Database
        console.log('Connecting to database...');
        await connectToDatabase();
        console.log('Database connection complete.');

        // 2. Connect to Cache (e.g., Redis)
        console.log('Connecting to Redis cache...');
        await connectToCache();
        console.log('Redis connection complete.');

        // --- اضافه شدن لاگ برای شروع initializeDependencies ---
        console.log('Initializing application dependencies...');
        const redisClient = getRedisClient();
        await initialize(redisClient);
        console.log('Application dependencies initialized.');

        // 3. Connect to Message Queue (e.g., RabbitMQ) and initialize workers
        console.log('Connecting to RabbitMQ...');
        await connectToMessageQueue();
        console.log('RabbitMQ connection complete.');

        // 4. Initialize routes
        console.log('Initializing API routes...');
        // --- اضافه شدن try...catch для createRoutes ---
        try {
            const createRoutes = require('./src/routes');
            app.use('/api/v1', createRoutes(getDependencies()));
            console.log('API routes initialized successfully.');
        } catch (error) {
            console.error('Failed to initialize API routes:', error);
            console.error('Raw Error Object from createRoutes:', error);
            console.error('Error details:', error ? error.message : 'No message available');
            console.error('Error stack:', error ? error.stack : 'No stack available');
            process.exit(1);
        }
        // --- پایان اضافه شدن ---


        // 5. Initialize Socket.IO
        console.log('Initializing Socket.IO...');
        initializeSocketIO(server); // Pass the HTTP server instance
        console.log('Socket.IO initialized.');

        // 6. Start the HTTP server
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`API available at ${process.env.API_BASE_URL || '/api/v1'}`);
            if (process.env.NODE_ENV === 'development') {
                console.log(`Swagger UI (if configured): http://localhost:${PORT}/api-docs`);
            }
        });

        // Graceful Shutdown
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        signals.forEach((signal) => {
            process.on(signal, async () => {
                console.log(`Received ${signal}, shutting down gracefully...`);
                try {
                    // 1. Close HTTP server
                    server.close(() => {
                        console.log('HTTP server closed.');
                    });

                    // 2. Close RabbitMQ connection
                    if (rabbitMQAdapter && typeof rabbitMQAdapter.close === 'function') {
                        await rabbitMQAdapter.close();
                        console.log('RabbitMQ connection closed.');
                    }

                    // 3. Close Database connection
                    if (sequelize && typeof sequelize.close === 'function') {
                        await sequelize.close();
                        console.log('Database connection closed.');
                    }

                    // 4. Close Redis connection (if applicable)
                    const redisClient = getRedisClient(); // Assuming getClient exists
                    if (redisClient && typeof redisClient.quit === 'function') {
                        await redisClient.quit();
                        console.log('Redis connection closed.');
                    }

                    console.log('Graceful shutdown complete.');
                    process.exit(0);
                } catch (error) {
                    console.error('Error during graceful shutdown:', error);
                    console.error('Raw Error Object during graceful shutdown:', error);
                    process.exit(1);
                }
            });
        });

    } catch (error) {
        console.error('Failed to start the server: An unexpected error occurred during server setup.');
        console.error('Raw Error Object from startServer catch:', error); // <-- جدید و مهم
        console.error('Error details:', error ? error.message : 'No message available');
        console.error('Error stack:', error ? error.stack : 'No stack available');
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('Raw Unhandled Rejection Reason:', reason);
    // Application specific logging, throwing an error, or other logic here
    // Optionally, shut down gracefully
    // process.exit(1); // Consider if this is too abrupt
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Raw Uncaught Exception Object:', error);
    console.error('Uncaught Exception details:', error ? error.message : 'No message available');
    console.error('Uncaught Exception stack:', error ? error.stack : 'No stack available');
    // Application specific logging
    // It's often recommended to shut down after an uncaught exception,
    // as the application might be in an inconsistent state.
    process.exit(1); // Exit after logging
});

// Start the server
startServer();

// You should not export 'server' here if it's defined inside 'startServer' and only
// becomes available after the server starts. If you need it for testing,
// you might need to refactor how 'server' is created or accessed.
// module.exports = server;