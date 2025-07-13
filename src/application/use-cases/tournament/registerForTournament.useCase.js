// src/application/use-cases/tournament/registerForTournament.useCase.js
const ApiError = require('../../../utils/ApiError.js');
const httpStatusCodes = require('http-status-codes');
const { sequelize } = require('../../../infrastructure/database/postgres.connector');

class RegisterForTournamentUseCase {
  constructor(
    tournamentRepository,
    tournamentParticipantRepository,
    userGameProfileRepository,
    walletRepository // Assuming walletRepository is injected
  ) {
    this.tournamentRepository = tournamentRepository;
    this.tournamentParticipantRepository = tournamentParticipantRepository;
    this.userGameProfileRepository = userGameProfileRepository;
    this.walletRepository = walletRepository;
  }

  async execute({ userId, tournamentId }) {
    if (!userId || !tournamentId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID and Tournament ID are required.');
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, `Tournament with ID ${tournamentId} not found.`);
    }

    if (!tournament.canRegister()) {
      let reason = 'Registration is closed.';
      if (tournament.status !== 'REGISTRATION_OPEN') reason = `Tournament registration is not open (status: ${tournament.status}).`;
      else if (tournament.isFull()) reason = 'Tournament is full.';
      throw new ApiError(httpStatusCodes.FORBIDDEN, `Cannot register for tournament: ${reason}`);
    }

    const existingParticipant = await this.tournamentParticipantRepository.findByUserIdAndTournamentId(userId, tournamentId);
    if (existingParticipant) {
      throw new ApiError(httpStatusCodes.CONFLICT, 'User is already registered for this tournament.');
    }

    const gameId = tournament.gameId;
    if (!gameId) {
      throw new ApiError(httpStatusCodes.INTERNAL_SERVER_ERROR, 'Tournament game ID is missing.');
    }

    const userGameProfile = await this.userGameProfileRepository.findByUserIdAndGameId(userId, gameId);
    if (!userGameProfile || !userGameProfile.inGameName) {
      throw new ApiError(
        httpStatusCodes.BAD_REQUEST,
        `You must set your In-Game Name for the game '${tournament.game ? tournament.game.name : gameId}' before registering for this tournament.`
      );
    }

    return sequelize.transaction(async (t) => {
      // 1. Handle entry fee
      if (tournament.entryFee > 0) {
        const wallet = await this.walletRepository.findByUserId(userId, { transaction: t });
        if (!wallet || wallet.balance < tournament.entryFee) {
          throw new ApiError(httpStatusCodes.FORBIDDEN, 'Insufficient funds.');
        }
        await this.walletRepository.debit(wallet.id, tournament.entryFee, { transaction: t });
      }

      // 2. Create TournamentParticipant record
      const participantData = {
        userId,
        tournamentId,
        registeredAt: new Date(),
      };
      const newParticipant = await this.tournamentParticipantRepository.create(participantData, { transaction: t });

      // 3. Update tournament's current participant count
      await this.tournamentRepository.incrementParticipantCount(tournamentId, { transaction: t });

      return newParticipant;
    });
  }
}

module.exports = RegisterForTournamentUseCase;
