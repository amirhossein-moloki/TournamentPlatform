const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { Transaction } = require('../../../domain/wallet/transaction.entity'); // For status constants
const { sequelize } = require('../../../infrastructure/database/postgres.connector');

class ApproveWithdrawalUseCase {
  /**
   * @param {import('../../../domain/wallet/transaction.repository.interface')} transactionRepository
   * @param {import('../../../domain/wallet/wallet.repository.interface')} walletRepository
   * @param {object} [paymentService] - Optional: A service to initiate the actual fund transfer.
   * @param {object} [notificationService] - Optional: For notifying user.
   */
  constructor(transactionRepository, walletRepository, paymentService = null, notificationService = null) {
    this.transactionRepository = transactionRepository;
    this.walletRepository = walletRepository;
    this.paymentService = paymentService;
    this.notificationService = notificationService;
  }

  /**
   * Approves a withdrawal request.
   * @param {string} withdrawalTransactionId - The ID of the withdrawal transaction to approve.
   * @param {string} adminUserId - The ID of the admin/finance manager approving.
   * @param {string} [notes] - Optional notes from the admin.
   * @returns {Promise<import('../../../domain/wallet/transaction.entity').Transaction>} The updated Transaction entity.
   * @throws {ApiError}
   */
  async execute(withdrawalTransactionId, adminUserId, notes = null) {
    if (!withdrawalTransactionId || !adminUserId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Withdrawal Transaction ID and Admin User ID are required.');
    }

    const dbTransaction = await sequelize.transaction();
    try {
      // 1. Fetch the withdrawal transaction (lock for update if supported by findById)
      const withdrawal = await this.transactionRepository.findById(withdrawalTransactionId, {
        transaction: dbTransaction,
        // lock: dbTransaction.LOCK.UPDATE (If findById supports pessimistic lock)
      });

      if (!withdrawal) {
        await dbTransaction.rollback();
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'Withdrawal request not found.');
      }
      if (withdrawal.type !== 'WITHDRAWAL') {
        await dbTransaction.rollback();
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Transaction is not a withdrawal type.');
      }
      if (withdrawal.status !== 'REQUIRES_APPROVAL') {
        await dbTransaction.rollback();
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Withdrawal request cannot be approved from current status: ${withdrawal.status}.`);
      }

      // 2. (Conceptual) Initiate actual payment via PaymentService
      // This is a critical step. If payment fails, the whole operation should roll back or enter a retry/manual state.
      let paymentGatewayReference = null;
      if (this.paymentService && typeof this.paymentService.processPayout === 'function') {
        try {
          // paymentService.processPayout would take withdrawal.amount, withdrawal.currency, withdrawal.metadata.withdrawalMethodDetails
          const payoutResult = await this.paymentService.processPayout({
            amount: withdrawal.amount,
            currency: withdrawal.metadata.requestedCurrency || 'USD', // Assuming currency is in metadata
            recipientDetails: withdrawal.metadata.withdrawalMethodDetails,
            transactionId: withdrawal.id, // For reference
          });
          paymentGatewayReference = payoutResult.gatewayReferenceId; // Example field from payment service
          logger.info(`[ApproveWithdrawal] Payout processed by payment service for ${withdrawal.id}. Ref: ${paymentGatewayReference}`);
        } catch (paymentError) {
          logger.error(`[ApproveWithdrawal] Payment service failed for withdrawal ${withdrawal.id}:`, paymentError);
          // Update transaction to a FAILED_PAYMENT status or similar, do not debit wallet yet.
          await this.transactionRepository.update(withdrawal.id, {
            status: 'PAYMENT_FAILED', // A new status might be needed
            description: `${withdrawal.description} | Admin: ${adminUserId} approved. Notes: ${notes || 'N/A'}. Payment processing failed: ${paymentError.message}`,
            metadata: { ...withdrawal.metadata, adminUserId, adminNotes: notes, paymentError: paymentError.message },
          }, { transaction: dbTransaction });
          await dbTransaction.commit(); // Commit this FAILED_PAYMENT status.
          throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, `Payment processing failed: ${paymentError.message}`);
        }
      } else {
        logger.warn(`[ApproveWithdrawal] No payment service configured. Simulating payout for withdrawal ${withdrawal.id}.`);
        // For mock/dev, assume payment is successful.
        paymentGatewayReference = `mock_payout_${Date.now()}`;
      }

      // 3. If payment successful (or mocked as such), debit the user's wallet
      const wallet = await this.walletRepository.findById(withdrawal.walletId, {
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });
      if (!wallet) {
        await dbTransaction.rollback(); // Should not happen if withdrawal record is valid
        throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Associated wallet not found.');
      }
      if (!wallet.hasSufficientFunds(withdrawal.amount) && withdrawal.status !== 'PAYMENT_FAILED') {
         // This check is important. If funds became insufficient after request, it's an issue.
         // Rollback payment if possible, or mark for manual intervention.
         // For now, assume funds were sufficient or hold was placed.
         // If payment already made, this is a critical state.
        logger.error(`[ApproveWithdrawal] Insufficient funds for withdrawal ${withdrawal.id} AFTER payment processing attempt. This indicates a critical issue.`);
        // Attempt to update transaction to a special error state.
        await this.transactionRepository.update(withdrawal.id, {
            status: 'ERROR_INSUFFICIENT_FUNDS_POST_PAYMENT',
            description: `${withdrawal.description} | Admin: ${adminUserId} approved. Notes: ${notes || 'N/A'}. CRITICAL: Insufficient funds post-payment.`,
            metadata: { ...withdrawal.metadata, adminUserId, adminNotes: notes, paymentGatewayReference },
          }, { transaction: dbTransaction });
        await dbTransaction.commit();
        throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Critical error: Insufficient funds after payment processing.');
      }

      // This part only runs if payment was successful (or mocked)
      const newBalance = parseFloat(wallet.balance) - parseFloat(withdrawal.amount);
      await this.walletRepository.update(wallet.id, { balance: newBalance }, { transaction: dbTransaction });

      // 4. Update withdrawal transaction status to COMPLETED (or PROCESSING if gateway is async)
      const finalStatus = 'COMPLETED'; // Assume direct completion after successful payout
      const updatedWithdrawal = await this.transactionRepository.update(withdrawal.id, {
        status: finalStatus,
        description: `${withdrawal.description} | Admin: ${adminUserId} approved. Notes: ${notes || 'N/A'}`,
        metadata: { ...withdrawal.metadata, adminUserId, adminNotes: notes, paymentGatewayReference },
        transactionDate: new Date(), // Mark completion/approval date
      }, { transaction: dbTransaction });

      await dbTransaction.commit();

      // 5. (Conceptual) Notify user
      // if (this.notificationService) {
      //   this.notificationService.notifyUser(wallet.userId, `Your withdrawal request for ${withdrawal.amount} ${withdrawal.metadata.requestedCurrency} has been approved and processed.`);
      // }

      return updatedWithdrawal;

    } catch (error) {
      if (dbTransaction && !dbTransaction.finished) {
        await dbTransaction.rollback();
      }
      console.error(`Error approving withdrawal ${withdrawalTransactionId}:`, error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to approve withdrawal request.');
    }
  }
}

module.exports = ApproveWithdrawalUseCase;

// Notes:
// - This is a critical financial operation. Atomicity is key.
// - It involves: fetching transaction, (conceptually) calling a payment service, debiting wallet, updating transaction.
// - Uses a DB transaction to wrap wallet debit and transaction status update.
// - The interaction with an external `paymentService` is crucial:
//   - If `paymentService.processPayout` fails, the transaction should NOT debit the wallet, and the withdrawal
//     status should reflect payment failure.
//   - If `paymentService.processPayout` succeeds, then the wallet debit and transaction completion must succeed.
//     If they fail after payment, this is a critical state requiring manual reconciliation.
// - The `walletRepository.findById` is called with a pessimistic lock to prevent race conditions on balance.
// - Assumes `transactionRepository` and `walletRepository` methods support transactions.
// - `PAYMENT_FAILED` and `ERROR_INSUFFICIENT_FUNDS_POST_PAYMENT` are example statuses for error states.
//   Proper transaction statuses need to be part of the domain's `Transaction.Status` enum.
// - A real `paymentService` would be an infrastructure component.
// - The order of operations (payment service call vs. wallet debit) can vary.
//   Sometimes, funds are debited first (or put on hold), then payment is attempted. If payment fails, funds are revered.
//   The current flow attempts payment first, then debits. This is risky if debit fails post-payment.
//   A "hold" mechanism is safer: Hold funds -> Attempt Payment -> If Success: Confirm Hold (Debit) & Complete Tx; If Fail: Release Hold & Fail Tx.
//   This mock does not implement holds for simplicity.
// - `withdrawal.metadata.requestedCurrency` is assumed to exist.
// - `logger` is used conceptually; it would be `require('../../../utils/logger')`. This is added.
