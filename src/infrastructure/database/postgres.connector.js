const { Sequelize, DataTypes } = require('sequelize');
const { appConfig } = require('../../../config/config');
const logger = require('../../utils/logger');

// Initialize Sequelize instance
// Configuration is sourced from appConfig.sequelize which is derived from environment variables
const sequelize = new Sequelize(
  appConfig.sequelize.database,
  appConfig.sequelize.username,
  appConfig.sequelize.password,
  {
    host: appConfig.sequelize.host,
    port: appConfig.sequelize.port,
    dialect: appConfig.sequelize.dialect, // Should be 'postgres'
    logging: appConfig.sequelize.logging ? (msg) => logger.debug(`[Sequelize] ${msg}`) : false, // Use Winston logger for SQL
    pool: { // Optional: configure connection pool
      max: 10, // Max number of connections in pool
      min: 0,  // Min number of connections in pool
      acquire: 30000, // Max time (ms) that pool will try to get connection before throwing error
      idle: 10000,    // Max time (ms) that a connection can be idle before being released
    },
    dialectOptions: {
      ...(appConfig.sequelize.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
      // statement_timeout: 5000, // Optional: timeout for SQL statements (ms)
      // idle_in_transaction_session_timeout: 10000, // Optional: timeout for idle transactions
    },
    define: { // Optional: global model definitions
      underscored: false, // Use camelCase for model attributes that map to underscored table columns if true
      freezeTableName: false, // If true, sequelize will not try to pluralize table names
      timestamps: true, // Automatically add createdAt and updatedAt fields
      // paranoid: true, // If true, calling destroy will not delete rows, but set a deletedAt column (soft delete)
    },
    // retry: { // Optional: configure retry logic for certain operations (if supported by dialect/version)
    //   max: 3, // Max number of retries
    //   match: [Sequelize.ConnectionError, Sequelize.TimeoutError], // Retry on these errors
    // },
  }
);

/**
 * Authenticates the database connection.
 * This function should be called at application startup to verify connectivity.
 * @returns {Promise<void>} Resolves if connection is successful, otherwise rejects.
 */
async function authenticateDB() {
  try {
    await sequelize.authenticate();
    logger.info(`Successfully connected to PostgreSQL database: ${appConfig.sequelize.database} on ${appConfig.sequelize.host}:${appConfig.sequelize.port}`);
  } catch (error) {
    logger.error('Unable to connect to the PostgreSQL database:', error);
    // Depending on policy, you might want to exit the process if DB connection fails at startup
    // process.exit(1);
    throw error; // Re-throw to allow server startup logic to handle it
  }
}

/**
 * Synchronizes all defined models with the database.
 * Creates tables if they don't exist. Can alter tables with { alter: true }.
 * Generally, migrations are preferred for schema management in production.
 * @param {object} [options={}] - Sequelize sync options (e.g., { force: true }, { alter: true }).
 * @returns {Promise<void>}
 */
async function syncModels(options = {}) {
  if (appConfig.env === 'production' && (options.force || options.alter)) {
    logger.warn('Database sync with "force: true" or "alter: true" is disabled in production environment for safety. Use migrations.');
    return;
  }
  try {
    await sequelize.sync(options);
    logger.info('Database models synchronized successfully.');
    if (options.force) logger.warn('Database synchronized with { force: true }. All tables were dropped and recreated.');
    if (options.alter) logger.warn('Database synchronized with { alter: true }. Tables were altered to match models.');
  } catch (error) {
    logger.error('Error synchronizing database models:', error);
    throw error;
  }
}

/**
 * Closes the database connection.
 * Should be called on application shutdown.
 * @returns {Promise<void>}
 */
async function closeDB() {
  try {
    await sequelize.close();
    logger.info('PostgreSQL database connection closed successfully.');
  } catch (error) {
    logger.error('Error closing PostgreSQL database connection:', error);
    // throw error; // Optional: re-throw if critical for shutdown sequence
  }
}

// Export the Sequelize instance and helper functions
module.exports = {
  sequelize,    // The Sequelize instance itself, for defining models and direct use
  DataTypes,    // Re-export DataTypes for convenience in model definitions
  authenticateDB,
  syncModels,
  closeDB,
};

// Model definitions will typically import `sequelize` and `DataTypes` from this file.
// Example Model (e.g., in a separate User.model.js file):
/*
const { sequelize, DataTypes } = require('./postgres.connector'); // Adjust path

const User = sequelize.define('User', {
  // attributes
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // ... other attributes
}, {
  // options
  tableName: 'Users', // Explicit table name
  timestamps: true,
});

module.exports = User;
*/

// This connector sets up Sequelize based on the centralized application config.
// It provides a way to authenticate, sync (primarily for dev/test), and close the connection.
// The main `sequelize` instance is exported for use throughout the infrastructure layer,
// particularly for defining models and creating repositories.
// Logging is configured to use the app's Winston logger for SQL queries in debug mode.
// Connection pooling and SSL are configured based on `appConfig`.
// Global model definition options like `timestamps: true` are set.
// `underscored: false` means Sequelize will expect camelCase model attributes to map to camelCase or exact match DB columns,
// unless individual column names are specified with `field: 'column_name'`.
// The blueprint's migration creates tables with camelCase names (e.g., `Users`, `Wallets`), so `freezeTableName: false` (default)
// or `freezeTableName: true` with explicit `tableName` in models would work.
// If table names were `users`, `wallets` (lowercase, plural), then `freezeTableName: false` would be fine.
// The migration uses PascalCase for table names. Sequelize's default behavior is to pluralize model names
// (e.g., User model -> users table). To match PascalCase table names from migration, models should specify `tableName`.
// Or, `freezeTableName: true` and model name matching table name.
// Given the migration `createTable('Users', ...)`:
// `sequelize.define('User', ...)` with default `freezeTableName: false` would look for `Users` table.
// `sequelize.define('User', ..., { tableName: 'Users' })` is more explicit.
// `sequelize.define('Users', ..., { freezeTableName: true })` would also work.
// The current global `define: { freezeTableName: false }` is the default.
// So, `sequelize.define('User', ...)` should correctly map to the `Users` table created by the migration.
// If not, `tableName: 'Users'` in model definitions would be necessary.
// Let's assume default behavior works or models will specify `tableName`.
// `underscored: false` means model `passwordHash` maps to column `passwordHash`. If column was `password_hash`, then `underscored: true` or `field: 'password_hash'` would be needed. The migration uses camelCase column names.
