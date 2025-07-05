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

  async create(tournamentEntity) {
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

      const tournamentModelInstance = await this.TournamentModel.create(tournamentData);
      return tournamentModelInstance.toDomainEntity();
    } catch (error) {
      // logger.error('Error creating tournament in DB:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Error creating tournament: ${error.message}`);
    }
  }

  async findById(tournamentId) {
    const tournamentModelInstance = await this.TournamentModel.findByPk(tournamentId, {
      // include: [{ model: UserModel, as: 'creator' }] // Example if creator association is set up
    });
    return tournamentModelInstance ? tournamentModelInstance.toDomainEntity() : null;
  }

  async updateById(tournamentId, updateData) {
    // Be careful with what can be updated, e.g., currentParticipants should be managed by add/removeParticipant
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.currentParticipants; // Prevent direct update
    delete allowedUpdates.id; // Cannot update ID
    delete allowedUpdates.createdBy; // Cannot change creator

    const [updateCount] = await this.TournamentModel.update(allowedUpdates, {
      where: { id: tournamentId },
    });

    if (updateCount === 0) {
      return null; // Or throw ApiError(httpStatus.NOT_FOUND, 'Tournament not found');
    }
    return this.findById(tournamentId); // Re-fetch to get updated entity
  }

  async deleteById(tournamentId) {
    // Consider soft delete or cascading deletes for related entities (matches, participants)
    // This needs to be configured at DB level or handled here explicitly.
    const deleteCount = await this.TournamentModel.destroy({ where: { id: tournamentId } });
    return deleteCount > 0;
  }

  async findAll({ filters = {}, pagination = { limit: 10, offset: 0 }, sorting = { field: 'startDate', order: 'DESC' } } = {}) {
    const whereClause = {};
    if (filters.status) whereClause.status = filters.status;
    if (filters.gameType) whereClause.gameType = { [Op.iLike]: `%${filters.gameType}%` }; // Case-insensitive search
    if (filters.isRegistrationOpen) whereClause.status = TournamentStatus.REGISTRATION_OPEN;
    // Add more filters

    const { count, rows } = await this.TournamentModel.findAndCountAll({
      where: whereClause,
      limit: parseInt(pagination.limit, 10),
      offset: parseInt(pagination.offset, 10),
      order: [[sorting.field, sorting.order.toUpperCase()]],
      // include: [{ model: UserModel, as: 'creator', attributes: ['id', 'username'] }]
    });

    return {
      tournaments: rows.map(model => model.toDomainEntity()),
      total: count,
    };
  }

  async addParticipant(tournamentId, participantId, participantType, options = {}) {
    const tournament = await this.TournamentModel.findByPk(tournamentId);
    if (!tournament) throw new ApiError(httpStatus.NOT_FOUND, 'Tournament not found.');
    if (tournament.currentParticipants >= tournament.capacity) throw new ApiError(httpStatus.BAD_REQUEST, 'Tournament is full.');
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) throw new ApiError(httpStatus.BAD_REQUEST, 'Tournament registration is not open.');

    // Check if participant already registered
    const existingRegistration = await this.TournamentParticipantModel.findOne({
        where: { tournamentId, participantId, participantType }
    });
    if (existingRegistration) throw new ApiError(httpStatus.CONFLICT, 'Participant already registered.');


    return sequelize.transaction(async (t) => {
        const registrationData = {
            tournamentId,
            participantId,
            participantType,
            seed: options.seed,
        };
        const participantRecord = await this.TournamentParticipantModel.create(registrationData, { transaction: t });
        await this.TournamentModel.increment('currentParticipants', { by: 1, where: { id: tournamentId }, transaction: t });
        return participantRecord.toJSON(); // Or a domain entity if you have one for TournamentParticipant
    });
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
    delete matchData.id; // Let DB generate UUID or use defaultValue

    if (matchEntity.id) matchData.id = matchEntity.id; // Allow pre-defined ID

    const matchModelInstance = await this.MatchModel.create(matchData);
    return matchModelInstance.toDomainEntity();
  }

  async createMatchesBulk(matchEntities) {
    const matchDataArray = matchEntities.map(entity => {
        const data = { ...entity };
        if (!entity.id) delete data.id; // Use defaultValue UUID if no ID provided
        return data;
    });
    const matchModelInstances = await this.MatchModel.bulkCreate(matchDataArray);
    return matchModelInstances.map(model => model.toDomainEntity());
  }

  async findMatchById(matchId) {
    const matchModelInstance = await this.MatchModel.findByPk(matchId);
    return matchModelInstance ? matchModelInstance.toDomainEntity() : null;
  }

  async updateMatchById(matchId, updateData) {
    const [updateCount] = await this.MatchModel.update(updateData, {
      where: { id: matchId },
    });
    if (updateCount === 0) return null;
    return this.findMatchById(matchId);
  }

  async findMatchesByTournamentId(tournamentId, { round, status } = {}) {
    const whereClause = { tournamentId };
    if (round) whereClause.round = round;
    if (status) whereClause.status = status;

    const matches = await this.MatchModel.findAll({
      where: whereClause,
      order: [['round', 'ASC'], ['matchNumberInRound', 'ASC'], ['createdAt', 'ASC']],
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
