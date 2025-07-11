const GetUserRankUseCase = require('../../../../../src/application/use-cases/leaderboard/get-user-rank.usecase');
const { UserRankDetail, LeaderboardEntry } = require('../../../../../src/domain/leaderboard/leaderboard.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('GetUserRankUseCase', () => {
  let mockLeaderboardRepository;
  let getUserRankUseCase;

  beforeEach(() => {
    mockLeaderboardRepository = {
      getUserRank: jest.fn(),
    };
    getUserRankUseCase = new GetUserRankUseCase(mockLeaderboardRepository);
  });

  it('should retrieve and return user rank details, adapting entries', async () => {
    const userId = 'user1';
    const queryParams = { gameName: 'TestGame', metric: 'rating', period: 'all_time' };
    const repoResponse = {
      rank: 5,
      score: 1750,
      userExists: true,
      surrounding: [ // Assuming LeaderboardEntry instances from repo
        new LeaderboardEntry('userA', 'PlayerA', 1800, 4),
        new LeaderboardEntry('user1', 'Player1', 1750, 5),
        new LeaderboardEntry('userB', 'PlayerB', 1700, 6, 30),
      ],
    };
    mockLeaderboardRepository.getUserRank.mockResolvedValue(repoResponse);

    const result = await getUserRankUseCase.execute(userId, queryParams);

    expect(mockLeaderboardRepository.getUserRank).toHaveBeenCalledWith(userId, queryParams.gameName, queryParams.metric, queryParams.period, 2); // Default surroundingCount
    expect(result).toBeInstanceOf(UserRankDetail);
    expect(result.userId).toBe(userId);
    expect(result.gameName).toBe(queryParams.gameName);
    expect(result.rank).toBe(5);
    expect(result.score).toBe(1750); // User's own score
    expect(result.surrounding).toHaveLength(3);
    expect(result.surrounding[1]).toEqual({ // Check adapted structure for 'value'
      rank: 5,
      userId: 'user1',
      username: 'Player1',
      value: 1750, // 'score' adapted to 'value'
      gamesPlayed: undefined, // Not present in this entry from repo
    });
     expect(result.surrounding[2]).toEqual({
      rank: 6,
      userId: 'userB',
      username: 'PlayerB',
      value: 1700,
      gamesPlayed: 30, // Present in this entry
    });
  });

  it('should throw ApiError NOT_FOUND if user is not on the leaderboard', async () => {
    const userId = 'ghostUser';
    const queryParams = { gameName: 'TestGame', metric: 'rating', period: 'all_time' };
    mockLeaderboardRepository.getUserRank.mockResolvedValue({ userExists: false, rank: -1, score: 0, surrounding: [] });

    await expect(getUserRankUseCase.execute(userId, queryParams))
      .rejects.toThrow(ApiError);
    await expect(getUserRankUseCase.execute(userId, queryParams))
      .rejects.toHaveProperty('statusCode', httpStatusCodes.NOT_FOUND);
  });

  it('should throw ApiError BAD_REQUEST if required parameters are missing', async () => {
    await expect(getUserRankUseCase.execute(null, { gameName: 'TestGame' }))
      .rejects.toThrow(ApiError);
    await expect(getUserRankUseCase.execute('user1', { metric: 'rating' }))
      .rejects.toHaveProperty('statusCode', httpStatusCodes.BAD_REQUEST);
  });

  it('should propagate errors from the repository if user existence check passes but repo fails later (hypothetically)', async () => {
    const userId = 'user1';
    const queryParams = { gameName: 'TestGame', metric: 'rating', period: 'all_time' };
    const errorMessage = 'Repository failure during surrounding fetch';
    // This scenario is a bit tricky as getUserRank usually fetches all at once.
    // But if it had stages, and failed after finding the user:
    mockLeaderboardRepository.getUserRank.mockRejectedValue(new Error(errorMessage));

    await expect(getUserRankUseCase.execute(userId, queryParams))
      .rejects.toThrow(errorMessage);
  });

  it('should pass custom surroundingCount to repository', async () => {
    const userId = 'user1';
    const queryParams = { gameName: 'TestGame', metric: 'rating', period: 'all_time' };
    const customSurroundingCount = 5;
     mockLeaderboardRepository.getUserRank.mockResolvedValue({
      rank: 1, score: 100, userExists: true, surrounding: []
    });


    await getUserRankUseCase.execute(userId, queryParams, customSurroundingCount);
    expect(mockLeaderboardRepository.getUserRank).toHaveBeenCalledWith(
        userId, queryParams.gameName, queryParams.metric, queryParams.period, customSurroundingCount
    );
  });
});
