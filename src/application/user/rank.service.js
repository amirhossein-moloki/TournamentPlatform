const { IRankRepository } = require('../../domain/rank/rank.repository.interface');
const { IUserRepository } = require('../../domain/user/user.repository.interface');

class RankService {
  /**
   * @param {IUserRepository} userRepository - The user repository.
   * @param {IRankRepository} rankRepository - The rank repository.
   */
  constructor(userRepository, rankRepository) {
    this.userRepository = userRepository;
    this.rankRepository = rankRepository;
  }

  /**
   * Updates a user's rank based on their points.
   * @param {string} userId - The ID of the user to update.
   * @returns {Promise<void>}
   */
  async updateUserRank(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const rank = await this.rankRepository.findRankByPoints(user.points);
    if (rank && user.rankId !== rank.id) {
      user.updateRank(user.points, rank.id);
      await this.userRepository.update(user);
    }
  }

  /**
   * Adds points to a user and updates their rank.
   * @param {string} userId - The ID of the user.
   * @param {number} pointsToAdd - The number of points to add.
   * @returns {Promise<void>}
   */
  async addPoints(userId, pointsToAdd) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const newPoints = user.points + pointsToAdd;
    const newRank = await this.rankRepository.findRankByPoints(newPoints);

    user.updateRank(newPoints, newRank ? newRank.id : user.rankId);
    await this.userRepository.update(user);
  }
}

module.exports = { RankService };
