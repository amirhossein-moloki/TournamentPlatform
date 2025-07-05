// const { sequelize, DataTypes, Op } = require('../postgres.connector'); // No longer needed
// const { Transaction } = require('../../../domain/wallet/transaction.entity'); // No longer needed for toDomainEntity
const TransactionRepositoryInterface = require('../../../domain/wallet/transaction.repository.interface');
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');

class PostgresTransactionRepository extends TransactionRepositoryInterface {
  /**
   * @param {object} models - An object containing the Sequelize models.
   * @param {import('sequelize').ModelCtor<import('sequelize').Model> & { toDomainEntity: Function }} models.TransactionModel
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} [models.WalletModel] - Optional
   */
  constructor(models) {
    super();
    if (!models || !models.TransactionModel || typeof models.TransactionModel.toDomainEntity !== 'function') {
        throw new Error('Required models.TransactionModel with toDomainEntity method not provided to PostgresTransactionRepository');
    }
    this.TransactionModel = models.TransactionModel;
    this.WalletModel = models.WalletModel; // If needed for includes
    this.sequelize = models.TransactionModel.sequelize;
    this.Op = this.sequelize.Op;
  }

  async findById(id, options = {}) {
    try {
      const queryOptions = {
        transaction: options.transaction,
        lock: options.lock,
      };
      const txModelInstance = await this.TransactionModel.findByPk(id, queryOptions);
      return this.TransactionModel.toDomainEntity(txModelInstance);
    } catch (error) {
      // console.error(`Error in PostgresTransactionRepository.findById: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding transaction by ID: ${error.message}`);
    }
  }

  async findByIdempotencyKey(idempotencyKey, options = {}) {
    try {
      if (!idempotencyKey) return null;
      const queryOptions = {
        where: { idempotencyKey },
        transaction: options.transaction,
        lock: options.lock,
      };
      const txModelInstance = await this.TransactionModel.findOne(queryOptions);
      return this.TransactionModel.toDomainEntity(txModelInstance);
    } catch (error) {
      // console.error(`Error in PostgresTransactionRepository.findByIdempotencyKey: ${error.message}`, error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding transaction by idempotency key: ${error.message}`);
    }
  }

  async findAllByWalletId({ walletId, page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC' }, options = {}) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = { walletId };

    if (filters.type) whereClause.type = filters.type;
    if (filters.status) whereClause.status = filters.status;
    if (filters.startDate && filters.endDate) {
      whereClause.transactionDate = { [this.Op.between]: [new Date(filters.startDate), new Date(filters.endDate)] };
    } else if (filters.startDate) {
      whereClause.transactionDate = { [this.Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      whereClause.transactionDate = { [this.Op.lte]: new Date(filters.endDate) };
    }

    const { count, rows } = await this.TransactionModel.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      transaction: options.transaction,
    });

    return {
      transactions: rows.map(tx => this.TransactionModel.toDomainEntity(tx)),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  } catch (error) {
    // console.error(`Error in PostgresTransactionRepository.findAllByWalletId: ${error.message}`, error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding transactions by wallet ID: ${error.message}`);
  }
}

  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC', options = {} }) { // Added options
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = { ...filters };
    // Add advanced filtering for dates etc. similar to findAllByWalletId if needed
    if (filters.startDate && filters.endDate) {
      whereClause.transactionDate = { [this.Op.between]: [new Date(filters.startDate), new Date(filters.endDate)] };
    } else if (filters.startDate) {
      whereClause.transactionDate = { [this.Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      whereClause.transactionDate = { [this.Op.lte]: new Date(filters.endDate) };
    }


    const { count, rows } = await this.TransactionModel.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      transaction: options.transaction,
      // include: [{ model: this.WalletModel, as: 'wallet' }] // Example include
    });

    return {
      transactions: rows.map(tx => this.TransactionModel.toDomainEntity(tx)),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  } catch (error) {
    // console.error(`Error in PostgresTransactionRepository.findAll: ${error.message}`, error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding all transactions: ${error.message}`);
  }
}

  async create(transactionEntityOrData, options = {}) { // Added options
    const txData = {
      id: transactionEntityOrData.id,
      walletId: transactionEntityOrData.walletId,
      type: transactionEntityOrData.type,
      amount: parseFloat(transactionEntityOrData.amount),
      status: transactionEntityOrData.status || 'PENDING',
      idempotencyKey: transactionEntityOrData.idempotencyKey,
      description: transactionEntityOrData.description,
      metadata: transactionEntityOrData.metadata,
      transactionDate: transactionEntityOrData.transactionDate || new Date(),
    };

    if (txData.amount <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction amount must be positive.');
    }

    try {
        const createdTxModel = await this.TransactionModel.create(txData, { transaction: options.transaction });
        return this.TransactionModel.toDomainEntity(createdTxModel);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.fields.idempotencyKey) {
            // Attempt to fetch the existing transaction by idempotency key
            const existingTx = await this.findByIdempotencyKey(txData.idempotencyKey, { transaction: options.transaction });
            if (existingTx) return existingTx; // Return existing if found (idempotency)
            throw new ApiError(httpStatus.CONFLICT, `Idempotency key constraint failed, but could not retrieve original for key: ${txData.idempotencyKey}.`);
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw new ApiError(httpStatus.BAD_REQUEST, `Invalid walletId: ${txData.walletId}. Wallet does not exist.`);
        }
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Error creating transaction: ${error.message}`);
    }
  }

  async update(id, updateData, options = {}) {
    const allowedUpdates = ['status', 'description', 'metadata', 'transactionDate'];
    const sanitizedUpdateData = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        sanitizedUpdateData[key] = updateData[key];
      }
    }

    if (Object.keys(sanitizedUpdateData).length === 0) {
      // Ensure findById is also wrapped or handles its errors
      try {
        const currentTx = await this.findById(id, { transaction: options.transaction });
        return currentTx; // No valid fields to update
      } catch (error) {
          if (error instanceof ApiError && error.statusCode === httpStatus.NOT_FOUND) return null; // Or rethrow if findById doesn't return null for not found
          throw error; // Re-throw other errors from findById
      }
    }
    try {
      const [numberOfAffectedRows] = await this.TransactionModel.update(
        sanitizedUpdateData,
        {
          where: { id },
          transaction: options.transaction,
        }
      );

      if (numberOfAffectedRows > 0) {
        const updatedInstance = await this.TransactionModel.findByPk(id, { transaction: options.transaction });
        return this.TransactionModel.toDomainEntity(updatedInstance);
      }
      // If no rows affected, check if transaction exists
      const exists = await this.TransactionModel.findByPk(id, { transaction: options.transaction, attributes: ['id'] });
      return exists ? this.TransactionModel.toDomainEntity(await this.TransactionModel.findByPk(id, { transaction: options.transaction })) : null;
    } catch (error) {
        // console.error(`Error in PostgresTransactionRepository.update: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error updating transaction: ${error.message}`);
    }
  }
}

module.exports = { PostgresTransactionRepository };

// Comments adjusted, repository now relies on injected models.
// Error handling in create method improved for idempotency and FK constraints.
// Date filtering examples added to findAll methods.
