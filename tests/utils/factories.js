const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');

// Entities are required inside the factory functions to ensure they use the potentially modified versions.

const createUser = (overrides = {}) => {
  const { User } = require('../../src/domain/user/user.entity');
  const defaultUser = {
    id: uuidv4(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    passwordHash: 'testpasswordhash', // In a real scenario, ensure this is properly hashed if needed by entity
    roles: [User.UserRoles.PLAYER], // Default role as an array
    refreshToken: null,
    isVerified: true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    verificationToken: null,
    tokenVersion: 0,
  };

  const userData = { ...defaultUser, ...overrides };

  // Ensure roles is always an array and contains valid roles
  if (overrides.roles && Array.isArray(overrides.roles) && overrides.roles.length > 0) {
    userData.roles = [...new Set(overrides.roles.filter(r => Object.values(User.UserRoles).includes(r)))];
    if (userData.roles.length === 0) { // Fallback if all provided roles were invalid
        userData.roles = [User.UserRoles.PLAYER];
    }
  } else if (overrides.roles === null || (Array.isArray(overrides.roles) && overrides.roles.length === 0) ) {
    // If explicitly set to empty or null, ensure a default valid role
    userData.roles = [User.UserRoles.PLAYER];
  }


  return new User(
    userData.id,
    userData.username,
    userData.email,
    userData.passwordHash,
    userData.roles, // Pass the roles array
    userData.refreshToken,
    userData.isVerified,
    userData.lastLogin,
    userData.createdAt,
    userData.updatedAt,
    userData.verificationToken,
    userData.tokenVersion
  );
};

const createGame = (overrides = {}) => {
  const { Game } = require('../../src/domain/game/game.entity');
  const defaultGame = {
    id: uuidv4(),
    name: faker.commerce.productName() + ' Game',
    shortName: faker.lorem.slug(2),
    description: faker.lorem.sentence(),
    iconUrl: faker.image.url(),
    bannerUrl: faker.image.url(),
    platforms: [faker.helpers.arrayElement(['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile'])],
    supportedModes: [faker.helpers.arrayElement(['1v1', '2v2', 'Team Deathmatch', 'Battle Royale'])],
    isActive: true,
    winCondition: faker.helpers.arrayElement(['higher_score_wins', 'lower_score_wins', 'last_man_standing']),
    tournament_managers: [], // New field
    tournament_supports: [], // New field
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  // The Game entity constructor expects a single object argument.
  return new Game({ ...defaultGame, ...overrides });
};

const createTournament = (overrides = {}) => {
  const { Tournament } = require('../../src/domain/tournament/tournament.entity');
  const defaultTournament = {
    id: uuidv4(),
    name: faker.company.catchPhrase() + ' Championship',
    gameId: uuidv4(),
    description: faker.lorem.paragraph(),
    rules: faker.lorem.text(),
    status: Tournament.Status.PENDING,
    entryFee: parseFloat(faker.commerce.price({ min: 0, max: 100, dec: 0 })), // ensure whole number if currency is not fractional
    entryFeeType: Tournament.EntryFeeType.FREE, // New field
    prizePool: parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 0 })),
    prizeType: Tournament.PrizeType.NONE, // New field
    prizeDetails: null, // New field
    maxParticipants: faker.number.int({ min: 8, max: 128 }),
    currentParticipants: 0,
    startDate: faker.date.future({ years: 0.1 }),
    endDate: null,
    organizerId: null,
    managed_by: [], // New field
    supported_by: [], // New field
    entryConditions: {}, // New field
    bannerImageUrl: faker.image.url(),
    bracketType: Tournament.BracketType.SINGLE_ELIMINATION,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tournamentData = { ...defaultTournament, ...overrides };

  if (tournamentData.endDate && tournamentData.startDate && new Date(tournamentData.endDate) < new Date(tournamentData.startDate)) {
    tournamentData.endDate = new Date(new Date(tournamentData.startDate).getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
  }

  // Ensure entryFeeType and prizeType are valid if overridden
  if (overrides.entryFeeType && !Object.values(Tournament.EntryFeeType).includes(overrides.entryFeeType)) {
    tournamentData.entryFeeType = defaultTournament.entryFeeType; // fallback to default
  }
  if (overrides.prizeType && !Object.values(Tournament.PrizeType).includes(overrides.prizeType)) {
    tournamentData.prizeType = defaultTournament.prizeType; // fallback to default
  }
  if (tournamentData.entryFeeType === Tournament.EntryFeeType.FREE) {
    tournamentData.entryFee = 0; // Ensure entry fee is 0 if type is FREE
  }
  if (tournamentData.prizeType === Tournament.PrizeType.NONE) {
    tournamentData.prizePool = 0; // Ensure prize pool is 0 if type is NONE
    tournamentData.prizeDetails = null;
  }


  return new Tournament(
    tournamentData.id,
    tournamentData.name,
    tournamentData.gameId,
    tournamentData.description,
    tournamentData.rules,
    tournamentData.status,
    tournamentData.entryFee,
    tournamentData.entryFeeType, // Pass new field
    tournamentData.prizePool,
    tournamentData.prizeType,   // Pass new field
    tournamentData.prizeDetails, // Pass new field
    tournamentData.maxParticipants,
    tournamentData.currentParticipants,
    tournamentData.startDate,
    tournamentData.endDate,
    tournamentData.organizerId,
    tournamentData.managed_by,    // Pass new field
    tournamentData.supported_by,  // Pass new field
    tournamentData.entryConditions, // Pass new field
    tournamentData.createdAt,
    tournamentData.updatedAt,
    tournamentData.bannerImageUrl,
    tournamentData.bracketType,
    tournamentData.settings
  );
};

const createWallet = (overrides = {}) => {
  const { Wallet } = require('../../src/domain/wallet/wallet.entity');
  const defaultWallet = {
    id: uuidv4(),
    userId: uuidv4(),
    balance: parseFloat(faker.finance.amount({ min: 0, max: 1000, dec: 2 })),
    currency: 'USD',
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
  const { Transaction } = require('../../src/domain/wallet/transaction.entity');
  const defaultTransaction = {
    id: uuidv4(),
    walletId: uuidv4(),
    type: faker.helpers.arrayElement(Object.values(Transaction.TransactionTypes)),
    amount: parseFloat(faker.finance.amount({ min: 1, max: 100, dec: 2 })),
    status: faker.helpers.arrayElement(Object.values(Transaction.TransactionStatus)),
    description: faker.lorem.sentence(),
    referenceId: uuidv4(),
    referenceType: 'TOURNAMENT_REGISTRATION',
    metadata: {},
    transactionDate: new Date(),
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
    transactionData.transactionDate, // Ensure this is passed if constructor expects it
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
