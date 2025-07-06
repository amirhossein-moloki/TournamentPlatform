// src/infrastructure/database/repositories/postgres.tournament.repository.js
const TournamentRepositoryInterface = require('../../../domain/tournament/tournament.repository.interface');
const { TournamentStatus } = require('../../../domain/tournament/tournament.entity'); // For status checks
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');
// Removed direct model definitions and sequelize imports from here
// Models will be injected or imported from a central place.

/**
 * @implements {TournamentRepositoryInterface}
 */
class PostgresTournamentRepository extends TournamentRepositoryInterface {
  /**
   * @param {object} models - An object containing the Sequelize models.
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} models.TournamentModel
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} models.TournamentParticipantModel
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} [models.UserModel] - Optional, if needed for creator info
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} [models.GameModel] - Optional, for including game details
   */
  constructor(models) {
    super();
    if (!models || !models.TournamentModel || !models.TournamentParticipantModel) {
        throw new Error('Required models (TournamentModel, TournamentParticipantModel) not provided to PostgresTournamentRepository');
    }
    this.TournamentModel = models.TournamentModel;
    this.TournamentParticipantModel = models.TournamentParticipantModel;
    this.UserModel = models.UserModel;
    this.GameModel = models.GameModel; // Store GameModel
    this.sequelize = models.TournamentModel.sequelize;
    this.Op = this.sequelize.Op;
  }

  async create(tournamentEntity, options = {}) {
    try {
      const tournamentData = {
        name: tournamentEntity.name,
        gameId: tournamentEntity.gameId, // Changed from gameType to gameId
        description: tournamentEntity.description,
        status: tournamentEntity.status,
        maxParticipants: tournamentEntity.maxParticipants, // Changed from capacity
        entryFee: tournamentEntity.entryFee,
        prizePool: tournamentEntity.prizePool,
        startDate: tournamentEntity.startDate,
        endDate: tournamentEntity.endDate,
        rules: tournamentEntity.rules,
        bannerImageUrl: tournamentEntity.bannerImageUrl,
        organizerId: tournamentEntity.organizerId, // Changed from createdBy
        bracketType: tournamentEntity.bracketType,
        settings: tournamentEntity.settings,
      };
      if (tournamentEntity.id) tournamentData.id = tournamentEntity.id;

      const tournamentModelInstance = await this.TournamentModel.create(tournamentData, { transaction: options.transaction });
      // Assuming toDomainEntity can handle the new structure or is updated accordingly
      return tournamentModelInstance.toDomainEntity();
    } catch (error) {
      // logger.error('Error creating tournament in DB:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Error creating tournament: ${error.message}`);
    }
  }

  async findById(tournamentId, options = {}) { // options can include { includeGame: true, transaction: t }
    try {
      const queryOptions = {
        transaction: options.transaction,
        include: [],
      };

      if (options.includeGame && this.GameModel) {
        queryOptions.include.push({
          model: this.GameModel,
          as: 'game', // This 'as' must match the alias in TournamentModel.associate
        });
      }
      // Example: if (options.includeCreator && this.UserModel) {
      //   queryOptions.include.push({ model: this.UserModel, as: 'organizer' }); // Ensure alias matches
      // }

      const tournamentModelInstance = await this.TournamentModel.findByPk(tournamentId, queryOptions);

      // The toDomainEntity method should be updated to handle the included 'game' object
      // and potentially map it to a Game domain entity if not already handled by model's toJSON.
      return tournamentModelInstance ? tournamentModelInstance.toDomainEntity() : null;
    } catch (error) {
      // console.error(`Error in PostgresTournamentRepository.findById: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding tournament by ID: ${error.message}`);
    }
  }

  async updateById(tournamentId, updateData, options = {}) {
    try {
      const allowedUpdates = { ...updateData };
      delete allowedUpdates.currentParticipants;
      delete allowedUpdates.id;
      delete allowedUpdates.createdBy;

      const [updateCount] = await this.TournamentModel.update(allowedUpdates, {
        where: { id: tournamentId },
        transaction: options.transaction,
        returning: false,
      });

      if (updateCount === 0) {
        const exists = await this.TournamentModel.findByPk(tournamentId, { transaction: options.transaction, attributes: ['id'] });
        return exists ? this.findById(tournamentId, { transaction: options.transaction }) : null;
      }
      return this.findById(tournamentId, { transaction: options.transaction });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        // console.error(`Error in PostgresTournamentRepository.updateById: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error updating tournament: ${error.message}`);
    }
  }

  async deleteById(tournamentId, options = {}) {
    try {
      const deleteCount = await this.TournamentModel.destroy({
        where: { id: tournamentId },
        transaction: options.transaction,
      });
      return deleteCount > 0;
    } catch (error) {
        // console.error(`Error in PostgresTournamentRepository.deleteById: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error deleting tournament: ${error.message}`);
    }
  }

  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'startDate', sortOrder = 'ASC', includeGame = false, options = {} } = {}) {
    try {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const whereClause = {};
      if (filters.status) whereClause.status = filters.status;
      // if (filters.gameType) whereClause.gameType = { [this.Op.iLike]: `%${filters.gameType}%` }; // Old filter
      if (filters.gameId) whereClause.gameId = filters.gameId; // New filter by gameId
      if (filters.isRegistrationOpen) whereClause.status = TournamentStatus.REGISTRATION_OPEN;
      // Add more filters as needed

      const findOptions = {
        where: whereClause,
        limit: parseInt(limit, 10),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        transaction: options.transaction,
        include: []
      };

      if (includeGame && this.GameModel) {
        findOptions.include.push({
          model: this.GameModel,
          as: 'game', // Matches alias in TournamentModel
        });
      }
      // if (options.includeCreator && this.UserModel) {
      //   findOptions.include.push({ model: this.UserModel, as: 'organizer', attributes: ['id', 'username'] });
      // }

      const { count, rows } = await this.TournamentModel.findAndCountAll(findOptions);

      // toDomainEntity should handle included 'game' data
      return {
        tournaments: rows.map(model => model.toDomainEntity()),
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      };
    } catch (error) {
        // console.error(`Error in PostgresTournamentRepository.findAll: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding all tournaments: ${error.message}`);
    }
  }

  async addParticipant(tournamentId, participantId, participantType, options = {}) {
    const manageTransaction = !options.transaction;
    let t = options.transaction;

    if (manageTransaction) {
        t = await this.sequelize.transaction();
    }

    try {
      const tournament = await this.TournamentModel.findByPk(tournamentId, { transaction: t });
      if (!tournament) {
        if (manageTransaction && t) await t.rollback();
        throw new ApiError(httpStatus.NOT_FOUND, 'Tournament not found.');
      }
      if (tournament.currentParticipants >= tournament.capacity) {
        if (manageTransaction && t) await t.rollback();
        throw new ApiError(httpStatus.BAD_REQUEST, 'Tournament is full.');
      }
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN && tournament.status !== TournamentStatus.UPCOMING) { // Allow upcoming for pre-registration
        if (manageTransaction && t) await t.rollback();
        throw new ApiError(httpStatus.BAD_REQUEST, `Tournament registration is not open (status: ${tournament.status}).`);
      }

      const existingRegistration = await this.TournamentParticipantModel.findOne({
        where: { tournamentId, participantId, participantType },
        transaction: t,
      });
      if (existingRegistration) {
        if (manageTransaction && t) await t.rollback();
        throw new ApiError(httpStatus.CONFLICT, 'Participant already registered.');
      }

      const registrationData = {
        id: options.id, // Allow pre-defined ID for participant record if passed
        tournamentId,
        participantId,
        participantType,
        seed: options.seed,
        registeredAt: options.registeredAt || new Date(),
      };
      const participantRecord = await this.TournamentParticipantModel.create(registrationData, { transaction: t });
      await this.TournamentModel.increment('currentParticipants', { by: 1, where: { id: tournamentId }, transaction: t });

      if (manageTransaction && t) await t.commit();
      return this.TournamentParticipantModel.toDomainEntity(participantRecord);
    } catch (error) {
      if (manageTransaction && t && !t.finished) { // Check if t exists and not already finished
          await t.rollback();
      }
      if (error instanceof ApiError) throw error;
      if (error.name === 'SequelizeUniqueConstraintError') { // Example for specific error
        throw new ApiError(httpStatus.CONFLICT, 'Participant already registered for this tournament (unique constraint).');
      }
      // console.error(`Error in PostgresTournamentRepository.addParticipant: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error adding participant: ${error.message}`);
    }
  }

  async findParticipant(tournamentId, participantId, participantType, options = {}) {
    try {
      const participantRecord = await this.TournamentParticipantModel.findOne({
        where: { tournamentId, participantId, participantType },
        transaction: options.transaction,
      });
      return this.TournamentParticipantModel.toDomainEntity(participantRecord);
    } catch (error) {
        // console.error(`Error in PostgresTournamentRepository.findParticipant: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding participant: ${error.message}`);
    }
  }

  async removeParticipant(tournamentId, participantEntryId, options = {}) { // participantEntryId is the PK of TournamentParticipantModel
    const t = options.transaction || await this.sequelize.transaction();
    const manageTransaction = !options.transaction;

    try {
        const registration = await this.TournamentParticipantModel.findOne({
            where: { id: participantEntryId, tournamentId: tournamentId },
            transaction: t,
        });

        if (!registration) {
            if (manageTransaction && t) await t.rollback();
            throw new ApiError(httpStatus.NOT_FOUND, 'Participant registration not found for this tournament.');
        }

        await registration.destroy({ transaction: t });
        await this.TournamentModel.decrement('currentParticipants', { by: 1, where: { id: tournamentId }, transaction: t });

        if (manageTransaction && t) await t.commit();
        return true;
    } catch (error) {
        if (manageTransaction && t && !t.finished) {
            await t.rollback();
        }
        if (error instanceof ApiError) throw error;
        // console.error(`Error in PostgresTournamentRepository.removeParticipant: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error removing participant: ${error.message}`);
    }
  }

  async findParticipantsByTournamentId(tournamentId, options = {}) {
    try {
      const participants = await this.TournamentParticipantModel.findAll({
          where: { tournamentId },
          order: [['seed', 'ASC'], ['registeredAt', 'ASC']],
          transaction: options.transaction,
      });
      return participants.map(p => this.TournamentParticipantModel.toDomainEntity(p));
    } catch (error) {
        // console.error(`Error in PostgresTournamentRepository.findParticipantsByTournamentId: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding participants for tournament: ${error.message}`);
    }
  }

  async incrementParticipantCount(tournamentId, options = {}) {
    try {
      await this.TournamentModel.increment('currentParticipants', {
        by: 1,
        where: { id: tournamentId },
        transaction: options.transaction,
      });
      return true;
    } catch (error) {
      // console.error(`Error incrementing participant count: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error incrementing participant count: ${error.message}`);
    }
  }

  async decrementParticipantCount(tournamentId, options = {}) {
    try {
      await this.TournamentModel.decrement('currentParticipants', {
        by: 1,
        where: { id: tournamentId },
        transaction: options.transaction,
      });
      return true;
    } catch (error) {
      // console.error(`Error decrementing participant count: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error decrementing participant count: ${error.message}`);
    }
  }


  // Match methods removed - they are now in PostgresMatchRepository
}

module.exports = {
    PostgresTournamentRepository // Models should not be exported from repositories
};
```
