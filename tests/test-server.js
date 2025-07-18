const { app } = require('../src/app');
const { authenticateDB, syncModels, closeDB } = require('../src/infrastructure/database/postgres.connector');
const { redisAdapter } = require('../src/config/dependencies');
const http = require('http');

let server;

async function startServer() {
    await authenticateDB();
    await syncModels({ force: true });
    if (redisAdapter && typeof redisAdapter.initialize === 'function' && !redisAdapter.getClient()) {
        try {
            await redisAdapter.initialize();
            console.log('Redis initialized for tests.');
        } catch (err) {
            console.error('Failed to initialize Redis for tests:', err);
        }
    }
    return new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(() => {
            resolve(server);
        });
    });
}

async function closeServer() {
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }
    await closeDB();
    if (redisAdapter && typeof redisAdapter.close === 'function') {
        await redisAdapter.close();
    }
}

module.exports = {
    startServer,
    closeServer,
};
