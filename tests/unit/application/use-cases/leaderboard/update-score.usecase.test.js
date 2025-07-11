const UpdateScoreUseCase = require('../../../../../src/application/use-cases/leaderboard/update-score.usecase');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('UpdateScoreUseCase', () => {
  let mockLeaderboardRepository;
  let mockUserRepository;
  let updateScoreUseCase;

  beforeEach(() => {
    mockLeaderboardRepository = {
      addScore: jest.fn().mockResolvedValue(undefined), // addScore usually doesn't return anything
    };
    mockUserRepository = {
      findById: jest.fn(),
    };
    // Initialize with both repositories for full coverage
    updateScoreUseCase = new UpdateScoreUseCase(mockLeaderboardRepository, mockUserRepository);
  });

  const baseParams = {
    userId: 'user123',
    gameName: 'AwesomeGame',
  };

  it('should call leaderboardRepository.addScore for each score entry and period', async () => {
    const params = {
      ...baseParams,
      username: 'PlayerX',
      scores: [
        { metric: 'rating', value: 1500, period: 'all_time' },
        { metric: 'wins', value: 10, period: ['daily', 'weekly'] },
      ],
    };

    await updateScoreUseCase.execute(params);

    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledTimes(3);
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'PlayerX', 1500, 'AwesomeGame', 'rating', 'all_time');
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'PlayerX', 10, 'AwesomeGame', 'wins', 'daily');
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'PlayerX', 10, 'AwesomeGame', 'wins', 'weekly');
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('should use default period "all_time" if period is not specified in a score entry', async () => {
    const params = {
      ...baseParams,
      username: 'PlayerY',
      scores: [{ metric: 'kills', value: 50 }], // No period specified
    };

    await updateScoreUseCase.execute(params);

    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledTimes(1);
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'PlayerY', 50, 'AwesomeGame', 'kills', 'all_time');
  });

  it('should fetch username from userRepository if not provided and repository is available', async () => {
    const fetchedUsername = 'FetchedUser';
    mockUserRepository.findById.mockResolvedValue({ id: 'user123', username: fetchedUsername });
    const params = {
      ...baseParams, // No username here
      scores: [{ metric: 'rating', value: 1200, period: 'all_time' }],
    };

    await updateScoreUseCase.execute(params);

    expect(mockUserRepository.findById).toHaveBeenCalledWith('user123');
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', fetchedUsername, 1200, 'AwesomeGame', 'rating', 'all_time');
  });

  it('should use fallback username if userRepository is available but user not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null); // User not found
    const params = {
      ...baseParams,
      scores: [{ metric: 'rating', value: 1250, period: 'all_time' }],
    };

    await updateScoreUseCase.execute(params);
    expect(mockUserRepository.findById).toHaveBeenCalledWith('user123');
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'User_user12', 1250, 'AwesomeGame', 'rating', 'all_time');
  });

   it('should use fallback username if username not provided and userRepository is NOT available', async () => {
    // Re-initialize use case without userRepository
    updateScoreUseCase = new UpdateScoreUseCase(mockLeaderboardRepository); // No userRepository
    const params = {
      ...baseParams, // No username
      scores: [{ metric: 'rating', value: 1300, period: 'all_time' }],
    };

    await updateScoreUseCase.execute(params);

    expect(mockUserRepository.findById).not.toHaveBeenCalled(); // Should not be called
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'User_user12', 1300, 'AwesomeGame', 'rating', 'all_time');
  });


  it('should throw ApiError BAD_REQUEST if userId, gameName, or scores are missing/invalid', async () => {
    await expect(updateScoreUseCase.execute({ userId: 'u1', gameName: 'g1', scores: [] })) // Empty scores array
      .rejects.toThrow(ApiError);
    await expect(updateScoreUseCase.execute({ userId: 'u1', gameName: 'g1', scores: {} })) // Invalid scores type
      .rejects.toThrow(ApiError);
    await expect(updateScoreUseCase.execute({ userId: 'u1', scores: [{ metric: 'm', value: 1 }] })) // Missing gameName
      .rejects.toHaveProperty('statusCode', httpStatusCodes.BAD_REQUEST);
  });

  it('should skip invalid score entries (missing metric or non-numeric value)', async () => {
    const params = {
      ...baseParams,
      username: 'PlayerZ',
      scores: [
        { value: 100, period: 'all_time' }, // Missing metric
        { metric: 'validMetric', value: 'not-a-number', period: 'all_time' }, // Invalid value
        { metric: 'rating', value: 2000, period: 'all_time' }, // Valid entry
      ],
    };
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await updateScoreUseCase.execute(params);

    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledTimes(1);
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'PlayerZ', 2000, 'AwesomeGame', 'rating', 'all_time');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // For the two invalid entries
    consoleWarnSpy.mockRestore();
  });

  it('should continue processing other scores if one addScore call fails (best effort)', async () => {
    mockLeaderboardRepository.addScore
      .mockResolvedValueOnce(undefined) // First call succeeds
      .mockRejectedValueOnce(new Error('Redis error on second call')) // Second call fails
      .mockResolvedValueOnce(undefined); // Third call succeeds

    const params = {
      ...baseParams,
      username: 'PlayerFail',
      scores: [
        { metric: 'score1', value: 10, period: 'all_time' },
        { metric: 'score2_fail', value: 20, period: 'all_time' },
        { metric: 'score3', value: 30, period: 'all_time' },
      ],
    };
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await updateScoreUseCase.execute(params);

    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledTimes(3);
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'PlayerFail', 10, 'AwesomeGame', 'score1', 'all_time');
    // The call for score2_fail would have been made
    expect(mockLeaderboardRepository.addScore).toHaveBeenCalledWith('user123', 'PlayerFail', 30, 'AwesomeGame', 'score3', 'all_time');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // For the failed addScore
    consoleErrorSpy.mockRestore();
  });
});
