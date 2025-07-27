const { exec } = require('child_process');
const { initialize } = require('../src/config/dependencies');
const redisAdapter = require('../src/infrastructure/cache/redis.adapter');

module.exports = async () => {
  console.log('JEST GLOBAL SETUP SCRIPT --- EXECUTING');

  // Start the database
  await new Promise((resolve, reject) => {
    exec('docker-compose -f docker-compose.test.yml up -d', (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to start the database:', stderr);
        return reject(err);
      }
      console.log(stdout);
      resolve();
    });
  });

  // Wait for the database to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Run migrations
  await new Promise((resolve, reject) => {
    exec('npx sequelize-cli db:migrate --env test', (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to run migrations:', stderr);
        return reject(err);
      }
      console.log(stdout);
      resolve();
    });
  });

  // Initialize Redis
  await redisAdapter.initialize();

  // Initialize dependencies
  await initialize(redisAdapter.client);
};
