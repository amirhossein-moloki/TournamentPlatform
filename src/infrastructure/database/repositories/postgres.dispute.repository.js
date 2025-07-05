// const { sequelize, DataTypes, Op } = require('../postgres.connector'); // No longer needed
// const { DisputeTicket } = require('../../../domain/dispute/dispute.entity'); // For static values like Status
const DisputeRepositoryInterface = require('../../../domain/dispute/dispute.repository.interface');
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');


class PostgresDisputeRepository extends DisputeRepositoryInterface {
  /**
   * @param {object} models - An object containing the Sequelize models.
   * @param {import('sequelize').ModelCtor<import('sequelize').Model> & { toDomainEntity: Function }} models.DisputeTicketModel
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} [models.UserModel]
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} [models.MatchModel]
   */
  constructor(models) {
    super();
    if (!models || !models.DisputeTicketModel || typeof models.DisputeTicketModel.toDomainEntity !== 'function') {
        throw new Error('Required models.DisputeTicketModel with toDomainEntity method not provided to PostgresDisputeRepository');
    }
    this.DisputeTicketModel = models.DisputeTicketModel;
    this.UserModel = models.UserModel; // For includes
    this.MatchModel = models.MatchModel; // For includes
    this.sequelize = models.DisputeTicketModel.sequelize;
    this.Op = this.sequelize.Op;
  }

  // _toDomainEntity is now a static method on the injected DisputeTicketModel

  _toPersistence(disputeEntity) {
    // This helper can remain if it simplifies mapping from domain to persistence data
    // Alternatively, the domain entity could have a toPersistenceObject() method.
    const data = {
        id: disputeEntity.id,
        matchId: disputeEntity.matchId,
        reporterId: disputeEntity.reporterId,
        reason: disputeEntity.reason,
        status: disputeEntity.status,
        resolutionDetails: disputeEntity.resolutionDetails,
        moderatorId: disputeEntity.moderatorId,
    };
    if (!data.id) delete data.id; // Let DB default handle if not provided by entity
    return data;
  }

  async findById(id, options = {}) {
    try {
      const queryOptions = { transaction: options.transaction };
      // if (options.includeReporter && this.UserModel) queryOptions.include = [{ model: this.UserModel, as: 'reporter' }];
      // if (options.includeModerator && this.UserModel) queryOptions.include.push({ model: this.UserModel, as: 'moderator' });
      // if (options.includeMatch && this.MatchModel) queryOptions.include.push({ model: this.MatchModel, as: 'match' });

      const modelInstance = await this.DisputeTicketModel.findByPk(id, queryOptions);
      return this.DisputeTicketModel.toDomainEntity(modelInstance);
    } catch (error) {
      // console.error(`Error in PostgresDisputeRepository.findById: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding dispute by ID: ${error.message}`);
    }
  }

  async findByMatchId(matchId, options = {}) {
    try {
      const queryOptions = { where: { matchId }, transaction: options.transaction };
      // Add includes similar to findById if needed
      const modelInstance = await this.DisputeTicketModel.findOne(queryOptions);
      return this.DisputeTicketModel.toDomainEntity(modelInstance);
    } catch (error) {
      // console.error(`Error in PostgresDisputeRepository.findByMatchId: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding dispute by match ID: ${error.message}`);
    }
  }

  async create(disputeEntity, options = {}) {
    const persistenceData = this._toPersistence(disputeEntity);
    try {
        const modelInstance = await this.DisputeTicketModel.create(persistenceData, {
          transaction: options.transaction,
        });
        return this.DisputeTicketModel.toDomainEntity(modelInstance);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.fields.matchId) {
            throw new ApiError(httpStatus.CONFLICT, 'A dispute already exists for this match.');
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            const field = error.fields && error.fields.length > 0 ? error.fields[0] : 'related entity';
            throw new ApiError(httpStatus.BAD_REQUEST, `Invalid reference: ${field} does not exist.`);
        }
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Error creating dispute: ${error.message}`);
    }
  }

  async update(id, updateData, options = {}) {
    const allowedFields = ['status', 'resolutionDetails', 'moderatorId', 'reason'];
    const dataToUpdate = {};
    for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
            dataToUpdate[key] = updateData[key];
        }
    }

    if (Object.keys(dataToUpdate).length === 0) {
        try {
            const currentDispute = await this.findById(id, { transaction: options.transaction });
            return currentDispute; // No valid fields to update
        } catch (error) {
            if (error instanceof ApiError && error.statusCode === httpStatus.NOT_FOUND) return null;
            throw error;
        }
    }
    try {
        const [numberOfAffectedRows] = await this.DisputeTicketModel.update(dataToUpdate, {
        where: { id },
        transaction: options.transaction,
        });

        if (numberOfAffectedRows > 0) {
        return this.findById(id, { transaction: options.transaction });
        }
        // If no rows affected, check if dispute exists
        const exists = await this.DisputeTicketModel.findByPk(id, { transaction: options.transaction, attributes:['id']});
        return exists ? this.findById(id, { transaction: options.transaction }) : null;
    } catch (error) {
        if (error instanceof ApiError) throw error; // From nested findById calls
        // console.error(`Error in PostgresDisputeRepository.update: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error updating dispute: ${error.message}`);
    }
  }

  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'createdAt', sortOrder = 'DESC' } = {}, dbOptions = {}) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = { ...filters }; // Assuming filters directly map to model attributes

    // Example: date range filtering
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = { [this.Op.between]: [new Date(filters.startDate), new Date(filters.endDate)] };
    } else if (filters.startDate) {
      whereClause.createdAt = { [this.Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      whereClause.createdAt = { [this.Op.lte]: new Date(filters.endDate) };
    }
    // Remove date filters from main whereClause if they were handled
    delete whereClause.startDate;
    delete whereClause.endDate;

    const queryOptions = {
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      transaction: dbOptions.transaction,
    };

    // Example of adding includes dynamically based on options
    // const includes = [];
    // if (dbOptions.includeReporter && this.UserModel) includes.push({ model: this.UserModel, as: 'reporter' });
    // if (dbOptions.includeModerator && this.UserModel) includes.push({ model: this.UserModel, as: 'moderator' });
    // if (dbOptions.includeMatch && this.MatchModel) includes.push({ model: this.MatchModel, as: 'match' });
    // if (includes.length > 0) queryOptions.include = includes;
    try {
      const { count, rows } = await this.DisputeTicketModel.findAndCountAll(queryOptions);

      return {
        disputes: rows.map(model => this.DisputeTicketModel.toDomainEntity(model)),
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      };
    } catch (error) {
        // console.error(`Error in PostgresDisputeRepository.findAll: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding all disputes: ${error.message}`);
    }
  }
}

module.exports = { PostgresDisputeRepository };

// Comments updated to reflect changes.
// Repository now uses injected models.
// Error handling in `create` improved for unique and FK constraints.
// Example date filtering added to `findAll`.
