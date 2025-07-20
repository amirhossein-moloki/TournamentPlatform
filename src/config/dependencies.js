// src/config/dependencies.js
const { initializeDependencies } = require('./dependency-injection');

let dependencies = {};

/**
 * Initializes the application dependencies.
 * This function should be called once at application startup.
 * @param {object} config - The application configuration object.
 * @param {object} redisClient - The Redis client instance.
 */
async function initialize(config, redisClient) {
  dependencies = initializeDependencies(config, redisClient);
}

/**
 * Returns the initialized dependencies.
 * @returns {object} The container with all application dependencies.
 */
function getDependencies() {
  if (Object.keys(dependencies).length === 0) {
    throw new Error('Dependencies have not been initialized. Please call initialize() first.');
  }
  return dependencies;
}

module.exports = {
  initialize,
  getDependencies,
};
