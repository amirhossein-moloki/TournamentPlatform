class DisputeTicket {
  constructor({
    id,
    matchId,
    reporterId,
    reason,
    status,
    resolutionDetails,
    moderatorId,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.matchId = matchId;
    this.reporterId = reporterId;
    this.reason = reason;
    this.status = status;
    this.resolutionDetails = resolutionDetails;
    this.moderatorId = moderatorId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    if (!Object.values(DisputeTicket.Status).includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }
    if (!this.reason || this.reason.trim() === '') {
        throw new Error('Reason cannot be empty.');
    }
  }

  static Status = Object.freeze({
    OPEN: 'OPEN',
    UNDER_REVIEW: 'UNDER_REVIEW',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED', // Could be same as RESOLVED or a separate final state
    // Add other statuses as needed, e.g., ESCALATED, AWAITING_PLAYER_RESPONSE
  });

  static get validStatuses() {
    return Object.values(DisputeTicket.Status);
  }

  /**
   * Creates a DisputeTicket domain entity from a persistence layer object.
   * @param {object} persistenceObject - The plain object from the database.
   * @returns {DisputeTicket | null}
   */
  static fromPersistence(persistenceObject) {
    if (!persistenceObject) {
      return null;
    }
    // Ensure all required fields from the DB model are mapped
    return new DisputeTicket({
      id: persistenceObject.id,
      matchId: persistenceObject.matchId,
      reporterId: persistenceObject.reporterId,
      reason: persistenceObject.reason,
      status: persistenceObject.status,
      resolutionDetails: persistenceObject.resolutionDetails,
      moderatorId: persistenceObject.moderatorId,
      createdAt: persistenceObject.createdAt,
      updatedAt: persistenceObject.updatedAt,
    });
  }

  // Example domain methods (can be expanded)
  resolve(resolutionDetails, moderatorId) {
    if (this.status === DisputeTicket.Status.RESOLVED || this.status === DisputeTicket.Status.CLOSED) {
      throw new Error('Dispute is already finalized.');
    }
    this.status = DisputeTicket.Status.RESOLVED;
    this.resolutionDetails = resolutionDetails;
    this.moderatorId = moderatorId;
    this.updatedAt = new Date();
  }

  close(moderatorId) {
    if (this.status !== DisputeTicket.Status.RESOLVED) {
      // Or allow closing from OPEN/UNDER_REVIEW directly if business logic permits
      // For now, let's assume it must be resolved first or closed explicitly by an admin.
      // This can be made more flexible.
      // throw new Error('Dispute must be resolved before it can be closed.');
    }
    this.status = DisputeTicket.Status.CLOSED;
    if (moderatorId) this.moderatorId = moderatorId; // Moderator who closes it
    this.updatedAt = new Date();
  }

  startReview(moderatorId) {
    if (this.status !== DisputeTicket.Status.OPEN) {
        throw new Error('Dispute is not open for review.');
    }
    this.status = DisputeTicket.Status.UNDER_REVIEW;
    this.moderatorId = moderatorId;
    this.updatedAt = new Date();
  }
}

module.exports = { DisputeTicket };
