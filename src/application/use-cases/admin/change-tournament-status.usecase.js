const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { TournamentStatus } = require('../../../domain/tournament/tournament.entity'); // Assuming TournamentStatus is exported

class ChangeTournamentStatusUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   */
  constructor(tournamentRepository) {
    this.tournamentRepository = tournamentRepository;
  }

  /**
   * Executes the use case to change a tournament's status.
   * @param {string} tournamentId - The ID of the tournament.
   * @param {string} newStatus - The new status to set.
   * @param {string} [cancelReason] - Reason for cancellation, if applicable.
   * @returns {Promise<import('../../../domain/tournament/tournament.entity').Tournament>} The updated tournament.
   */
  async execute(tournamentId, newStatus, cancelReason = 'Tournament status changed by admin.') {
    if (!tournamentId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament ID is required.');
    }
    if (!newStatus || !Object.values(TournamentStatus).includes(newStatus)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Invalid new status: ${newStatus}.`);
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`);
    }

    // Explicitly block unsupported direct status changes before complex logic
    if (newStatus === TournamentStatus.PENDING && tournament.status === TournamentStatus.ONGOING) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Direct change to status '${TournamentStatus.PENDING}' from '${tournament.status}' is not supported via this action. Use specific actions or ensure valid transition.`);
    }
    // Add other similar critical checks here if needed.

    try {
      switch (newStatus) {
        case TournamentStatus.REGISTRATION_OPEN:
          tournament.openRegistration();
          break;
        case TournamentStatus.REGISTRATION_CLOSED:
          tournament.closeRegistration();
          break;
        case TournamentStatus.ONGOING:
          // Consider additional checks: e.g., minimum participants, start date reached.
          // For now, admin override is assumed.
          tournament.startTournament();
          break;
        case TournamentStatus.COMPLETED:
          tournament.completeTournament();
          break;
        case TournamentStatus.CANCELED:
          tournament.cancelTournament(cancelReason);
          break;
        // PENDING and UPCOMING are usually initial states or set by other logic,
        // but admin might need to revert. For direct status setting:
        case TournamentStatus.PENDING:
        case TournamentStatus.UPCOMING:
          // Add specific transition logic if needed, or a more generic updateStatus if allowed.
          // For now, using the entity's direct updateStatus for these if no specific method exists.
          // However, tournament.updateStatus(newStatus) has basic validation.
          // The entity methods (openRegistration, etc.) are preferred as they contain specific business logic.
          // If admin needs to force PENDING/UPCOMING from other states, specific methods might be needed
          // or existing ones might need to allow it under certain conditions (e.g. if not ONGOING/COMPLETED).
          // For now, we assume admin can only move to states managed by specific entity methods.
          // A more generic way:
          // tournament.updateStatus(newStatus); // This exists but might bypass specific transition logic.
          // It's better to rely on the specific methods.
          // Let's assume PENDING/UPCOMING are set during creation or via updateDetails if startDate changes.
          // Admin direct change to PENDING/UPCOMING may need more thought on transition rules.
          // For this iteration, we only support status changes via existing entity methods.
          if (newStatus === TournamentStatus.PENDING && tournament.status !== TournamentStatus.REGISTRATION_OPEN) { // Example: allow revert from upcoming
             tournament.updateStatus(TournamentStatus.PENDING); // Generic status update
          } else if (newStatus === TournamentStatus.UPCOMING && tournament.status === TournamentStatus.PENDING) {
             tournament.updateStatus(TournamentStatus.UPCOMING);
          } else {
            throw new ApiError(httpStatusCodes.BAD_REQUEST, `Direct change to status '${newStatus}' from '${tournament.status}' is not supported via this action. Use specific actions or ensure valid transition.`);
          }
          break;
        default:
          throw new ApiError(httpStatusCodes.BAD_REQUEST, `Status change to '${newStatus}' is not handled.`);
      }
    } catch (error) {
      // Catch errors from entity methods (e.g., invalid transition)
      throw new ApiError(httpStatusCodes.BAD_REQUEST, error.message);
    }

    // Persist changes
    const updatedTournament = await this.tournamentRepository.update(tournamentId, { status: tournament.status, description: tournament.description, endDate: tournament.endDate, updatedAt: tournament.updatedAt });


    if (!updatedTournament) {
        throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update tournament status after validation.');
    }

    return updatedTournament;
  }
}

module.exports = ChangeTournamentStatusUseCase;
