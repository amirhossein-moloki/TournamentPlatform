const { sequelize, DataTypes, Op } = require('../postgres.connector');
const { DisputeTicket } = require('../../../domain/dispute/dispute.entity');
const DisputeRepositoryInterface = require('../../../domain/dispute/dispute.repository.interface');

const DisputeTicketModel = sequelize.define('DisputeTicket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  matchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Matches', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  reporterId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL', // Reporter might delete account, dispute remains
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: DisputeTicket.Status.OPEN,
    validate: {
      isIn: [DisputeTicket.validStatuses],
    },
  },
  resolutionDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  moderatorId: { // User ID of the admin/moderator
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  // createdAt and updatedAt are automatically managed by Sequelize
}, {
  tableName: 'DisputeTickets',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['matchId'] }, // From migration
    { fields: ['status'] },
    { fields: ['moderatorId'] },
    { fields: ['reporterId'] },
  ],
});

class PostgresDisputeRepository extends DisputeRepositoryInterface {
  constructor() {
    super();
    // In a real DI setup, model might be injected. Here, we use the one defined above.
    this.DisputeTicketModel = DisputeTicketModel;
  }

  _toDomainEntity(modelInstance) {
    if (!modelInstance) return null;
    return DisputeTicket.fromPersistence(modelInstance.get({ plain: true }));
  }

  _toPersistence(disputeEntity) {
    // Convert domain entity to a plain object suitable for Sequelize create/update
    // Exclude fields managed by DB (like auto-increment ID if not UUID, or specific defaults if not on entity)
    const data = {
        id: disputeEntity.id, // Assuming domain entity generates or holds the ID
        matchId: disputeEntity.matchId,
        reporterId: disputeEntity.reporterId,
        reason: disputeEntity.reason,
        status: disputeEntity.status,
        resolutionDetails: disputeEntity.resolutionDetails,
        moderatorId: disputeEntity.moderatorId,
    };
    if (!data.id) delete data.id; // Let defaultValue handle if not provided
    return data;
  }

  async findById(id, options = {}) {
    const modelInstance = await this.DisputeTicketModel.findByPk(id, {
      transaction: options.transaction,
    });
    return this._toDomainEntity(modelInstance);
  }

  async findByMatchId(matchId, options = {}) {
    const modelInstance = await this.DisputeTicketModel.findOne({
      where: { matchId },
      transaction: options.transaction,
    });
    return this._toDomainEntity(modelInstance);
  }

  async create(disputeEntity, options = {}) {
    const persistenceData = this._toPersistence(disputeEntity);
    const modelInstance = await this.DisputeTicketModel.create(persistenceData, {
      transaction: options.transaction,
    });
    return this._toDomainEntity(modelInstance);
  }

  async update(id, updateData, options = {}) {
    // updateData should be a plain object with fields to update
    // e.g., { status, resolutionDetails, moderatorId }
    // Ensure updateData only contains fields present in the model.
    const allowedFields = ['status', 'resolutionDetails', 'moderatorId', 'reason']; // Example
    const dataToUpdate = {};
    for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
            dataToUpdate[key] = updateData[key];
        }
    }

    if (Object.keys(dataToUpdate).length === 0) {
        return this.findById(id, options); // No valid fields to update
    }

    const [numberOfAffectedRows] = await this.DisputeTicketModel.update(dataToUpdate, {
      where: { id },
      transaction: options.transaction,
    });

    if (numberOfAffectedRows > 0) {
      // Re-fetch to get the full updated instance, within the same transaction if provided
      return this.findById(id, { transaction: options.transaction });
    }
    return null; // Or throw not found if preferred
  }

  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'createdAt', sortOrder = 'DESC' } = {}, dbOptions = {}) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = { ...filters };

    // Example specific filter handling if needed:
    // if (filters.tournamentId) { /* requires join or different query structure */ }

    const { count, rows } = await this.DisputeTicketModel.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      transaction: dbOptions.transaction,
      // include: [ /* associations */ ],
    });

    return {
      disputes: rows.map(model => this._toDomainEntity(model)),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  }
}

module.exports = PostgresDisputeRepository;

// Notes:
// - This repository implements the DisputeRepositoryInterface using Sequelize.
// - The DisputeTicketModel is defined to match the DB migration for 'DisputeTickets'.
// - Helper methods `_toDomainEntity` (from DB to Domain) and `_toPersistence` (from Domain to DB data)
//   are used for mapping. `DisputeTicket.fromPersistence` is also used.
// - All methods support an `options` (or `dbOptions`) object for passing `transaction`.
// - `update` method includes a basic filter for allowed fields to update.
// - `findAll` supports pagination, filtering, and sorting.
// - onDelete for reporterId changed to SET NULL, as a user might delete their account but the dispute should remain.
// - onDelete for matchId is CASCADE, if a match is deleted, its disputes are also deleted. This might need review based on business rules (e.g., soft delete matches).
