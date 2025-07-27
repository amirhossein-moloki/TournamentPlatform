const { exec } = require('child_process');
const redisAdapter = require('../src/infrastructure/cache/redis.adapter');

module.exports = async () => {
  console.log('JEST GLOBAL TEARDOWN SCRIPT --- EXECUTING');

  // Stop the database
  await new Promise((resolve, reject) => {
    exec('docker-compose -f docker-compose.test.yml down', (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to stop the database:', stderr);
        return reject(err);
      }
      console.log(stdout);
      resolve();
    });
  });

  // Disconnect from Redis
  await redisAdapter.disconnect();
};
