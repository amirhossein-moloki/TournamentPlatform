const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { DisputeTicket } = require('../../../domain/dispute/dispute.entity'); // For status constants
const { Match } = require('../../../domain/tournament/match.entity'); // For status constants
const { sequelize } = require('../../../infrastructure/database/postgres.connector'); // For transactions

class ResolveDisputeUseCase {
  /**
   * @param {import('../../../domain/dispute/dispute.repository.interface')} disputeRepository
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository For match updates
   * @param {object} [notificationService] Optional: for notifying users.
   */
  constructor(disputeRepository, tournamentRepository, notificationService = null) {
    this.disputeRepository = disputeRepository;
    this.tournamentRepository = tournamentRepository; // Used for its match-related methods
    this.notificationService = notificationService;
  }

  /**
   * Resolves a dispute ticket.
   * @param {string} disputeId - The ID of the dispute to resolve.
   * @param {string} moderatorId - The ID of the admin/moderator resolving the dispute.
   * @param {object} resolutionData - Data for resolving the dispute.
   * @param {string} resolutionData.resolutionStatus - The final status for the dispute (e.g., 'RESOLVED_PARTICIPANT1_WIN').
   * @param {string} resolutionData.resolutionDetails - Detailed notes about the resolution.
   * @param {string} [resolutionData.winningParticipantId] - Optional: Explicitly set winner if not implied by status.
   * @param {number} [resolutionData.participant1Score] - Optional: New score for P1 if adjusted.
   * @param {number} [resolutionData.participant2Score] - Optional: New score for P2 if adjusted.
   * @returns {Promise<{dispute: import('../../../domain/dispute/dispute.entity').DisputeTicket, match: import('../../../domain/tournament/match.entity').Match}>}
   * @throws {ApiError}
   */
  async execute(disputeId, moderatorId, resolutionData) {
    const { resolutionStatus, resolutionDetails, winningParticipantId, participant1Score, participant2Score } = resolutionData;

    if (!disputeId || !moderatorId || !resolutionStatus || !resolutionDetails) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Dispute ID, moderator ID, resolution status, and details are required.');
    }
    if (!DisputeTicket.validStatuses.includes(resolutionStatus) ||
        [DisputeTicket.Status.OPEN, DisputeTicket.Status.UNDER_REVIEW].includes(resolutionStatus)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Invalid final resolution status: ${resolutionStatus}.`);
    }

    const dbTransaction = await sequelize.transaction();
    try {
      const dispute = await this.disputeRepository.findById(disputeId, { transaction: dbTransaction });
      if (!dispute) {
        await dbTransaction.rollback();
        throw new ApiError(httpStatusCodes.NOT_FOUND, 'Dispute ticket not found.');
      }

      if (dispute.status !== DisputeTicket.Status.OPEN && dispute.status !== DisputeTicket.Status.UNDER_REVIEW) {
        await dbTransaction.rollback();
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Dispute cannot be resolved from its current status: ${dispute.status}.`);
      }

      const match = await this.tournamentRepository.findMatchById(dispute.matchId, { transaction: dbTransaction });
      if (!match) {
        await dbTransaction.rollback();
        throw new ApiError(httpStatusCodes.NOT_FOUND, `Match associated with dispute (ID: ${dispute.matchId}) not found.`);
      }

      // Apply resolution to domain entities
      dispute.resolve(resolutionStatus, resolutionDetails, moderatorId);

      let matchNewStatus = Match.Status.COMPLETED;
      let actualWinnerId = winningParticipantId;

      if (resolutionStatus === DisputeTicket.Status.RESOLVED_PARTICIPANT1_WIN) {
        actualWinnerId = match.participant1Id;
      } else if (resolutionStatus === DisputeTicket.Status.RESOLVED_PARTICIPANT2_WIN) {
        actualWinnerId = match.participant2Id;
      } else if (resolutionStatus === DisputeTicket.Status.RESOLVED_REPLAY_MATCH) {
        matchNewStatus = Match.Status.SCHEDULED; // Or a specific "TO_BE_REPLAYED" status
        actualWinnerId = null; // No winner if replaying
      } else if (resolutionStatus === DisputeTicket.Status.CLOSED_INVALID || resolutionStatus === DisputeTicket.Status.RESOLVED_NO_ACTION) {
        // If dispute is invalid or no action, match result might stand as previously reported, or revert to AWAITING_SCORES/CONFIRMATION.
        // This logic depends on policy. For now, assume it might complete as is or based on prior state.
        // If no winner was previously set or scores are cleared, actualWinnerId might remain null.
        // Match status might not change or become COMPLETED if a prior result exists and is now confirmed.
        // This part needs careful business logic. For simplicity, if no explicit winner from resolution, keep current match winner.
        actualWinnerId = actualWinnerId !== undefined ? actualWinnerId : match.winnerId;
      }

      // Use match domain method to update its state based on dispute outcome
      match.resolveDispute(actualWinnerId, resolutionDetails, matchNewStatus);

      // If scores are part of the resolution data, update them on the match entity
      if (participant1Score !== undefined) match.participant1Score = participant1Score;
      if (participant2Score !== undefined) match.participant2Score = participant2Score;


      // Persist changes
      const updatedDispute = await this.disputeRepository.update(dispute.id, {
        status: dispute.status,
        resolutionDetails: dispute.resolutionDetails,
        moderatorId: dispute.moderatorId,
      }, { transaction: dbTransaction });

      const updatedMatch = await this.tournamentRepository.updateMatchById(match.id, {
        status: match.status,
        winnerId: match.winnerId,
        winnerType: match.winnerType, // Match entity's resolveDispute should set this
        participant1Score: match.participant1Score,
        participant2Score: match.participant2Score,
        moderatorNotes: match.moderatorNotes, // Match entity's resolveDispute should set this
        isConfirmed: match.isConfirmed, // Match entity's resolveDispute should set this
      }, { transaction: dbTransaction });

      await dbTransaction.commit();

      // TODO: Send notifications to involved participants
      // if (this.notificationService) {
      //   this.notificationService.notifyUser(match.participant1Id, `Dispute for your match resolved: ${resolutionDetails}`);
      //   this.notificationService.notifyUser(match.participant2Id, `Dispute for your match resolved: ${resolutionDetails}`);
      // }

      return { dispute: updatedDispute, match: updatedMatch };

    } catch (error) {
      if (dbTransaction && !dbTransaction.finished) {
        await dbTransaction.rollback();
      }
      console.error(`Error resolving dispute ${disputeId}:`, error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to resolve dispute.');
    }
  }
}

module.exports = ResolveDisputeUseCase;

// Notes:
// - Handles the logic for an admin/moderator to resolve a dispute.
// - Uses a database transaction to ensure atomicity of updates to DisputeTicket and Match.
// - Leverages domain entity methods (`dispute.resolve()`, `match.resolveDispute()`) to encapsulate state changes.
// - The mapping from `resolutionData.resolutionStatus` (from DisputeTicket context) to `matchNewStatus` and `actualWinnerId`
//   contains business logic that defines how a dispute outcome affects the match.
// - Optional `winningParticipantId`, `participant1Score`, `participant2Score` in `resolutionData` allow admin to override match details.
// - Placeholder for notification service.
// - Relies on `DisputeRepository` and `TournamentRepository` (for match updates) supporting transactions.
// - Assumes `Match.entity.js` and `DisputeTicket.entity.js` have the necessary methods and status constants.
//   The `Match.entity.js` `resolveDispute` method was updated to accept notes and new status.
//   The `DisputeTicket.entity.js` `resolve` method was also implemented.
// - The repository `update` and `updateMatchById` methods must correctly persist the fields updated on the domain entities.
//   The `updateMatchById` in `PostgresTournamentRepository` currently takes generic `updateData`.
//   It should correctly map domain entity properties (like `participant1Score`) to model attributes if they differ.
//   (This was partially addressed by aligning Match entity properties with model attributes).
// - If `resolutionData.winningParticipantId` is not provided, the logic tries to infer it or keeps current match winner if appropriate.
//   This part of the logic might need more refinement based on exact business rules for each `resolutionStatus`.
//   The current version assumes `winningParticipantId` will often be provided or derivable.
