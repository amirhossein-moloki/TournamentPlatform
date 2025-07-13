const { v4: uuidv4 } = require('uuid');
const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
const { Tournament } = require('../../../domain/tournament/tournament.entity'); // Assuming entity path

/**
 * @class CreateTournamentUseCase
 * @description Use case for creating a new tournament.
 */
class CreateTournamentUseCase {
  /**
   * @param {object} tournamentRepository - Repository for tournament data persistence.
   * @param {object} userRepository - Repository for user data (to validate organizerId if needed).
   * @param {object} gameRepository - Repository for game data (to validate gameId).
   */
  constructor(tournamentRepository, userRepository, gameRepository) { // Added gameRepository
    this.tournamentRepository = tournamentRepository;
    this.userRepository = userRepository;
    this.gameRepository = gameRepository; // To validate gameId
  }

  /**
   * Executes the tournament creation use case.
   * @param {object} tournamentData - Data for the new tournament.
   * @param {string} tournamentData.name - Name of the tournament.
   * @param {string} tournamentData.gameId - ID of the game for the tournament.
   * @param {string} [tournamentData.description] - Optional description.
   * @param {string} [tournamentData.rules] - Optional rules.
   * @param {number} tournamentData.entryFee - Entry fee for the tournament.
   * @param {number} tournamentData.prizePool - Total prize pool.
   * @param {number} tournamentData.maxParticipants - Maximum number of participants.
   * @param {string|Date} tournamentData.startDate - Start date/time of the tournament.
   * @param {string|Date} [tournamentData.endDate] - Optional end date/time.
   * @param {string} [tournamentData.organizerId] - Optional ID of the user organizing the tournament.
   * @returns {Promise<Tournament>} The created tournament entity.
   * @throws {ApiError} If creation fails (e.g., validation error, organizer not found).
   */
  async execute(tournamentData) {
    // Basic validation (Joi schema validation should be primary at controller level)
    const requiredFields = ['name', 'gameId', 'entryFee', 'prizePool', 'maxParticipants', 'startDate']; // Changed gameName to gameId
    for (const field of requiredFields) {
      if (tournamentData[field] === undefined || tournamentData[field] === null) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Missing required field: ${field}`);
      }
    }

    // Validate gameId
    const game = await this.gameRepository.findById(tournamentData.gameId);
    if (!game || !game.isActive) { // Assuming Game entity has an isActive property
      throw new ApiError(httpStatusCodes.BAD_REQUEST, `Game with ID ${tournamentData.gameId} not found or is not active.`);
    }

    if (new Date(tournamentData.startDate) <= new Date()) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Start date must be in the future.');
    }
    if (tournamentData.endDate && new Date(tournamentData.endDate) <= new Date(tournamentData.startDate)) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'End date must be after the start date.');
    }
    if (tournamentData.entryFee < 0) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Entry fee cannot be negative.');
    }
    if (tournamentData.prizePool < 0) { // Could be 0 if no prize, or >= entryFee * some_factor
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Prize pool cannot be negative.');
    }
    if (tournamentData.maxParticipants <= 1) { // Typically need at least 2 participants
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'Maximum participants must be greater than 1.');
    }

    // Validate organizerId if provided
    if (tournamentData.organizerId) {
      const organizer = await this.userRepository.findById(tournamentData.organizerId);
      if (!organizer) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, `Organizer with ID ${tournamentData.organizerId} not found.`);
      }
      // Future: Check if organizer has 'Admin' or 'TournamentOrganizer' role if such roles exist
    }

    const {
        name, gameId, description, rules, entryFee, prizePool, maxParticipants, startDate, endDate, organizerId,
        entryFeeType, prizeType, prizeDetails, managed_by, supported_by, entryConditions,
        bannerImageUrl, bracketType, settings // Keep existing optional fields
    } = tournamentData;

    if (managed_by && !Array.isArray(managed_by)) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'managed_by must be an array.');
    }
    if (supported_by && !Array.isArray(supported_by)) {
        throw new ApiError(httpStatusCodes.BAD_REQUEST, 'supported_by must be an array.');
    }

    const tournamentId = uuidv4();
    const newTournament = new Tournament(
      tournamentId,
      name,
      gameId,
      description || null,
      rules || null,
      Tournament.Status.PENDING, // Initial status
      parseFloat(entryFee),
      entryFeeType, // Pass the new field
      parseFloat(prizePool),
      prizeType,    // Pass the new field
      prizeDetails || null, // Pass the new field
      parseInt(maxParticipants, 10),
      0, // currentParticipants
      new Date(startDate),
      endDate ? new Date(endDate) : null,
      organizerId || null,
      managed_by || [],     // Pass the new field
      supported_by || [],   // Pass the new field
      entryConditions || {}, // Pass the new field
      new Date(), // createdAt
      new Date(),  // updatedAt
      bannerImageUrl || null, // Pass existing optional field
      bracketType,          // Pass existing optional field (or its default from Tournament entity)
      settings || {}        // Pass existing optional field
    );

    // Persist the new tournament
    const createdTournament = await this.tournamentRepository.create(newTournament);

    // Potentially emit an event (e.g., TOURNAMENT_CREATED) via a message bus
    // if other services need to react to tournament creation.
    // Example: eventEmitter.emit('tournamentCreated', createdTournament);

    return createdTournament; // Return the full entity as created
  }
}

module.exports = CreateTournamentUseCase;
