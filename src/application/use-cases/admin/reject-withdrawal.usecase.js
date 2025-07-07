// Placeholder for RejectWithdrawalUseCase
class RejectWithdrawalUseCase {
  constructor(transactionRepository) {
    this.transactionRepository = transactionRepository;
  }

  async execute(withdrawalId, reason) {
    // TODO: Implement logic to reject a withdrawal request
    console.log(`Withdrawal ${withdrawalId} rejected. Reason: ${reason}`);
    // Example:
    // const withdrawal = await this.transactionRepository.findById(withdrawalId);
    // if (!withdrawal || withdrawal.type !== 'WITHDRAWAL' || withdrawal.status !== 'PENDING') {
    //   throw new Error('Withdrawal request not found or not pending.');
    // }
    // withdrawal.status = 'REJECTED';
    // withdrawal.adminNotes = reason;
    // await this.transactionRepository.update(withdrawal);
    // return withdrawal;
    return { id: withdrawalId, status: 'REJECTED', reason };
  }
}

module.exports = RejectWithdrawalUseCase;
