const ApiError = require('../../../utils/ApiError');
const httpStatusCodes = require('http-status-codes');
// Potentially, we might need UserRepository to fetch the latest username if not provided directly
// const UserRepository = require('../../../domain/user/user.repository.interface');

class UpdateScoreUseCase {
  /**
   * @param {import('../../../domain/leaderboard/leaderboard.repository.interface')} leaderboardRepository
   * @param {import('../../../domain/user/user.repository.interface')} [userRepository] - Optional: for fetching user details like username.
   */
  constructor(leaderboardRepository, userRepository = null) {
    this.leaderboardRepository = leaderboardRepository;
    this.userRepository = userRepository;
  }

  /**
   * Executes the use case to update a user's score on one or more leaderboards.
   * This might be called after a game ends, or when a specific metric changes.
   *
   * @param {object} params - Parameters for updating the score.
   * @param {string} params.userId - The ID of the user.
   * @param {string} [params.username] - The username of the user. If not provided and userRepository is available, it might be fetched.
   * @param {string} params.gameName - The name of the game associated with this score update.
   * @param {Array<{metric: string, value: number, period?: string|string[]}>} params.scores - An array of scores to update.
   *        Each object defines the metric (e.g., 'rating', 'wins', 'kills'), the value of that metric,
   *        and optionally the period(s) it applies to (e.g., 'daily', 'weekly', 'all_time').
   *        If period is omitted, it might default to 'all_time' or update all relevant periods.
   *        'value' here is the actual score, not necessarily a delta. The repository handles accumulation if needed.
   *
   * Example for params.scores:
   * [
   *   { metric: 'rating', value: 1500, period: 'all_time' },
   *   { metric: 'wins', value: 1, period: ['daily', 'weekly', 'all_time'] } // if value is a delta to be added
   * ]
   * Or, if the score is absolute:
   * [
   *   { metric: 'rating', value: 1550, period: 'all_time' },
   *   { metric: 'totalWins', value: 25, period: 'all_time' }
   * ]
   * The current repository `addScore` sets the score, it doesn't increment.
   * So, this use case should provide the absolute new score.
   */
  async execute({ userId, username, gameName, scores }) {
    if (!userId || !gameName || !Array.isArray(scores) || scores.length === 0) {
      throw new ApiError(httpStatusCodes.BAD_REQUEST, 'User ID, game name, and scores array are required.');
    }

    let currentUsername = username;

    // If username is not provided and userRepository is available, try to fetch it.
    if (!currentUsername && this.userRepository) {
      try {
        const user = await this.userRepository.findById(userId);
        if (user) {
          currentUsername = user.username; // Assuming user entity has a 'username' field
        } else {
          // User not found, proceed without username or throw error based on policy
          // For now, we'll let the repository handle a missing/default username.
          currentUsername = `User_${userId.substring(0,6)}`; // Fallback
        }
      } catch (error) {
        // Log error and proceed, or rethrow if username is critical
        console.error(`Error fetching username for ${userId}:`, error);
        currentUsername = `User_${userId.substring(0,6)}`; // Fallback
      }
    } else if (!currentUsername) {
        currentUsername = `User_${userId.substring(0,6)}`; // Fallback if no repo and no username
    }


    for (const scoreEntry of scores) {
      if (!scoreEntry.metric || typeof scoreEntry.value !== 'number') {
        console.warn('Skipping invalid score entry:', scoreEntry);
        continue;
      }

      const periodsToUpdate = [];
      if (scoreEntry.period) {
        if (Array.isArray(scoreEntry.period)) {
          periodsToUpdate.push(...scoreEntry.period);
        } else {
          periodsToUpdate.push(scoreEntry.period);
        }
      } else {
        // Default period if not specified, e.g., 'all_time'
        // Or this could mean this metric applies to all standard periods defined for the game
        periodsToUpdate.push('all_time'); // Example default
      }

      for (const period of periodsToUpdate) {
        try {
          await this.leaderboardRepository.addScore(
            userId,
            currentUsername, // Use the fetched or provided username
            scoreEntry.value,
            gameName,
            scoreEntry.metric,
            period
          );
        } catch (error) {
          // Log error and continue with other scores/periods, or collect errors and throw at the end
          console.error(`Failed to update score for ${userId} on ${gameName}:${scoreEntry.metric}:${period}:`, error);
          // Depending on desired atomicity, might rethrow here or collect errors.
          // For now, best effort: try to update other scores.
        }
      }
    }
    // This use case currently doesn't return a value, but could return status/summary.
  }
}

module.exports = UpdateScoreUseCase;
