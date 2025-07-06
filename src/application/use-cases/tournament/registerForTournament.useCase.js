// src/application/use-cases/tournament/registerForTournament.useCase.js
const ApiError = require('../../../utils/ApiError.js');
const httpStatusCodes = require('http-status-codes');
// const TournamentParticipant = require('../../../domain/tournament/tournamentParticipant.entity.js');

class RegisterForTournamentUseCase {
  constructor(
    tournamentRepository,
    tournamentParticipantRepository,
    userGameProfileRepository,
    // userRepository, // If we need to check user status (e.g., isVerified)
  ) {
    this.tournamentRepository = tournamentRepository;
    this.tournamentParticipantRepository = tournamentParticipantRepository;
    this.userGameProfileRepository = userGameProfileRepository;
    // this.userRepository = userRepository;
  }

  async execute(userId, tournamentId) {
    if (!userId || !tournamentId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID and Tournament ID are required.');
    }

    // 1. Fetch tournament details
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`);
    }

    // 2. Check tournament status and capacity (using methods from domain entity)
    // Ensure the tournament entity fetched by repository has its methods available
    // or re-hydrate it into a full domain entity if repository returns plain object.
    // For now, assuming `tournament` is a full domain entity or has necessary properties.
    if (!tournament.canRegister()) { // This method should be on the Tournament domain entity
        let reason = 'Registration is closed.';
        if (tournament.status !== 'REGISTRATION_OPEN') reason = `Tournament registration is not open (status: ${tournament.status}).`;
        else if (tournament.isFull()) reason = 'Tournament is full.';
        throw new ApiError(httpStatusCodes.FORBIDDEN, `Cannot register for tournament: ${reason}`);
    }

    // 3. Check if user is already registered
    const existingParticipant = await this.tournamentParticipantRepository.findByUserIdAndTournamentId(userId, tournamentId);
    if (existingParticipant) {
      throw new ApiError(httpStatusCodes.CONFLICT, 'User is already registered for this tournament.');
    }

    // 4. Fetch UserGameProfile for the tournament's game
    const gameId = tournament.gameId; // Assuming tournament entity has gameId
    if (!gameId) {
        // This should ideally not happen if data is consistent
        throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Tournament game ID is missing.');
    }

    const userGameProfile = await this.userGameProfileRepository.findByUserIdAndGameId(userId, gameId);
    if (!userGameProfile || !userGameProfile.inGameName) {
      throw new ApiError(
        httpStatusCodes.BAD_REQUEST,
        `You must set your In-Game Name for the game '${tournament.game ? tournament.game.name : gameId}' before registering for this tournament.`
      );
    }

    // (Optional) Check user status (e.g., isVerified)
    // const user = await this.userRepository.findById(userId);
    // if (!user || !user.isVerified) {
    //   throw new ApiError(httpStatusCodes.FORBIDDEN, 'User account must be verified to register.');
    // }

    // 5. Create TournamentParticipant record
    const participantData = {
      userId,
      tournamentId,
      // teamId: null, // If applicable
      // participantType: 'user', // If applicable
      registeredAt: new Date(),
      // inGameName: userGameProfile.inGameName, // Storing it here might be redundant if always fetched from UserGameProfile
    };

    const newParticipant = await this.tournamentParticipantRepository.create(participantData);

    // 6. Update tournament's current participant count
    // This logic might be better inside tournamentRepository.incrementParticipantCount(tournamentId)
    // or as part of a transaction.
    // For simplicity, direct update or relying on entity method if applicable.
    await this.tournamentRepository.incrementParticipantCount(tournamentId);
    // Or if the entity handles it:
    // tournament.addParticipant(userId); // Assuming this method updates currentParticipants
    // await this.tournamentRepository.update(tournament);


    // TODO: Consider transactional safety for participant creation and count update.

    return newParticipant; // Or a success message/status
  }
}

module.exports = RegisterForTournamentUseCase;
