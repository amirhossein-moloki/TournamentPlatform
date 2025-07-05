// src/infrastructure/database/repositories/postgres.tournament.repository.js
const { Tournament, TournamentStatus, BracketType } = require('../../../domain/tournament/tournament.entity');
const { Match, MatchStatus } = require('../../../domain/tournament/match.entity'); // Assuming Match entity
const TournamentRepositoryInterface = require('../../../domain/tournament/tournament.repository.interface');
const { sequelize } = require('../postgres.connector');
const { DataTypes, Model, Op } = require('sequelize');
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
const { UserModel } = require('./postgres.user.repository'); // For createdBy association

// Define Sequelize Tournament Model
class TournamentModel extends Model {
  toDomainEntity() {
    return Tournament.fromPersistence(this.toJSON());
  }
}

TournamentModel.init({
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
  gameType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(TournamentStatus)),
    allowNull: false,
    defaultValue: TournamentStatus.UPCOMING,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  currentParticipants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
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
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rules: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bannerImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdBy: { // User ID of the creator/admin
    type: DataTypes.UUID,
    allowNull: true, // Or false if always required
    references: {
      model: 'Users', // Name of the Users table
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  bracketType: {
    type: DataTypes.ENUM(...Object.values(BracketType)),
    allowNull: false,
    defaultValue: BracketType.SINGLE_ELIMINATION,
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  // createdAt, updatedAt managed by Sequelize
}, {
  sequelize,
  modelName: 'Tournament',
  tableName: 'Tournaments',
  timestamps: true,
});

// Define Sequelize Match Model (if not already in a separate file)
// For simplicity, defining it here if it's tightly coupled or managed by TournamentRepo
// Ideally, Match would have its own repository and model file.
class MatchModel extends Model {
    toDomainEntity() {
        return Match.fromPersistence(this.toJSON());
    }
}
MatchModel.init({
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    tournamentId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Tournaments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    round: { type: DataTypes.INTEGER, allowNull: false },
    matchNumberInRound: { type: DataTypes.INTEGER },
    participant1Id: { type: DataTypes.UUID, allowNull: true }, // Could be User or Team ID
    participant1Type: { type: DataTypes.STRING, allowNull: true }, // 'user' or 'team'
    participant2Id: { type: DataTypes.UUID, allowNull: true },
    participant2Type: { type: DataTypes.STRING, allowNull: true },
    participant1Score: { type: DataTypes.INTEGER },
    participant2Score: { type: DataTypes.INTEGER },
    winnerId: { type: DataTypes.UUID },
    winnerType: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM(...Object.values(MatchStatus)), allowNull: false, defaultValue: MatchStatus.PENDING },
    scheduledTime: { type: DataTypes.DATE },
    actualStartTime: { type: DataTypes.DATE },
    actualEndTime: { type: DataTypes.DATE },
    resultProofUrlP1: { type: DataTypes.STRING },
    resultProofUrlP2: { type: DataTypes.STRING },
    moderatorNotes: { type: DataTypes.TEXT },
    nextMatchId: { type: DataTypes.UUID, references: { model: 'Matches', key: 'id' }, onDelete: 'SET NULL' },
    nextMatchLoserId: { type: DataTypes.UUID, references: { model: 'Matches', key: 'id' }, onDelete: 'SET NULL' },
    metadata: { type: DataTypes.JSONB },
}, { sequelize, modelName: 'Match', tableName: 'Matches', timestamps: true });

// Define TournamentParticipant Model (Join Table)
class TournamentParticipantModel extends Model {}
TournamentParticipantModel.init({
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    tournamentId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Tournaments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    participantId: { type: DataTypes.UUID, allowNull: false }, // User or Team ID
    participantType: { type: DataTypes.STRING, allowNull: false }, // 'user' or 'team'
    registeredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    checkInStatus: { type: DataTypes.BOOLEAN, defaultValue: false },
    seed: { type: DataTypes.INTEGER },
}, { sequelize, modelName: 'TournamentParticipant', tableName: 'TournamentParticipants', timestamps: true });


// Associations
TournamentModel.hasMany(MatchModel, { foreignKey: 'tournamentId', as: 'matches' });
MatchModel.belongsTo(TournamentModel, { foreignKey: 'tournamentId', as: 'tournament' });

TournamentModel.hasMany(TournamentParticipantModel, { foreignKey: 'tournamentId', as: 'tournamentParticipants' });
TournamentParticipantModel.belongsTo(TournamentModel, { foreignKey: 'tournamentId' });
// Note: participantId in TournamentParticipantModel is polymorphic.
// UserModel.hasMany(TournamentParticipantModel, { foreignKey: 'participantId', constraints: false, scope: { participantType: 'user' } });
// TeamModel.hasMany(TournamentParticipantModel, { foreignKey: 'participantId', constraints: false, scope: { participantType: 'team' } });


/**
 * @implements {TournamentRepositoryInterface}
 */
class PostgresTournamentRepository extends TournamentRepositoryInterface {
  constructor(tournamentModel, matchModel, tournamentParticipantModel) {
    super();
    this.TournamentModel = tournamentModel;
    this.MatchModel = matchModel; // For match-related operations
    this.TournamentParticipantModel = tournamentParticipantModel;
  }

  async create(tournamentEntity, options = {}) {
    try {
      const tournamentData = {
        name: tournamentEntity.name,
        gameType: tournamentEntity.gameType,
        description: tournamentEntity.description,
        status: tournamentEntity.status,
        capacity: tournamentEntity.capacity,
        entryFee: tournamentEntity.entryFee,
        prizePool: tournamentEntity.prizePool,
        startDate: tournamentEntity.startDate,
        endDate: tournamentEntity.endDate,
        rules: tournamentEntity.rules,
        bannerImageUrl: tournamentEntity.bannerImageUrl,
        createdBy: tournamentEntity.createdBy,
        bracketType: tournamentEntity.bracketType,
        settings: tournamentEntity.settings,
      };
      if (tournamentEntity.id) tournamentData.id = tournamentEntity.id;

      const tournamentModelInstance = await this.TournamentModel.create(tournamentData, { transaction: options.transaction });
      return tournamentModelInstance.toDomainEntity();
    } catch (error) {
      // logger.error('Error creating tournament in DB:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Error creating tournament: ${error.message}`);
    }
  }

  async findById(tournamentId, options = {}) {
    const tournamentModelInstance = await this.TournamentModel.findByPk(tournamentId, {
      transaction: options.transaction,
      // include: [{ model: UserModel, as: 'creator' }] // Example
    });
    return tournamentModelInstance ? tournamentModelInstance.toDomainEntity() : null;
  }

  async updateById(tournamentId, updateData, options = {}) {
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.currentParticipants;
    delete allowedUpdates.id;
    delete allowedUpdates.createdBy;

    const [updateCount] = await this.TournamentModel.update(allowedUpdates, {
      where: { id: tournamentId },
      transaction: options.transaction,
    });

    if (updateCount === 0) {
      return null;
    }
    // Re-fetch within the same transaction for consistency if needed, or just return based on update count.
    // For simplicity, if update succeeded, the caller might re-fetch if it needs the full updated entity.
    // Or, we fetch it here:
    return this.findById(tournamentId, { transaction: options.transaction });
  }

  async deleteById(tournamentId, options = {}) { // Added options for transaction
    const deleteCount = await this.TournamentModel.destroy({
      where: { id: tournamentId },
      transaction: options.transaction,
    });
    return deleteCount > 0;
  }

  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'startDate', sortOrder = 'ASC' } = {}) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = {};
    if (filters.status) whereClause.status = filters.status;
    if (filters.gameType) whereClause.gameType = { [Op.iLike]: `%${filters.gameType}%` };
    if (filters.isRegistrationOpen) whereClause.status = TournamentStatus.REGISTRATION_OPEN;
    // Add more filters as needed

    const { count, rows } = await this.TournamentModel.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      // include: [{ model: UserModel, as: 'creator', attributes: ['id', 'username'] }] // Example
    });

    return {
      tournaments: rows.map(model => model.toDomainEntity()),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  }

  async addParticipant(tournamentId, participantId, participantType, options = {}) {
    const manageTransaction = !options.transaction;
    const t = options.transaction || await sequelize.transaction();

    try {
      const tournament = await this.TournamentModel.findByPk(tournamentId, { transaction: t });
      if (!tournament) {
        if (manageTransaction) await t.rollback();
        throw new ApiError(httpStatus.NOT_FOUND, 'Tournament not found.');
      }
      if (tournament.currentParticipants >= tournament.capacity) {
        if (manageTransaction) await t.rollback();
        throw new ApiError(httpStatus.BAD_REQUEST, 'Tournament is full.');
      }
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        if (manageTransaction) await t.rollback();
        throw new ApiError(httpStatus.BAD_REQUEST, 'Tournament registration is not open.');
      }

      const existingRegistration = await this.TournamentParticipantModel.findOne({
        where: { tournamentId, participantId, participantType },
        transaction: t,
      });
      if (existingRegistration) {
        if (manageTransaction) await t.rollback();
        throw new ApiError(httpStatus.CONFLICT, 'Participant already registered.');
      }

      const registrationData = {
        id: options.id || undefined, // Allow pre-defined ID for participant record if passed
        tournamentId,
        participantId,
        participantType,
        seed: options.seed,
        registeredAt: options.registeredAt || new Date(),
      };
      const participantRecord = await this.TournamentParticipantModel.create(registrationData, { transaction: t });
      await this.TournamentModel.increment('currentParticipants', { by: 1, where: { id: tournamentId }, transaction: t });

      if (manageTransaction) await t.commit();
      return participantRecord.toJSON(); // Or map to a domain entity
    } catch (error) {
      if (manageTransaction) await t.rollback();
      throw error; // Re-throw error to be handled by the caller
    }
  }

  async findParticipant(tournamentId, participantId, participantType, options = {}) {
    const participantRecord = await this.TournamentParticipantModel.findOne({
      where: { tournamentId, participantId, participantType },
      transaction: options.transaction,
    });
    return participantRecord ? participantRecord.toJSON() : null; // Or map to domain entity
  }

  async removeParticipant(tournamentId, participantId) { // participantId here is the ID of the TournamentParticipant record
    const registration = await this.TournamentParticipantModel.findByPk(participantId); // Assuming participantId is the PK of the join table record
    if (!registration || registration.tournamentId !== tournamentId) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Participant registration not found for this tournament.');
    }

    return sequelize.transaction(async (t) => {
        await registration.destroy({ transaction: t });
        await this.TournamentModel.decrement('currentParticipants', { by: 1, where: { id: tournamentId }, transaction: t });
        return true;
    });
  }

  async findParticipantsByTournamentId(tournamentId) {
    const participants = await this.TournamentParticipantModel.findAll({
        where: { tournamentId },
        // Include User/Team model if you want to fetch their names etc.
        // This requires setting up polymorphic associations or querying separately.
        order: [['seed', 'ASC'], ['registeredAt', 'ASC']],
    });
    // This returns raw TournamentParticipant records. Mapping to a simpler structure might be needed.
    return participants.map(p => p.toJSON());
  }


  // Match methods
  async createMatch(matchEntity) {
    const matchData = { ...matchEntity }; // Spread to avoid modifying original
    delete matchData.id;

    if (matchEntity.id) matchData.id = matchEntity.id;

    const matchModelInstance = await this.MatchModel.create(matchData, { transaction: options.transaction });
    return matchModelInstance.toDomainEntity();
  }

  async createMatchesBulk(matchEntities, options = {}) {
    const matchDataArray = matchEntities.map(entity => {
        const data = { ...entity };
        // Ensure properties match model attributes for bulkCreate
        // Domain entity Match uses scoreParticipant1, model uses participant1Score
        // This mapping should occur here or before calling this method.
        // For now, assuming names are aligned or mapped before this call.
        if (data.scoreParticipant1 !== undefined) { data.participant1Score = data.scoreParticipant1; delete data.scoreParticipant1; }
        if (data.scoreParticipant2 !== undefined) { data.participant2Score = data.scoreParticipant2; delete data.scoreParticipant2; }
        if (data.resultScreenshotUrl !== undefined) { data.resultProofUrlP1 = data.resultScreenshotUrl; delete data.resultScreenshotUrl; }
        // Add other mappings if necessary for roundNumber vs round etc.
        // The Match entity was updated to align names, so direct spread might be okay now.
        // Re-check Match entity properties vs MatchModel attributes.
        // Match entity now has: participant1Score, participant2Score, resultProofUrlP1, resultProofUrlP2, round
        // MatchModel has: participant1Score, participant2Score, resultProofUrlP1, resultProofUrlP2, round
        // So names are aligned. Direct spread is fine.

        if (!entity.id) delete data.id;
        return data;
    });
    const matchModelInstances = await this.MatchModel.bulkCreate(matchDataArray, { transaction: options.transaction });
    return matchModelInstances.map(model => model.toDomainEntity());
  }

  async findMatchById(matchId, options = {}) {
    const matchModelInstance = await this.MatchModel.findByPk(matchId, { transaction: options.transaction });
    return matchModelInstance ? matchModelInstance.toDomainEntity() : null;
  }

  async updateMatchById(matchId, updateData, options = {}) {
    // Map domain property names to model attribute names if they differ
    const modelUpdateData = { ...updateData };
    if (modelUpdateData.scoreParticipant1 !== undefined) { modelUpdateData.participant1Score = modelUpdateData.scoreParticipant1; delete modelUpdateData.scoreParticipant1; }
    if (modelUpdateData.scoreParticipant2 !== undefined) { modelUpdateData.participant2Score = modelUpdateData.scoreParticipant2; delete modelUpdateData.scoreParticipant2; }
    if (modelUpdateData.resultScreenshotUrl !== undefined) { modelUpdateData.resultProofUrlP1 = modelUpdateData.resultScreenshotUrl; delete modelUpdateData.resultScreenshotUrl; }
    // Since Match entity was updated to align names, this mapping might be redundant.
    // If Match entity now has participant1Score, resultProofUrlP1, etc., direct updateData is fine.
    // The Match entity was indeed updated. So, direct use of updateData is fine.

    const [updateCount] = await this.MatchModel.update(updateData, { // Use updateData directly
      where: { id: matchId },
      transaction: options.transaction,
    });
    if (updateCount === 0) return null;
    return this.findMatchById(matchId, { transaction: options.transaction }); // Re-fetch in same transaction
  }

  async findMatchesByTournamentId(tournamentId, options = {}) {
    const whereClause = { tournamentId };
    if (options.round) whereClause.round = options.round;
    if (options.status) whereClause.status = options.status;
    // Add other filters from options if needed

    const matches = await this.MatchModel.findAll({
      where: whereClause,
      order: [['round', 'ASC'], ['matchNumberInRound', 'ASC'], ['createdAt', 'ASC']],
      transaction: options.transaction,
    });
    return matches.map(model => model.toDomainEntity());
  }
}

module.exports = {
    PostgresTournamentRepository,
    TournamentModel,
    MatchModel, // Exporting for potential direct use or testing
    TournamentParticipantModel
};
```
