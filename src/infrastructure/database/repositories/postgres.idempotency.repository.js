// src/infrastructure/database/repositories/postgres.idempotency.repository.js
const IdempotencyRepositoryInterface = require('../../../domain/idempotency/idempotency.repository.interface');
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');

class PostgresIdempotencyRepository extends IdempotencyRepositoryInterface {
  /**
   * @param {object} models - An object containing the Sequelize models.
   * @param {import('sequelize').ModelCtor<import('sequelize').Model> & { Status: object }} models.IdempotencyRequestModel
   */
  constructor(models) {
    super();
    if (!models || !models.IdempotencyRequestModel) {
      throw new Error('Required IdempotencyRequestModel not provided to PostgresIdempotencyRepository');
    }
    this.IdempotencyRequestModel = models.IdempotencyRequestModel;
    this.Status = models.IdempotencyRequestModel.Status; // Enum for status
  }

  async findByKey(idempotencyKey, options = {}) {
    try {
      const record = await this.IdempotencyRequestModel.findByPk(idempotencyKey, {
        transaction: options.transaction,
        lock: options.lock, // Support locking if the caller requires it
      });
      return record ? record.toJSON() : null;
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding idempotency record by key: ${error.message}`);
    }
  }

  async createRecord(data, options = {}) {
    try {
      const record = await this.IdempotencyRequestModel.create({
        idempotencyKey: data.idempotencyKey,
        userId: data.userId,
        requestPath: data.requestPath,
        status: data.status || this.Status.PENDING,
        // responseStatusCode, responseBody, completedAt, failedAt will be null/default initially
      }, {
        transaction: options.transaction,
      });
      return record.toJSON();
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        // This might happen in a race condition if findOrCreateRecord isn't used or fails at a higher level.
        // Or if the key is genuinely a duplicate from a non-atomic check-then-create.
        throw new ApiError(httpStatus.CONFLICT, `Idempotency key ${data.idempotencyKey} already exists.`);
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error creating idempotency record: ${error.message}`);
    }
  }

  async findOrCreateRecord(idempotencyKey, defaults, options = {}) {
    try {
      const [record, created] = await this.IdempotencyRequestModel.findOrCreate({
        where: { idempotencyKey },
        defaults: {
          ...defaults, // Should include userId, requestPath
          status: defaults.status || this.Status.PENDING,
        },
        transaction: options.transaction,
        lock: options.lock, // Apply lock during findOrCreate if needed for atomicity with subsequent operations
      });
      return { record: record.toJSON(), created };
    } catch (error) {
       // findOrCreate can also throw SequelizeUniqueConstraintError if two concurrent requests pass the "find" phase and both attempt "create".
       // Depending on DB and transaction isolation, this might be rare but possible.
      if (error.name === 'SequelizeUniqueConstraintError') {
         // It's possible the record was created by a concurrent request after the 'find' part of 'findOrCreate'
         // but before the 'create' part of this request. Try to find it again.
        const existingRecord = await this.findByKey(idempotencyKey, { transaction: options.transaction });
        if (existingRecord) {
            return { record: existingRecord, created: false };
        }
        throw new ApiError(httpStatus.CONFLICT, `Idempotency key ${idempotencyKey} constraint error during findOrCreate, and record not found after retry.`);
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error in findOrCreate idempotency record: ${error.message}`);
    }
  }

  async updateRecord(idempotencyKey, updateData, options = {}) {
    try {
      const validUpdateFields = ['status', 'responseStatusCode', 'responseBody', 'completedAt', 'failedAt'];
      const dataToUpdate = {};
      for (const field of validUpdateFields) {
        if (updateData[field] !== undefined) {
          dataToUpdate[field] = updateData[field];
        }
      }

      if (Object.keys(dataToUpdate).length === 0) {
        // No valid fields to update, just fetch and return current record
        return this.findByKey(idempotencyKey, { transaction: options.transaction });
      }

      const [updateCount, updatedRecords] = await this.IdempotencyRequestModel.update(
        dataToUpdate,
        {
          where: { idempotencyKey },
          transaction: options.transaction,
          returning: true, // Get the updated record
        }
      );

      if (updateCount > 0 && updatedRecords && updatedRecords.length > 0) {
        return updatedRecords[0].toJSON();
      }
      // If no record was updated, it might not exist or data was same.
      // Check existence to differentiate.
      const exists = await this.findByKey(idempotencyKey, { transaction: options.transaction });
      return exists; // Return existing record (possibly unchanged) or null if not found
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error updating idempotency record: ${error.message}`);
    }
  }
}

module.exports = { PostgresIdempotencyRepository };
