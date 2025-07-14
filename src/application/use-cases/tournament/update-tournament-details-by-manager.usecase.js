const { BadRequestError, NotFoundError, ForbiddenError, InternalServerError } = require('../../../utils/errors');
const { User } = require('../../../domain/user/user.entity'); // Import User
const { Tournament } = require('../../../domain/tournament/tournament.entity');

class UpdateTournamentDetailsByManagerUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   * @param {import('../../../domain/user/user.repository.interface')} userRepository
   * @param {import('../../../domain/game/game.repository.interface')} gameRepository - Potentially needed if gameId can be updated & needs validation
   */
  constructor(tournamentRepository, userRepository, gameRepository) {
    this.tournamentRepository = tournamentRepository;
    this.userRepository = userRepository;
    this.gameRepository = gameRepository; // Keep for future if gameId update is allowed & needs validation
  }

  /**
   * Updates details of a specific tournament by an authorized manager.
   * @param {string} managerUserId - The ID of the Tournament Manager.
   * @param {string} tournamentId - The ID of the tournament to update.
   * @param {object} updateData - Data to update.
   * @returns {Promise<Tournament>} The updated tournament entity.
   */
  async execute(managerUserId, tournamentId, updateData) {
    if (!managerUserId) {
      throw new BadRequestError('Manager User ID is required.');
    }
    if (!tournamentId) {
      throw new BadRequestError('Tournament ID is required.');
    }
    if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
      throw new BadRequestError('Update data is required.');
    }

    // 1. Validate Manager
    const manager = await this.userRepository.findById(managerUserId);
    if (!manager) {
      throw new NotFoundError(`Manager user with ID ${managerUserId} not found.`);
    }
    if (!manager.hasRole(User.UserRoles.TOURNAMENT_MANAGER)) { // Corrected to User.UserRoles
      throw new ForbiddenError(`User ${managerUserId} is not authorized as a Tournament Manager.`);
    }

    // 2. Fetch Tournament
    const tournamentToUpdate = await this.tournamentRepository.findById(tournamentId);
    if (!tournamentToUpdate) {
      throw new NotFoundError(`Tournament with ID ${tournamentId} not found.`);
    }

    // 3. Authorization Check: Is this manager allowed to manage THIS tournament?
    if (!tournamentToUpdate.managed_by || !tournamentToUpdate.managed_by.includes(managerUserId)) {
      throw new ForbiddenError(`User ${managerUserId} is not authorized to manage this specific tournament.`);
    }

    // 4. If gameId is being updated, validate the new gameId
    if (updateData.gameId && updateData.gameId !== tournamentToUpdate.gameId) {
        const game = await this.gameRepository.findById(updateData.gameId);
        if (!game) {
            throw new BadRequestError(`Game with ID ${updateData.gameId} not found.`);
        }
        // Optional: Check if this manager is authorized for the *new* game as well
        // if (!game.tournament_managers || !game.tournament_managers.includes(managerUserId)) {
        //   throw new ForbiddenError(`Manager ${managerUserId} is not authorized for the new game ${updateData.gameId}.`);
        // }
    }

    // 5. Apply updates using entity method (handles individual field validations)
    try {
      tournamentToUpdate.updateDetails(updateData);
    } catch (domainError) {
      throw new BadRequestError(domainError.message);
    }

    // 6. Persist Changes
    // Constructing the object to update based on what updateDetails modified on the entity.
    // This ensures only valid, processed fields are persisted.
    const persistenceData = {
        name: tournamentToUpdate.name,
        description: tournamentToUpdate.description,
        rules: tournamentToUpdate.rules,
        status: tournamentToUpdate.status, // Status might be updatable via specific use cases only
        entryFee: tournamentToUpdate.entryFee,
        entryFeeType: tournamentToUpdate.entryFeeType,
        prizePool: tournamentToUpdate.prizePool,
        prizeType: tournamentToUpdate.prizeType,
        prizeDetails: tournamentToUpdate.prizeDetails,
        maxParticipants: tournamentToUpdate.maxParticipants,
        startDate: tournamentToUpdate.startDate,
        endDate: tournamentToUpdate.endDate,
        organizerId: tournamentToUpdate.organizerId, // Might not be updatable by manager
        managed_by: tournamentToUpdate.managed_by, // Typically updated by specific role assignment use cases
        supported_by: tournamentToUpdate.supported_by, // Typically updated by specific role assignment use cases
        entryConditions: tournamentToUpdate.entryConditions,
        bannerImageUrl: tournamentToUpdate.bannerImageUrl,
        bracketType: tournamentToUpdate.bracketType,
        settings: tournamentToUpdate.settings,
        updatedAt: tournamentToUpdate.updatedAt, // Entity updates this
    };

    // Filter out undefined fields from persistenceData, as the entity might have set some to null intentionally.
    // However, for an update, we usually only send fields that are meant to be changed.
    // The `tournamentToUpdate.updateDetails(updateData)` already modified the `tournamentToUpdate` instance.
    // So, we can pass the relevant parts of `tournamentToUpdate` or just the original `updateData`
    // if the repository's update method is smart enough, or specific fields.
    // For simplicity and to ensure all changes from entity are captured:
    const fieldsForPersistence = tournamentToUpdate.toPlainObject ? tournamentToUpdate.toPlainObject() : { ...tournamentToUpdate };


    const updatedTournament = await this.tournamentRepository.update(tournamentId, fieldsForPersistence);

    if (!updatedTournament) {
      throw new InternalServerError('Failed to update tournament details.');
    }

    return updatedTournament;
  }
}

module.exports = UpdateTournamentDetailsByManagerUseCase;
