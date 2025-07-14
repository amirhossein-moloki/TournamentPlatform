const { BadRequestError, NotFoundError } = require('../../../utils/errors');

class GetWalletDetailsUseCase {
  /**
   * @param {object} walletRepository - Repository for wallet data.
   */
  constructor(walletRepository) {
    this.walletRepository = walletRepository;
  }

  /**
   * Executes the use case to get wallet details for a user.
   * @param {string} userId - The ID of the user whose wallet details are to be fetched.
   * @returns {Promise<object>} The wallet details.
   * @throws {import('../../../utils/errors').BadRequestError}
   * @throws {import('../../../utils/errors').NotFoundError}
   */
  async execute(userId) {
    if (!userId) {
      throw new BadRequestError('User ID is required to fetch wallet details.');
    }

    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundError('Wallet not found for this user.');
    }

    // Return a plain object representing the wallet details.
    // Avoid returning the raw domain entity if it has methods or too much internal state.
    // The repository's findByUserId should ideally return a domain entity or a clean data object.
    // Assuming 'wallet' is a clean data object or a domain entity with a toJSON() or toDTO() method.
    // If 'wallet' is a Sequelize model instance, it will be serialized to JSON correctly by default.
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: parseFloat(wallet.balance), // Ensure balance is a number
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

module.exports = GetWalletDetailsUseCase;
