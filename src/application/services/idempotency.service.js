// src/application/services/idempotency.service.js
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
// IdempotencyRepositoryInterface would be injected, along with its specific implementation (PostgresIdempotencyRepository)

class IdempotencyService {
  /**
   * @param {import('../../domain/idempotency/idempotency.repository.interface')} idempotencyRepository
   * @param {import('sequelize').Sequelize} sequelize - Sequelize instance for managing transactions
   */
  constructor(idempotencyRepository, sequelize) {
    this.idempotencyRepository = idempotencyRepository;
    this.sequelize = sequelize; // For managing transactions if needed at service level
    this.Status = idempotencyRepository.IdempotencyRequestModel.Status; // Access Status enum from injected model
  }

  /**
   * Checks an idempotency key. If the request associated with the key has already been
   * completed, it returns the stored response. If the request is new, it locks the key
   * by creating a 'PENDING' record. If a request is already 'PENDING' or 'PROCESSING',
   * it might indicate a concurrent request, leading to a conflict error.
   *
   * @param {string} idempotencyKey - The client-provided idempotency key.
   * @param {string} userId - The ID of the user making the request.
   * @param {string} requestPath - The path of the request (e.g., 'POST /wallet/deposit').
   * @param {object} [options] - Options, including a Sequelize transaction if this is part of a larger one.
   * @returns {Promise<{isNewRequest: boolean, storedResponse: {statusCode: number, body: object}|null}>}
   * @throws {ApiError} If key is already locked (PENDING/PROCESSING) or if DB error.
   */
  async checkAndLockKey(idempotencyKey, userId, requestPath, options = {}) {
    if (!idempotencyKey) {
      // Not an idempotent request, proceed as normal (or throw error if key is mandatory for the endpoint)
      return { isNewRequest: true, storedResponse: null, existingRecord: null };
    }

    // Use a transaction for the findOrCreate and initial lock to ensure atomicity
    const t = options.transaction || await this.sequelize.transaction();
    const manageTransaction = !options.transaction;

    try {
      const defaults = {
        userId,
        requestPath,
        status: this.Status.PENDING,
      };

      // Attempt to find or create the record.
      // Pass the transaction to ensure atomicity for this check-and-set operation.
      // A lock might be acquired here by findOrCreate if supported and configured (e.g. SELECT ... FOR UPDATE)
      const { record: existingRecord, created } = await this.idempotencyRepository.findOrCreateRecord(
        idempotencyKey,
        defaults,
        { transaction: t, lock: t.LOCK.UPDATE } // Lock the row if found, or for creation
      );

      if (!created) { // Record already existed
        if (existingRecord.status === this.Status.COMPLETED) {
          if (manageTransaction) await t.commit();
          return {
            isNewRequest: false,
            storedResponse: {
              statusCode: existingRecord.responseStatusCode,
              body: existingRecord.responseBody,
            },
            existingRecord,
          };
        } else if (existingRecord.status === this.Status.FAILED) {
          // Policy: Allow retrying failed idempotent requests with the same key.
          // Update status to PENDING to re-lock and attempt processing.
          // This assumes the failure was recoverable or the client wants to retry.
          // Alternative: return the stored FAILED response/error.
          // For now, let's allow retry by re-setting to PENDING.
          // This part needs careful consideration based on desired retry behavior.
          // A simpler approach for now: if FAILED, treat as "already processed, here's the error".
          // For now, let's treat FAILED like COMPLETED in terms of returning a stored response.
          if (manageTransaction) await t.commit(); // Commit before returning, as we didn't change its state for retry
           return {
            isNewRequest: false, // It's not new, but a previous attempt failed
            storedResponse: { // Return the stored failure details
              statusCode: existingRecord.responseStatusCode || httpStatus.INTERNAL_SERVER_ERROR,
              body: existingRecord.responseBody || { message: 'Previous attempt failed.' },
            },
            existingRecord,
          };
        } else if (existingRecord.status === this.Status.PENDING || existingRecord.status === this.Status.PROCESSING) {
          // This indicates a concurrent request or a previous one that didn't complete.
          // For safety, reject to prevent double processing.
          // Client should retry after a delay if it was a transient issue.
          if (manageTransaction) await t.rollback();
          throw new ApiError(
            httpStatus.CONFLICT,
            `Request with idempotency key ${idempotencyKey} is already being processed or was left pending.`
          );
        }
      }
      // If 'created' is true, the record is new and PENDING.
      // The lock acquired by findOrCreate (if any) should hold until 't' is committed/rolled back.
      if (manageTransaction) await t.commit(); // Commit the new PENDING record
      return { isNewRequest: true, storedResponse: null, existingRecord }; // existingRecord here is the newly created one

    } catch (error) {
      if (manageTransaction && t && !t.isCompleted()) await t.rollback();
      if (error instanceof ApiError) throw error;
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Idempotency check failed: ${error.message}`);
    }
  }

  /**
   * Marks an idempotent request as completed.
   * @param {string} idempotencyKey - The idempotency key.
   * @param {number} statusCode - The HTTP status code of the successful response.
   * @param {object} responseBody - The response body to store.
   * @param {object} [options] - Options, including a Sequelize transaction.
   */
  async markAsCompleted(idempotencyKey, statusCode, responseBody, options = {}) {
    if (!idempotencyKey) return; // Not an idempotent request

    try {
      await this.idempotencyRepository.updateRecord(
        idempotencyKey,
        {
          status: this.Status.COMPLETED,
          responseStatusCode: statusCode,
          responseBody: responseBody,
          completedAt: new Date(),
          failedAt: null, // Ensure failedAt is cleared if it was previously failed and retried
        },
        { transaction: options.transaction } // Use the ongoing transaction from the use case
      );
    } catch (error) {
      // Log error, but don't let failure to mark idempotency break the client response if main op succeeded.
      // This is a critical infrastructure operation; failures here might need alerting.
      console.error(`CRITICAL: Failed to mark idempotency key ${idempotencyKey} as COMPLETED: ${error.message}`, error);
      // Depending on policy, this could throw an error to signal a system issue.
      // For now, just log it. The main operation already succeeded.
    }
  }

  /**
   * Marks an idempotent request as failed.
   * @param {string} idempotencyKey - The idempotency key.
   * @param {number} statusCode - The HTTP status code of the error response.
   * @param {object} errorBody - The error response body to store.
   * @param {object} [options] - Options, including a Sequelize transaction.
   */
  async markAsFailed(idempotencyKey, statusCode, errorBody, options = {}) {
    if (!idempotencyKey) return; // Not an idempotent request

    try {
      await this.idempotencyRepository.updateRecord(
        idempotencyKey,
        {
          status: this.Status.FAILED,
          responseStatusCode: statusCode,
          responseBody: errorBody,
          failedAt: new Date(),
          completedAt: null, // Ensure completedAt is cleared
        },
        { transaction: options.transaction } // Use the ongoing transaction
      );
    } catch (error) {
      console.error(`CRITICAL: Failed to mark idempotency key ${idempotencyKey} as FAILED: ${error.message}`, error);
      // Similar to markAsCompleted, logging for now.
    }
  }
}

module.exports = IdempotencyService;
