// src/infrastructure/database/models/index.js
const { sequelize } = require('../postgres.connector'); // Your Sequelize instance
const initGameModel = require('./game.model').default; // Import Game model definer
const defineTournamentModel = require('./tournament.model');
const defineMatchModel = require('./match.model');
const defineTournamentParticipantModel = require('./tournamentParticipant.model');
const defineUserModel = require('./user.model'); // Import UserModel definer
const initUserGameProfileModel = require('./userGameProfile.model').default; // Import UserGameProfile model definer
const defineWalletModel = require('./wallet.model'); // Import WalletModel definer
const defineTransactionModel = require('./transaction.model'); // Import TransactionModel definer
const defineDisputeTicketModel = require('./disputeTicket.model'); // Import DisputeTicketModel definer
const defineIdempotencyRequestModel = require('./idempotencyRequest.model'); // Import IdempotencyRequestModel definer

const db = {};

db.Sequelize = require('sequelize'); // Export Sequelize library itself if needed elsewhere
db.sequelize = sequelize; // Export configured instance

// Initialize models
db.GameModel = initGameModel(sequelize); // Initialize GameModel
db.TournamentModel = defineTournamentModel(sequelize);
db.MatchModel = defineMatchModel(sequelize);
db.TournamentParticipantModel = defineTournamentParticipantModel(sequelize);
db.UserModel = defineUserModel(sequelize); // Initialize UserModel
db.UserGameProfileModel = initUserGameProfileModel(sequelize); // Initialize UserGameProfileModel
db.WalletModel = defineWalletModel(sequelize); // Initialize WalletModel
db.TransactionModel = defineTransactionModel(sequelize); // Initialize TransactionModel
db.DisputeTicketModel = defineDisputeTicketModel(sequelize); // Initialize DisputeTicketModel
db.IdempotencyRequestModel = defineIdempotencyRequestModel(sequelize); // Initialize IdempotencyRequestModel

// Define associations
// Call associate method on each model if it exists
// This centralizes association definitions within the models themselves.

Object.keys(db).forEach(modelName => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// User <-> Tournament (Created By) - This should be defined in UserModel.associate and TournamentModel.associate
// db.UserModel.hasMany(db.TournamentModel, {
//   foreignKey: 'organizerId', // Assuming 'createdBy' was changed to 'organizerId'
//   as: 'createdTournaments',
//   onUpdate: 'CASCADE',
//   onDelete: 'SET NULL',
// });
// db.TournamentModel.belongsTo(db.UserModel, {
//   foreignKey: 'organizerId',
//   as: 'organizer',
// });


// Tournament <-> Match - This should be defined in TournamentModel.associate and MatchModel.associate
// db.TournamentModel.hasMany(db.MatchModel, {
//   foreignKey: { name: 'tournamentId', allowNull: false },
//   as: 'matches',
//   onDelete: 'CASCADE',
//   onUpdate: 'CASCADE',
// });
// db.MatchModel.belongsTo(db.TournamentModel, {
//   foreignKey: { name: 'tournamentId', allowNull: false },
//   as: 'tournament',
// });

// Match <-> Match (for nextMatchId, nextMatchLoserId)
// This should be defined in MatchModel.associate
db.MatchModel.belongsTo(db.MatchModel, {
    as: 'nextMatch',
    foreignKey: 'nextMatchId',
    targetKey: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});
db.MatchModel.belongsTo(db.MatchModel, {
    as: 'nextMatchLoser',
    foreignKey: 'nextMatchLoserId',
    targetKey: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

// Tournament <-> TournamentParticipant
db.TournamentModel.hasMany(db.TournamentParticipantModel, {
  foreignKey: { name: 'tournamentId', allowNull: false },
  as: 'tournamentParticipants',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
db.TournamentParticipantModel.belongsTo(db.TournamentModel, {
  foreignKey: { name: 'tournamentId', allowNull: false },
  as: 'tournament',
});

// User <-> Tournament (Created By) - Assuming UserModel is defined and available as db.UserModel
// This needs UserModel to be part of this centralized model system.
// For now, the 'references' in TournamentModel's createdBy column definition handles this at DB level.
// If UserModel is defined via this index.js:
// db.UserModel.hasMany(db.TournamentModel, { foreignKey: 'createdBy', as: 'createdTournaments' });
// db.TournamentModel.belongsTo(db.UserModel, { foreignKey: 'createdBy', as: 'creator' });


// Polymorphic associations for TournamentParticipant.participantId would typically be handled
// at the application/repository layer when querying, or by having separate join tables
// e.g., TournamentUserParticipant and TournamentTeamParticipant.
// Sequelize doesn't directly support polymorphic relations on the model level as cleanly as some other ORMs.
// The current structure with participantId and participantType is a common way to handle it.

// User <-> Wallet (One-to-One) - Moved to UserModel.associate
// db.UserModel.hasOne(db.WalletModel, {
//   foreignKey: { name: 'userId', allowNull: false, unique: true }, // Ensure userId is unique in Wallets
//   as: 'wallet',
//   onDelete: 'CASCADE', // If User is deleted, their Wallet is also deleted
//   onUpdate: 'CASCADE',
// });
// db.WalletModel.belongsTo(db.UserModel, {
//   foreignKey: { name: 'userId', allowNull: false },
//   as: 'user',
// });

// Wallet <-> Transaction (One-to-Many)
// This should be in WalletModel.associate and TransactionModel.associate
db.WalletModel.hasMany(db.TransactionModel, {
  foreignKey: { name: 'walletId', allowNull: false },
  as: 'transactions',
  onDelete: 'CASCADE', // If a Wallet is deleted, its Transactions are also deleted. Could be RESTRICT.
  onUpdate: 'CASCADE',
});
db.TransactionModel.belongsTo(db.WalletModel, {
  foreignKey: { name: 'walletId', allowNull: false },
  as: 'wallet',
});

// Match <-> DisputeTicket (One-to-One, as matchId is unique in DisputeTickets)
db.MatchModel.hasOne(db.DisputeTicketModel, {
  foreignKey: { name: 'matchId', allowNull: false, unique: true },
  as: 'disputeTicket',
  onDelete: 'CASCADE', // If Match is deleted, DisputeTicket is also deleted
  onUpdate: 'CASCADE',
});
db.DisputeTicketModel.belongsTo(db.MatchModel, {
  foreignKey: { name: 'matchId', allowNull: false },
  as: 'match',
});

// User <-> DisputeTicket (Reported By) - Moved to UserModel.associate and DisputeTicketModel.associate
// db.UserModel.hasMany(db.DisputeTicketModel, {
//   foreignKey: { name: 'reporterId', allowNull: false },
//   as: 'reportedDisputes',
//   onDelete: 'SET NULL',
//   onUpdate: 'CASCADE',
// });
// db.DisputeTicketModel.belongsTo(db.UserModel, {
//   foreignKey: { name: 'reporterId', allowNull: false },
//   as: 'reporter',
// });

// User <-> DisputeTicket (Moderated By) - Moved to UserModel.associate and DisputeTicketModel.associate
// db.UserModel.hasMany(db.DisputeTicketModel, {
//   foreignKey: { name: 'moderatorId', allowNull: true },
//   as: 'moderatedDisputes',
//   onDelete: 'SET NULL',
//   onUpdate: 'CASCADE',
// });
// db.DisputeTicketModel.belongsTo(db.UserModel, {
//   foreignKey: { name: 'moderatorId', allowNull: true },
//   as: 'moderator',
// });

// User <-> IdempotencyRequest (One-to-Many) - Moved to UserModel.associate and IdempotencyRequestModel.associate
// db.UserModel.hasMany(db.IdempotencyRequestModel, {
//   foreignKey: { name: 'userId', allowNull: false },
//   as: 'idempotencyRequests',
//   onDelete: 'CASCADE',
//   onUpdate: 'CASCADE',
// });
// db.IdempotencyRequestModel.belongsTo(db.UserModel, {
//   foreignKey: { name: 'userId', allowNull: false },
//   as: 'user',
// });

module.exports = db;
