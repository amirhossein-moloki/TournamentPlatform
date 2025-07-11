const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
// Entities will be required inside the factory functions

const createUser = (overrides = {}) => {
  const { User } = require('../../src/domain/user/user.entity'); // Moved import here
  const defaultUser = {
    id: uuidv4(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    // In tests, we often pass the plain password and let the use case/service handle hashing
    // For creating User entity directly, if it expects a hash, this should be a hash.
    // Assuming the User entity constructor in the test context can take a plain password
    // or the test is for scenarios where password hash is already managed.
    // If User entity's constructor strictly needs passwordHash, then a hash should be provided.
    passwordHash: 'testpasswordhash', // Or use faker.internet.password() if entity handles hashing
    role: 'PLAYER', // Using string literal for enum
    status: 'ACTIVE',  // Using string literal for enum
    emailVerified: true,
    profile: { // Add default profile object as per User entity structure
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        bio: faker.lorem.sentence(),
        avatarUrl: faker.image.avatar(),
        country: faker.location.countryCode(),
        socialLinks: {},
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockoutUntil: null,
  };
  // Create a new object for the user data to avoid modifying defaultUser
  const userData = { ...defaultUser, ...overrides };
  // If overrides contain profile, merge it with defaultUser.profile
  if (overrides.profile) {
    userData.profile = { ...defaultUser.profile, ...overrides.profile };
  }

  return new User(
    userData.id,
    userData.username,
    userData.email,
    userData.passwordHash, // Ensure this is what User constructor expects
    userData.role,
    userData.status,
    userData.profile,
    userData.emailVerified,
    userData.createdAt,
    userData.updatedAt,
    userData.lastLoginAt,
    userData.failedLoginAttempts,
    userData.lockoutUntil
  );
};

const createGame = (overrides = {}) => {
  const { Game } = require('../../src/domain/game/game.entity'); // Moved import here
  const defaultGame = {
    id: uuidv4(),
    name: faker.commerce.productName() + ' Game',
    description: faker.lorem.sentence(),
    genre: faker.music.genre(),
    platform: ['PC', 'PlayStation', 'Xbox'][faker.number.int({ min: 0, max: 2 })],
    releaseDate: faker.date.past(),
    developer: faker.company.name(),
    publisher: faker.company.name(),
    bannerImageUrl: faker.image.url(),
    tags: [faker.lorem.word(), faker.lorem.word()],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  // The Game entity constructor expects a single object argument.
  return new Game({ ...defaultGame, ...overrides });
};

const createTournament = (overrides = {}) => {
  const { Tournament } = require('../../src/domain/tournament/tournament.entity'); // Moved import here
  const defaultTournament = {
    id: uuidv4(),
    name: faker.company.catchPhrase() + ' Championship',
    gameId: uuidv4(), // This should ideally be an existing game's ID
    description: faker.lorem.paragraph(),
    rules: faker.lorem.text(),
    status: 'PENDING', // Using string literal for enum
    entryFee: parseFloat(faker.commerce.price({ min: 0, max: 100, dec: 2 })),
    prizePool: parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 })),
    maxParticipants: faker.number.int({ min: 8, max: 128 }),
    currentParticipants: 0,
    startDate: faker.date.future({ years: 0.1 }),
    endDate: null,
    organizerId: null, // Can be overridden with a user ID
    bannerImageUrl: faker.image.url(),
    bracketType: 'SINGLE_ELIMINATION', // Using string literal for enum
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tournamentData = { ...defaultTournament, ...overrides };
  // Ensure endDate is after startDate if both are provided
  if (tournamentData.endDate && tournamentData.startDate && new Date(tournamentData.endDate) < new Date(tournamentData.startDate)) {
    tournamentData.endDate = new Date(new Date(tournamentData.startDate).getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
  }
  return new Tournament(
    tournamentData.id,
    tournamentData.name,
    tournamentData.gameId,
    tournamentData.description,
    tournamentData.rules,
    tournamentData.status,
    tournamentData.entryFee,
    tournamentData.prizePool,
    tournamentData.maxParticipants,
    tournamentData.currentParticipants,
    tournamentData.startDate,
    tournamentData.endDate,
    tournamentData.organizerId,
    tournamentData.createdAt,
    tournamentData.updatedAt,
    [], // participants
    [], // matches
    tournamentData.bannerImageUrl,
    tournamentData.bracketType,
    tournamentData.settings
  );
};

module.exports = {
  createUser,
  createGame,
  createTournament,
  faker, // Export faker itself for convenience in tests
};

const createWallet = (overrides = {}) => {
  const { Wallet } = require('../../src/domain/wallet/wallet.entity'); // Moved import here
  const defaultWallet = {
    id: uuidv4(),
    userId: uuidv4(), // Should be overridden with a real user's ID in tests
    balance: parseFloat(faker.finance.amount({ min: 0, max: 1000, dec: 2 })),
    currency: 'USD', // Or your default currency
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const walletData = { ...defaultWallet, ...overrides };
  return new Wallet(
    walletData.id,
    walletData.userId,
    walletData.balance,
    walletData.currency,
    walletData.createdAt,
    walletData.updatedAt
  );
};

const createTransaction = (overrides = {}) => {
  const { Transaction } = require('../../src/domain/wallet/transaction.entity'); // Moved import here
  const defaultTransaction = {
    id: uuidv4(),
    walletId: uuidv4(), // Should be overridden with a real wallet's ID
    type: ['DEBIT', 'CREDIT'][faker.number.int({ min: 0, max: 1 })], // Using string literals
    amount: parseFloat(faker.finance.amount({ min: 1, max: 100, dec: 2 })),
    status: 'COMPLETED', // Using string literal
    description: faker.lorem.sentence(),
    referenceId: uuidv4(),
    referenceType: 'TOURNAMENT_REGISTRATION', // Example
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const transactionData = { ...defaultTransaction, ...overrides };
  return new Transaction(
    transactionData.id,
    transactionData.walletId,
    transactionData.type,
    transactionData.amount,
    transactionData.status,
    transactionData.description,
    transactionData.referenceId,
    transactionData.referenceType,
    transactionData.metadata,
    transactionData.createdAt,
    transactionData.updatedAt
  );
};

module.exports = {
  createUser,
  createGame,
  createTournament,
  createWallet,
  createTransaction,
  faker,
};
