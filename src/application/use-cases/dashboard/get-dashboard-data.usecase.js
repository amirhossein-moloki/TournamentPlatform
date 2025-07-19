const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

class GetDashboardDataUseCase {
  constructor({ userRepository, walletRepository, tournamentRepository }) {
    this.userRepository = userRepository;
    this.walletRepository = walletRepository;
    this.tournamentRepository = tournamentRepository;
  }

  async execute({ userId }) {
    if (!userId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'User not found.');
    }

    const wallet = await this.walletRepository.findByUserId(userId);
    const tournaments = await this.tournamentRepository.findByParticipantId(userId);
    const wins = tournaments.filter(t => t.winnerId === userId).length;

    return {
      user: user.toPublicProfile(),
      wallet: {
        balance: wallet ? wallet.balance : 0,
        currency: wallet ? wallet.currency : 'USD',
      },
      tournaments: {
        participated: tournaments.length,
        wins,
      },
    };
  }
}

module.exports = GetDashboardDataUseCase;
