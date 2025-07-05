// src/domain/idempotency/idempotency.repository.interface.js

/**
 * @interface IdempotencyRepositoryInterface
 */
class IdempotencyRepositoryInterface {
  /**
   * Finds an idempotency record by its key.
   * @param {string} idempotencyKey - The idempotency key.
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<object|null>} The idempotency record or null if not found.
   */
  async findByKey(idempotencyKey, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Creates a new idempotency record.
   * This should typically be part of an atomic operation if possible,
   * or findOrCreate should be used.
   * @param {object} data - Data for the new record.
   * @param {string} data.idempotencyKey
   * @param {string} data.userId
   * @param {string} data.requestPath
   * @param {string} data.status - e.g., 'PENDING'
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<object>} The created idempotency record.
   */
  async createRecord(data, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Finds an idempotency record by its key, or creates a new one if not found.
   * This operation should be atomic to prevent race conditions.
   * @param {string} idempotencyKey - The idempotency key.
   * @param {object} defaults - Default values for creation if record not found.
   * @param {string} defaults.userId
   * @param {string} defaults.requestPath
   * @param {string} [defaults.status] - Initial status, defaults to PENDING.
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<{record: object, created: boolean}>} The record and a boolean indicating if it was created.
   */
  async findOrCreateRecord(idempotencyKey, defaults, options) {
    throw new Error('Method not implemented.');
  }

  /**
   * Updates an idempotency record.
   * @param {string} idempotencyKey - The key of the record to update.
   * @param {object} updateData - Data to update.
   * @param {string} [updateData.status]
   * @param {number} [updateData.responseStatusCode]
   * @param {object} [updateData.responseBody]
   * @param {Date} [updateData.completedAt]
   * @param {Date} [updateData.failedAt]
   * @param {object} [options] - Database transaction options.
   * @returns {Promise<object|null>} The updated record or null if not found/not updated.
   */
  async updateRecord(idempotencyKey, updateData, options) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IdempotencyRepositoryInterface;
