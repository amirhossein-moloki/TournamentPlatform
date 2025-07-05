const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');

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
   * @throws {ApiError} If the wallet is not found or other errors occur.
   */
  async execute(userId) {
    if (!userId) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID is required to fetch wallet details.');
    }

    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new ApiError(httpStatusCodes.NOT_FOUND, 'Wallet not found for this user.');
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
