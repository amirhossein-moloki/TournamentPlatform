const { BadRequestError, NotFoundError, ForbiddenError, ConflictError, InternalServerError } = require('../../../utils/errors');
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
      throw new BadRequestError('User ID and Tournament ID are required.');
    }

    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundError(`Tournament with ID ${tournamentId} not found.`);
    }

    if (!tournament.canRegister()) {
      let reason = 'Registration is closed.';
      if (tournament.status !== 'REGISTRATION_OPEN') reason = `Tournament registration is not open (status: ${tournament.status}).`;
      else if (tournament.isFull()) reason = 'Tournament is full.';
      throw new ForbiddenError(`Cannot register for tournament: ${reason}`);
    }

    const existingParticipant = await this.tournamentParticipantRepository.findByUserIdAndTournamentId(userId, tournamentId);
    if (existingParticipant) {
      throw new ConflictError('User is already registered for this tournament.');
    }

    const gameId = tournament.gameId;
    if (!gameId) {
      throw new InternalServerError('Tournament game ID is missing.');
    }

    const userGameProfile = await this.userGameProfileRepository.findByUserIdAndGameId(userId, gameId);
    if (!userGameProfile || !userGameProfile.inGameName) {
      throw new BadRequestError(
        `You must set your In-Game Name for the game '${tournament.game ? tournament.game.name : gameId}' before registering for this tournament.`
      );
    }

    return sequelize.transaction(async (t) => {
      // 1. Handle entry fee
      if (tournament.entryFee > 0) {
        const wallet = await this.walletRepository.findByUserId(userId, { transaction: t });
        if (!wallet || wallet.balance < tournament.entryFee) {
          throw new ForbiddenError('Insufficient funds.');
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
