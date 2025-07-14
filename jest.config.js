module.exports = {
  clearMocks: true,
  coverageProvider: "v8", // or "babel"
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js', // Example: exclude main app setup if not directly testable
    '!src/server.js', // Example: exclude server entry point
    '!src/config/**',
    '!src/infrastructure/database/postgres.connector.js', // DB connector
    '!src/infrastructure/logging/**', // Logging setup
    '!src/infrastructure/messaging/rabbitmq.adapter.js', // Example: external adapters
    '!src/infrastructure/cache/redis.adapter.js', // Example: external adapters
    '!**/node_modules/**',
    '!**/vendor/**',
    '!src/domain/**/*.interface.js', // Exclude interfaces
    '!src/application/services/email.service.interface.js', // Exclude interface
  ],
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ],
  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    "json",
    "text",
    "lcov",
    "clover"
  ],
  // An object that configures minimum threshold enforcement for coverage results
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: -10
  //   }
  // },
  // A path to a module which exports an async function that is triggered once before all test suites
  globalSetup: '<rootDir>/tests/jest.globalSetup.js',
  // A path to a module which exports an async function that is triggered once after all test suites
  globalTeardown: '<rootDir>/tests/jest.globalTeardown.js',
  // A set of global variables that need to be available in all test environments
  // globals: {},
  // The maximum number of workers used to run your tests. Can be specified as % or a number. E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the max worker number. maxWorkers: 2 will use a maximum of 2 workers.
  // maxWorkers: "50%",
  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: [
    "node_modules",
    "src"
  ],
  // An array of file extensions your modules use
  moduleFileExtensions: [
    "js",
    "json",
    "jsx",
    "ts",
    "tsx",
    "node"
  ],
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  // modulePathIgnorePatterns: [],
  // Activates notifications for test results
  // notify: false,
  // An array of regexp pattern strings that are matched against all test paths before executing the test
  // testPathIgnorePatterns: [
  //   "/node_modules/"
  // ],
  // The directory where Jest should store its cached dependency information
  // cacheDirectory: "/tmp/jest_rs",

  // Default is 'node'
  testEnvironment: "node",

  // The glob patterns Jest uses to detect test files.
  // This will prevent Jest from trying to run files in config/environments/ as tests.
  roots: [
    "<rootDir>/tests"
  ],
  // Alternatively, be more specific with testMatch:
  // testMatch: [
  //   "<rootDir>/tests/**/*.test.js",
  //   "<rootDir>/tests/**/*.spec.js",
  //   // You can add patterns for tests within src if that's your convention
  //   // e.g., "<rootDir>/src/**/__tests__/**/*.[jt]s?(x)",
  //   // "<rootDir>/src/**/?(*.)+(spec|test).[tj]s?(x)"
  // ],

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Automatically reset mock state before every test
  resetMocks: true,

  // Automatically restore mock state and implementation before every test
  restoreMocks: true,

  // Setup files after env
  // setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'], // if you have one
};
