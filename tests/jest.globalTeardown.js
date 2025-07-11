const redisAdapter = require('../src/infrastructure/cache/redis.adapter');
const logger = require('../src/utils/logger'); // Optional: for logging teardown status

module.exports = async () => {
  console.log('JEST GLOBAL TEARDOWN SCRIPT --- EXECUTING'); // Direct console log
  try {
    logger.info('Jest globalTeardown: Closing Redis connection...');
    await redisAdapter.close();
    logger.info('Jest globalTeardown: Redis connection closed successfully.');
    console.log('JEST GLOBAL TEARDOWN SCRIPT --- REDIS CONNECTION CLOSED'); // Direct console log
    // Clean up any global variables if set in setup
    // delete global.__REDIS_INITIALIZED__;
  } catch (error) {
    logger.error('Jest globalTeardown: Failed to close Redis connection:', error);
    console.error('JEST GLOBAL TEARDOWN SCRIPT --- REDIS CLOSE FAILED:', error); // Direct console log
    // process.exit(1); // Optionally exit if clean shutdown is critical
  }
};
