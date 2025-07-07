// Placeholder for RejectWithdrawalUseCase
class RejectWithdrawalUseCase {
  constructor(transactionRepository, notificationService) {
    this.transactionRepository = transactionRepository;
    this.notificationService = notificationService; // Optional, based on other use cases
  }

  async execute(withdrawalId, adminUserId, reason) {
    console.warn(`Placeholder: RejectWithdrawalUseCase.execute called with withdrawalId: ${withdrawalId}, adminUserId: ${adminUserId}, reason: ${reason}`);
    // In a real implementation, this would:
    // 1. Validate inputs.
    // 2. Find the withdrawal request by withdrawalId.
    // 3. Check if it's in a state that can be rejected.
    // 4. Update the withdrawal status to 'REJECTED' and store the reason and adminUserId.
    // 5. Optionally, log the action.
    // 6. Optionally, send a notification to the user.
    // For now, we'll just return a mock object.
    return {
      id: withdrawalId,
      status: 'REJECTED',
      rejectionReason: reason,
      processedBy: adminUserId,
      processedAt: new Date().toISOString(),
    };
  }
}

module.exports = RejectWithdrawalUseCase;
