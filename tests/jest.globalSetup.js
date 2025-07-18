const redisAdapter = require('../src/infrastructure/cache/redis.adapter');
const logger = require('../src/utils/logger'); // Optional: for logging setup status

module.exports = async () => {
  console.log('JEST GLOBAL SETUP SCRIPT --- EXECUTING'); // Direct console log
  try {
    logger.info('Jest globalSetup: Initializing Redis...');
    await redisAdapter.initialize();
    logger.info('Jest globalSetup: Redis initialized successfully.');
    console.log('JEST GLOBAL SETUP SCRIPT --- REDIS INITIALIZED'); // Direct console log
    // You can set global variables for tests here if needed
    // global.__REDIS_INITIALIZED__ = true;
  } catch (error) {
    logger.error('Jest globalSetup: Failed to initialize Redis:', error);
    console.error('JEST GLOBAL SETUP SCRIPT --- REDIS INITIALIZATION FAILED, CONTINUING WITHOUT IT...', error); // Direct console log
  }
};
