const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { Tournament, TournamentStatus } = require('../../../domain/tournament/tournament.entity');
const { User } = require('../../../domain/user/user.entity'); // Import User to access User.UserRoles
const { v4: uuidv4 } = require('uuid');

class CreateTournamentByManagerUseCase {
  /**
   * @param {import('../../../domain/tournament/tournament.repository.interface')} tournamentRepository
   * @param {import('../../../domain/game/game.repository.interface')} gameRepository
   * @param {import('../../../domain/user/user.repository.interface')} userRepository
   */
  constructor(tournamentRepository, gameRepository, userRepository) {
    this.tournamentRepository = tournamentRepository;
    this.gameRepository = gameRepository;
    this.userRepository = userRepository;
  }

  /**
   * Creates a new tournament by an authorized Tournament Manager.
   * @param {string} managerUserId - The ID of the user creating the tournament.
   * @param {object} tournamentData - Data for the new tournament.
   * @param {string} tournamentData.name
   * @param {string} tournamentData.gameId
   * @param {Date} tournamentData.startDate
   * @param {number} tournamentData.maxParticipants
   * @param {string} [tournamentData.description]
   * @param {string} [tournamentData.rules]
   * @param {number} [tournamentData.entryFee]
   * @param {string} [tournamentData.entryFeeType] - from Tournament.EntryFeeType
   * @param {number} [tournamentData.prizePool]
   * @param {string} [tournamentData.prizeType] - from Tournament.PrizeType
   * @param {string|object} [tournamentData.prizeDetails]
   * @param {Date} [tournamentData.endDate]
   * @param {object} [tournamentData.entryConditions]
   * @param {string} [tournamentData.bannerImageUrl]
   * @param {string} [tournamentData.bracketType] - from Tournament.BracketType
   * @param {object} [tournamentData.settings]
   * @returns {Promise<Tournament>} The created tournament entity.
   */
  async execute(managerUserId, tournamentData) {
    if (!managerUserId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Manager User ID is required.');
    }
    if (!tournamentData || typeof tournamentData !== 'object' || Object.keys(tournamentData).length === 0) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Tournament data is required.');
    }

    // 1. Validate Manager
    const manager = await this.userRepository.findById(managerUserId);
    if (!manager) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `User with ID ${managerUserId} not found.`);
    }
    if (!manager.hasRole(User.UserRoles.TOURNAMENT_MANAGER)) { // Corrected to User.UserRoles
      throw new ApiError(httpStatusCodes.FORBIDDEN, `User ${managerUserId} is not authorized to create tournaments (missing TOURNAMENT_MANAGER role).`);
    }

    // 2. Validate Game and Manager's authorization for the game
    if (!tournamentData.gameId) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Game ID is required in tournament data.');
    }
    const game = await this.gameRepository.findById(tournamentData.gameId);
    if (!game) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${tournamentData.gameId} not found.`);
    }
    if (!game.tournament_managers || !game.tournament_managers.includes(managerUserId)) {
      throw new ApiError(httpStatusCodes.FORBIDDEN, `Manager ${managerUserId} is not authorized to create tournaments for game ${tournamentData.gameId}.`);
    }

    // 3. Check for existing tournament with same name and overlapping dates (simplified check for now)
    // This logic can be enhanced for more precise overlap detection if needed.
    if (tournamentData.name && tournamentData.startDate) {
        const existingTournament = await this.tournamentRepository.findByNameAndDates(
            tournamentData.name,
            new Date(tournamentData.startDate),
            tournamentData.endDate ? new Date(tournamentData.endDate) : null
        );
        if (existingTournament) {
            throw new ApiError(httpStatusCodes.CONFLICT, 'A tournament with the same name and overlapping dates already exists.');
        }
    }

    // 4. Create Tournament Entity
    // The Tournament constructor will handle validation of many fields.
    let newTournament;
    try {
      newTournament = new Tournament(
        uuidv4(),
        tournamentData.name,
        tournamentData.gameId,
        tournamentData.description,
        tournamentData.rules,
        TournamentStatus.PENDING, // Initial status
        tournamentData.entryFee,
        tournamentData.entryFeeType,
        tournamentData.prizePool,
        tournamentData.prizeType,
        tournamentData.prizeDetails,
        tournamentData.maxParticipants,
        0, // currentParticipants
        new Date(tournamentData.startDate),
        tournamentData.endDate ? new Date(tournamentData.endDate) : null,
        managerUserId, // organizerId can be the manager creating it
        [managerUserId], // managed_by is set to the creator
        [], // supported_by can be added later
        tournamentData.entryConditions,
        new Date(), // createdAt
        new Date(), // updatedAt
        tournamentData.bannerImageUrl,
        tournamentData.bracketType,
        tournamentData.settings
      );
    } catch (error) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Failed to create tournament entity: ${error.message}`);
    }

    // 5. Persist Tournament
    const createdTournament = await this.tournamentRepository.create(newTournament);
    if (!createdTournament) {
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save the new tournament.');
    }

    return createdTournament;
  }
}

module.exports = CreateTournamentByManagerUseCase;
