// const { sequelize, DataTypes } = require('../postgres.connector'); // No longer needed
// const { Wallet } = require('../../../domain/wallet/wallet.entity'); // No longer needed for toDomainEntity
const WalletRepositoryInterface = require('../../../domain/wallet/wallet.repository.interface');
// const { User } = require('../../../domain/user/user.entity'); // No longer needed here
const ApiError = require('../../../utils/ApiError'); // For throwing domain specific errors
const httpStatus = require('http-status');

class PostgresWalletRepository extends WalletRepositoryInterface {
  /**
   * @param {object} models - An object containing the Sequelize models.
   * @param {import('sequelize').ModelCtor<import('sequelize').Model> & { toDomainEntity: Function }} models.WalletModel
   * @param {import('sequelize').ModelCtor<import('sequelize').Model>} [models.UserModel] - Optional, for future use
   */
  constructor(models) {
    super();
    if (!models || !models.WalletModel || typeof models.WalletModel.toDomainEntity !== 'function') {
        throw new Error('Required models.WalletModel with toDomainEntity method not provided to PostgresWalletRepository');
    }
    this.WalletModel = models.WalletModel;
    this.UserModel = models.UserModel; // If needed for includes or direct user queries related to wallet
    this.sequelize = models.WalletModel.sequelize;
    this.Op = this.sequelize.Op;
  }

  async findById(id, options = {}) {
    const queryOptions = {
      transaction: options.transaction,
      lock: options.lock,
    };
    const walletModelInstance = await this.WalletModel.findByPk(id, queryOptions);
    return this.WalletModel.toDomainEntity(walletModelInstance);
  }

  async findByUserId(userId, options = {}) {
    const queryOptions = {
      where: { userId },
      transaction: options.transaction,
      lock: options.lock,
    };
    // if (options.includeUser && this.UserModel) {
    //   queryOptions.include = [{ model: this.UserModel, as: 'user' }];
    // }
    const walletModelInstance = await this.WalletModel.findOne(queryOptions);
    return this.WalletModel.toDomainEntity(walletModelInstance);
  }

  async create(walletEntityOrData, options = {}) {
    const walletData = {
      id: walletEntityOrData.id,
      userId: walletEntityOrData.userId,
      balance: walletEntityOrData.balance !== undefined ? parseFloat(walletEntityOrData.balance) : 0.00,
      currency: walletEntityOrData.currency || 'USD',
    };

    if (walletData.balance < 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Wallet balance cannot be negative.');
    }

    const createdWalletModel = await this.WalletModel.create(walletData, { transaction: options.transaction });
    return this.WalletModel.toDomainEntity(createdWalletModel);
  }

  async update(id, updateData, options = {}) {
    const sanitizedUpdateData = {};
    if (updateData.balance !== undefined) {
      sanitizedUpdateData.balance = parseFloat(updateData.balance);
      if (isNaN(sanitizedUpdateData.balance) || sanitizedUpdateData.balance < 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid balance amount for update. Balance cannot be negative.');
      }
    }

    if (Object.keys(sanitizedUpdateData).length === 0) {
      const currentWallet = await this.findById(id, { transaction: options.transaction });
      return currentWallet; // Return current state as no valid fields to update
    }

    // Ensure to use a transaction if one is not already provided for balance updates
    const t = options.transaction || await this.sequelize.transaction();
    const manageTransaction = !options.transaction;

    try {
        const wallet = await this.WalletModel.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE }); // Lock for update
        if (!wallet) {
            if (manageTransaction && t && !t.isCompleted()) await t.rollback();
            throw new ApiError(httpStatus.NOT_FOUND, 'Wallet not found for update.');
        }

        // Optimistic locking check can be added here if model has a version field
        // if (options.version && wallet.version !== options.version) {
        //   if (manageTransaction && t && !t.isCompleted()) await t.rollback();
        //   throw new ApiError(httpStatus.CONFLICT, 'Wallet has been updated by another process.');
        // }

        const [numberOfAffectedRows] = await this.WalletModel.update(
          sanitizedUpdateData,
          {
            where: { id }, // Could also add version to where clause for optimistic lock
            transaction: t,
          }
        );

        if (numberOfAffectedRows > 0) {
          const updatedInstance = await this.WalletModel.findByPk(id, { transaction: t });
          if (manageTransaction && t && !t.isCompleted()) await t.commit();
          return this.WalletModel.toDomainEntity(updatedInstance);
        }

        // If no rows affected but wallet exists, it means data was same or condition failed
        if (manageTransaction && t && !t.isCompleted()) await t.rollback();
        // Re-fetch with original transaction if one was provided, or without if we managed it and rolled back
        const currentWallet = await this.WalletModel.findByPk(id, { transaction: options.transaction });
        return this.WalletModel.toDomainEntity(currentWallet);

    } catch (error) {
        if (manageTransaction && t && !t.isCompleted()) await t.rollback();
        if (error instanceof ApiError) throw error;
        // console.error(`Error in PostgresWalletRepository.update: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error updating wallet: ${error.message}`);
    }
  }

  async delete(id, options = {}) { // Added options for transaction
    const t = options.transaction || await this.sequelize.transaction();
    const manageTransaction = !options.transaction;

    try {
        const walletInstance = await this.WalletModel.findByPk(id, { transaction: t });
        if (!walletInstance) {
            if (manageTransaction && t && !t.isCompleted()) await t.rollback();
            // Consider if not found should be an error or just return false for delete operations
            // For now, returning false is consistent with how delete operations often behave.
            // If an error is preferred: throw new ApiError(httpStatus.NOT_FOUND, 'Wallet not found for deletion.');
            return false;
        }

        if (parseFloat(walletInstance.balance) !== 0.00) {
            if (manageTransaction && t && !t.isCompleted()) await t.rollback();
            throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete wallet with non-zero balance.');
        }

        const numberOfDeletedRows = await this.WalletModel.destroy({
          where: { id },
          transaction: t,
        });

        if (manageTransaction && t && !t.isCompleted()) await t.commit();
        return numberOfDeletedRows > 0;

    } catch (error) {
        if (manageTransaction && t && !t.isCompleted()) await t.rollback();
        if (error instanceof ApiError) throw error;
        // console.error(`Error in PostgresWalletRepository.delete: ${error.message}`, error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error deleting wallet: ${error.message}`);
    }
  }
}

module.exports = { PostgresWalletRepository }; // Export as object

// Comments about model definition, migrations, and specific choices are now assumed to be handled
// by the centralized model definitions and the overall project structure.
// The repository now focuses on data access logic using the injected models.
