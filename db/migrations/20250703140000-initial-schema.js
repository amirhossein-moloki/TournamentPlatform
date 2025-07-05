'use strict';

const { DataTypes, Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, sequelize) {
    // Users Table
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('User', 'Admin', 'DisputeModerator', 'FinanceManager'),
        allowNull: false,
        defaultValue: 'User',
      },
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isVerified: { // For email verification, etc.
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      lastLogin: {
        type: DataTypes.DATE,
      },
      verificationToken: { // For email verification or password reset
        type: DataTypes.STRING,
        allowNull: true,
      },
      tokenVersion: { // For JWT invalidation strategy
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Wallets Table
    await queryInterface.createTable('Wallets', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or 'SET NULL' if wallet should persist if user is deleted
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2), // Precision 10, Scale 2 (e.g., 12345678.90)
        allowNull: false,
        defaultValue: 0.00,
      },
      currency: {
        type: DataTypes.STRING(3), // E.g., "USD"
        allowNull: false,
        defaultValue: 'USD',
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('Wallets', ['userId'], { unique: true });


    // Transactions Table
    await queryInterface.createTable('Transactions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      walletId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: { // DEPOSIT, WITHDRAWAL, TOURNAMENT_FEE, PRIZE_PAYOUT, REFUND
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: { // PENDING, COMPLETED, FAILED, CANCELED, REQUIRES_APPROVAL
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      idempotencyKey: { // For preventing duplicate transactions
        type: DataTypes.STRING,
        allowNull: true, // Nullable for transactions not requiring it
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: { // JSONB for storing additional details (e.g., payment gateway response)
        type: DataTypes.JSONB,
        allowNull: true,
      },
      transactionDate: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('Transactions', ['walletId']);
    await queryInterface.addIndex('Transactions', ['type']);
    await queryInterface.addIndex('Transactions', ['status']);


    // Tournaments Table
    await queryInterface.createTable('Tournaments', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gameType: { // Renamed from gameName
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rules: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: { // Values from TournamentStatus domain enum; kept as STRING for flexibility
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UPCOMING', // Default status from domain
      },
      entryFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      prizePool: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      capacity: { // Added field
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      maxParticipants: { // Kept, as model might use 'capacity' as the limit
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currentParticipants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      organizerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      bannerImageUrl: { // Added field
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdBy: { // Added field
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      bracketType: { // Added field
        type: DataTypes.STRING, // Using STRING for ENUM for migration simplicity
        allowNull: false,
        defaultValue: 'SINGLE_ELIMINATION',
      },
      settings: { // Added field
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('Tournaments', ['status']);
    await queryInterface.addIndex('Tournaments', ['gameType']); // Changed from gameName


    // TournamentParticipants Table (Join table for Users and Tournaments)
    await queryInterface.createTable('TournamentParticipants', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      tournamentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Tournaments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      participantId: { // Renamed from userId
        type: DataTypes.UUID,
        allowNull: false,
        references: { // This FK might need to be more flexible or removed if participantType handles various entities
          model: 'Users', // Assuming only user participants for now based on original FK
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      participantType: { // Added field
        type: DataTypes.STRING,
        allowNull: false, // e.g., 'user', 'team'
      },
      registeredAt: { // Renamed from registrationDate
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      checkInStatus: { // Added field
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      seed: { // Added field
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: { // Kept status field
        type: DataTypes.STRING,
        defaultValue: 'REGISTERED',
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('TournamentParticipants', ['tournamentId', 'participantId', 'participantType'], { unique: true });
    await queryInterface.addIndex('TournamentParticipants', ['tournamentId']);
    await queryInterface.addIndex('TournamentParticipants', ['participantId']);


    // Matches Table
    await queryInterface.createTable('Matches', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      tournamentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Tournaments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      round: { // Renamed from roundNumber
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      matchNumberInRound: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      participant1Id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      participant1Type: { // Added field
        type: DataTypes.STRING,
        allowNull: true,
      },
      participant2Id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      participant2Type: { // Added field
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: { // Values from MatchStatus domain enum; kept as STRING
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING', // Default status from domain
      },
      scheduledTime: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      actualStartTime: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      actualEndTime: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      winnerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      winnerType: { // Added field
        type: DataTypes.STRING,
        allowNull: true,
      },
      participant1Score: { // Renamed from scoreParticipant1
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      participant2Score: { // Renamed from scoreParticipant2
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resultProofUrlP1: { // Renamed from resultScreenshotUrl
        type: DataTypes.STRING,
        allowNull: true,
      },
      resultProofUrlP2: { // Added field
        type: DataTypes.STRING,
        allowNull: true,
      },
      isConfirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      moderatorNotes: { // Added field
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextMatchId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      nextMatchLoserId: { // Added field
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      metadata: { // Added field
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('Matches', ['tournamentId']);
    await queryInterface.addIndex('Matches', ['status']);
    await queryInterface.addIndex('Matches', ['winnerId']);


    // AuditLogs Table
    await queryInterface.createTable('AuditLogs', {
      id: {
        allowNull: false,
        autoIncrement: true, // Or UUID if preferred
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      userId: { // User who performed the action (can be null for system actions)
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: { // E.g., 'USER_LOGIN', 'TOURNAMENT_CREATED', 'DISPUTE_RESOLVED'
        type: DataTypes.STRING,
        allowNull: false,
      },
      entity: { // E.g., 'User', 'Tournament', 'Match'
        type: DataTypes.STRING,
        allowNull: true,
      },
      entityId: { // ID of the affected entity
        type: DataTypes.STRING, // Or UUID if all entity IDs are UUIDs
        allowNull: true,
      },
      details: { // JSONB for storing details of the change or action
        type: DataTypes.JSONB,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      timestamp: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      // No `createdAt` or `updatedAt` for audit logs, `timestamp` is the key.
    });
    await queryInterface.addIndex('AuditLogs', ['userId']);
    await queryInterface.addIndex('AuditLogs', ['action']);
    await queryInterface.addIndex('AuditLogs', ['entity', 'entityId']);
    await queryInterface.addIndex('AuditLogs', ['timestamp']);


    // DisputeTickets Table
    await queryInterface.createTable('DisputeTickets', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      matchId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reporterId: { // User who reported the dispute
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: { // OPEN, UNDER_REVIEW, RESOLVED_PARTICIPANT1_WIN, RESOLVED_PARTICIPANT2_WIN, RESOLVED_REPLAY, CLOSED
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'OPEN',
      },
      resolutionDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      moderatorId: { // User (DisputeModerator) who handled the ticket
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('DisputeTickets', ['matchId'], { unique: true }); // Typically one dispute per match
    await queryInterface.addIndex('DisputeTickets', ['status']);
    await queryInterface.addIndex('DisputeTickets', ['moderatorId']);

    // Add more tables as needed: Teams, ChatMessages, Notifications, etc.
  },

  async down(queryInterface, sequelize) {
    // Drop tables in reverse order of creation due to foreign key constraints
    await queryInterface.dropTable('DisputeTickets');
    await queryInterface.dropTable('AuditLogs');
    await queryInterface.dropTable('Matches');
    await queryInterface.dropTable('TournamentParticipants');
    await queryInterface.dropTable('Tournaments');
    await queryInterface.dropTable('Transactions');
    await queryInterface.dropTable('Wallets');
    await queryInterface.dropTable('Users');
    // Drop any ENUM types if created with `queryInterface.createEnum`
    // await queryInterface.dropEnum('enum_Users_role'); // Example if enum was created separately
  },
};
