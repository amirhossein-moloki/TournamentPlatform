const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  // For SQLite in-memory tests, we don't need to load from .env.test
} else if (process.env.NODE_ENV === 'development') {
  // Attempt to load .env.development, fallback to .env if it doesn't exist or isn't specified
  const devEnvPath = path.resolve(process.cwd(), '.env.development');
  const defaultEnvPath = path.resolve(process.cwd(), '.env');
  const fs = require('fs'); // require fs for checking file existence
  if (fs.existsSync(devEnvPath)) {
    dotenv.config({ path: devEnvPath });
  } else {
    dotenv.config({ path: defaultEnvPath }); // Load .env if .env.development is not found
  }
} else {
  dotenv.config(); // Loads .env by default (e.g., for production)
}

// Define validation schema for environment variables
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_BASE_URL: Joi.string().default('/api/v1'),

  DB_HOST: Joi.string().description('Database host'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().description('Database user'),
  DB_PASSWORD: Joi.string().description('Database password'),
  DB_NAME: Joi.string().description('Database name'),
  DB_SSL_ENABLED: Joi.boolean().default(false),
  DB_DIALECT: Joi.string().default('postgres'), // Added for Sequelize explicit config

  JWT_SECRET: Joi.string().description('JWT secret key'),
  JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('15m').description('Access token expiration'),
  JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d').description('Refresh token expiration'),
  JWT_REFRESH_COOKIE_NAME: Joi.string().default('jid'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TLS_ENABLED: Joi.boolean().default(false),

  RABBITMQ_URL: Joi.string().description('RabbitMQ connection string'),
  RABBITMQ_PRIZE_QUEUE: Joi.string().default('prize_payout_queue'),
  RABBITMQ_DISPUTE_QUEUE: Joi.string().default('dispute_resolution_queue'),
  RABBITMQ_FILE_SCAN_QUEUE: Joi.string().default('file_scan_queue'),

  PAYMENT_GATEWAY_API_KEY: Joi.string().description('Payment gateway API key'),
  PAYMENT_GATEWAY_WEBHOOK_SECRET: Joi.string().description('Payment gateway webhook secret'),

  AWS_ACCESS_KEY_ID: Joi.string().description('AWS Access Key ID'),
  AWS_SECRET_ACCESS_KEY: Joi.string().description('AWS Secret Access Key'),
  AWS_REGION: Joi.string().description('AWS Region'),
  AWS_S3_BUCKET_NAME: Joi.string().description('AWS S3 Bucket Name'),
  AWS_S3_SIGNED_URL_EXPIRATION: Joi.number().default(300),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly').default('info'),
  LOG_FILE_PATH: Joi.string().default('logs/app.log'),
  LOG_ERROR_FILE_PATH: Joi.string().default('logs/error.log'),

  ADMIN_EMAIL: Joi.string().email().description('Default admin email for seeder'),
  ADMIN_PASSWORD: Joi.string().description('Default admin password for seeder'),

  RATE_LIMIT_WINDOW_MS: Joi.any(),
  RATE_LIMIT_MAX_REQUESTS: Joi.any(),

  CORS_ORIGIN: Joi.string().default('*'),
  IDEMPOTENCY_KEY_HEADER: Joi.string().default('X-Idempotency-Key'),

  // Email Service Configuration
  EMAIL_SERVICE_PROVIDER: Joi.string().valid('SES', 'SENDGRID', 'CONSOLE').default('CONSOLE'),
  EMAIL_SENDER_ADDRESS: Joi.string().email().when('EMAIL_SERVICE_PROVIDER', {
    is: Joi.string().valid('SES', 'SENDGRID'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).description('Sender email address for system emails'),
  SENDGRID_API_KEY: Joi.string().when('EMAIL_SERVICE_PROVIDER', {
    is: 'SENDGRID',
    then: Joi.required(),
    otherwise: Joi.string().allow('').optional(),
  }).description('SendGrid API Key'),
  // AWS_SES_REGION: Joi.string().when('EMAIL_SERVICE_PROVIDER', { // Covered by AWS_REGION if SES is used in same region
  //   is: 'SES',
  //   then: Joi.required(), // Or default to AWS_REGION
  //   otherwise: Joi.optional(),
  // }).description('AWS SES Region (if different from general AWS_REGION)'),

  ZARINPAL_MERCHANT_ID: Joi.string().description('Zarinpal Merchant ID'),
  ZARINPAL_ACCESS_TOKEN: Joi.string().optional().description('Zarinpal Access Token for refunds etc.'),


  SEQUELIZE_LOGGING: Joi.boolean().when('NODE_ENV', {
    is: 'development',
    then: Joi.boolean().default(true), // Log SQL in development
    otherwise: Joi.boolean().default(false), // Don't log SQL in production/test unless explicitly set
  }),

}).unknown(); // Allow other environment variables not defined in the schema

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  apiBaseUrl: envVars.API_BASE_URL,
  appName: 'TournamentPlatform', // Or load from package.json

  sequelize: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    username: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_NAME,
    dialect: envVars.DB_DIALECT,
    ssl: envVars.DB_SSL_ENABLED,
    dialectOptions: envVars.DB_SSL_ENABLED ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    logging: envVars.SEQUELIZE_LOGGING ? console.log : false, // Standard Sequelize logging
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpiration: envVars.JWT_ACCESS_TOKEN_EXPIRATION,
    refreshExpiration: envVars.JWT_REFRESH_TOKEN_EXPIRATION,
    refreshCookieName: envVars.JWT_REFRESH_COOKIE_NAME,
  },

  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined, // Redis client expects undefined if no password
    tls: envVars.REDIS_TLS_ENABLED ? {} : undefined, // Basic TLS config, can be extended
  },

  rabbitmq: {
    url: envVars.RABBITMQ_URL,
    queues: {
      prizePayout: envVars.RABBITMQ_PRIZE_QUEUE,
      disputeResolution: envVars.RABBITMQ_DISPUTE_QUEUE,
      fileScan: envVars.RABBITMQ_FILE_SCAN_QUEUE,
    },
  },

  paymentGateway: {
    apiKey: envVars.PAYMENT_GATEWAY_API_KEY,
    webhookSecret: envVars.PAYMENT_GATEWAY_WEBHOOK_SECRET,
  },

  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3: {
      bucketName: envVars.AWS_S3_BUCKET_NAME,
      signedUrlExpiration: envVars.AWS_S3_SIGNED_URL_EXPIRATION,
    },
  },

  logging: {
    level: envVars.LOG_LEVEL,
    filePath: envVars.LOG_FILE_PATH,
    errorFilePath: envVars.LOG_ERROR_FILE_PATH,
  },

  admin: {
    email: envVars.ADMIN_EMAIL,
    password: envVars.ADMIN_PASSWORD,
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX_REQUESTS,
  },

  cors: {
    origin: envVars.CORS_ORIGIN, // Can be a string or array of origins, or a function
  },

  idempotencyKeyHeader: envVars.IDEMPOTENCY_KEY_HEADER,

  email: {
    provider: envVars.EMAIL_SERVICE_PROVIDER,
    senderAddress: envVars.EMAIL_SENDER_ADDRESS,
    sendgridApiKey: envVars.SENDGRID_API_KEY,
    // sesRegion: envVars.AWS_SES_REGION, // Link to aws.region or define separately if needed
  },

  zarinpal: {
    merchantId: envVars.ZARINPAL_MERCHANT_ID,
    accessToken: envVars.ZARINPAL_ACCESS_TOKEN, // Will be undefined if not set, which is fine
  },
};

// This structure is often used for Sequelize CLI, which expects configurations
// per environment directly.
module.exports.development = {
    username: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_NAME,
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    dialect: 'postgres',
    logging: console.log,
};
module.exports.test = {
  dialect: 'sqlite',
  storage: './test.sqlite',
  logging: false,
};
module.exports.production = {
    username: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_NAME,
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    dialect: 'postgres',
    logging: false,
};

// Export the main config object for application use
module.exports.appConfig = config;

// Default export for convenience if only one config object is typically imported
// module.exports = config; // Or module.exports = appConfig;
// For clarity, sticking with named exports for Sequelize CLI and appConfig.
// If a single default export is preferred, choose `appConfig`.
// For now, `appConfig` is the primary export for application use.
// The `development`, `test`, `production` exports are specifically for Sequelize CLI.
// Consider renaming `appConfig` to `default` or just `config` if it's the main export.
// Let's keep `appConfig` for clarity.
// `module.exports = { development: ..., test: ..., production: ..., appConfig: ...}` is also an option.
// To ensure Sequelize CLI works, the environment keys (development, test, production) must be top-level.
// The `appConfig` object will be used by the application itself.
// This setup is common when using Sequelize CLI with a centralized config file.
// If sequelize-cli is configured to use a different config file (e.g. .sequelizerc points to this), it will work.
// Otherwise, you might need a separate `database.js` or `config/database.json` for Sequelize CLI.
// Assuming Sequelize CLI will use this file.
// The blueprint mentions `config/config.js` for Sequelize, so this structure is appropriate.
// The top-level exports `development`, `test`, `production` are for Sequelize CLI.
// The `appConfig` object is for the application's internal use.
// This means `require('./config/config.js').appConfig` will get the application settings.
// And Sequelize CLI will find `require('./config/config.js').development` (or test/production).
// This is a standard way to structure it.
