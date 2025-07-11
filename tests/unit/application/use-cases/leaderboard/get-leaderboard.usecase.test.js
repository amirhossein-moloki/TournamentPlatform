const GetLeaderboardUseCase = require('../../../../../src/application/use-cases/leaderboard/get-leaderboard.usecase');
const { Leaderboard, LeaderboardEntry } = require('../../../../../src/domain/leaderboard/leaderboard.entity');
const ApiError = require('../../../../../src/utils/ApiError');
const httpStatusCodes = require('http-status-codes');

describe('GetLeaderboardUseCase', () => {
  let mockLeaderboardRepository;
  let getLeaderboardUseCase;

  beforeEach(() => {
    mockLeaderboardRepository = {
      getLeaderboard: jest.fn(),
    };
    getLeaderboardUseCase = new GetLeaderboardUseCase(mockLeaderboardRepository);
  });

  it('should retrieve and return leaderboard data, adapting entries', async () => {
    const queryParams = {
      gameName: 'TestGame',
      metric: 'rating',
      period: 'all_time',
      page: 1,
      limit: 10,
    };
    const repoResponse = {
      entries: [
        new LeaderboardEntry('user1', 'PlayerOne', 1500, 1, 20),
        new LeaderboardEntry('user2', 'PlayerTwo', 1200, 2, 15),
      ],
      totalItems: 2,
    };
    mockLeaderboardRepository.getLeaderboard.mockResolvedValue(repoResponse);

    const result = await getLeaderboardUseCase.execute(queryParams);

    expect(mockLeaderboardRepository.getLeaderboard).toHaveBeenCalledWith(
      queryParams.gameName,
      queryParams.metric,
      queryParams.period,
      queryParams.page,
      queryParams.limit
    );
    expect(result).toBeInstanceOf(Leaderboard);
    expect(result.gameName).toBe(queryParams.gameName);
    expect(result.totalItems).toBe(2);
    expect(result.currentPage).toBe(queryParams.page);
    expect(result.pageSize).toBe(queryParams.limit);
    expect(result.totalPages).toBe(1); // Math.ceil(2 / 10) = 1
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toEqual({ // Check adapted structure
      rank: 1,
      userId: 'user1',
      username: 'PlayerOne',
      value: 1500, // 'score' adapted to 'value'
      gamesPlayed: 20,
    });
    expect(result.entries[1]).toEqual({
      rank: 2,
      userId: 'user2',
      username: 'PlayerTwo',
      value: 1200,
      gamesPlayed: 15,
    });
  });

  it('should calculate totalPages correctly', async () => {
    const queryParams = { gameName: 'TG', metric: 'm', period: 'p', page: 1, limit: 5 };
    const repoResponse = { entries: [], totalItems: 12 }; // 12 items, 5 per page
    mockLeaderboardRepository.getLeaderboard.mockResolvedValue(repoResponse);

    const result = await getLeaderboardUseCase.execute(queryParams);
    expect(result.totalPages).toBe(3); // Math.ceil(12 / 5) = 3
  });

  it('should set totalPages to 1 if totalItems is 0', async () => {
    const queryParams = { gameName: 'TG', metric: 'm', period: 'p', page: 1, limit: 5 };
    const repoResponse = { entries: [], totalItems: 0 };
    mockLeaderboardRepository.getLeaderboard.mockResolvedValue(repoResponse);

    const result = await getLeaderboardUseCase.execute(queryParams);
    expect(result.totalPages).toBe(1);
  });

  it('should throw ApiError if required query parameters are missing', async () => {
    const incompleteParams = { gameName: 'TestGame', metric: 'rating' }; // Missing period, page, limit
    await expect(getLeaderboardUseCase.execute(incompleteParams))
      .rejects.toThrow(ApiError);
    await expect(getLeaderboardUseCase.execute(incompleteParams))
      .rejects.toHaveProperty('statusCode', httpStatusCodes.BAD_REQUEST);
  });

  it('should propagate errors from the repository', async () => {
    const queryParams = { gameName: 'TG', metric: 'm', period: 'p', page: 1, limit: 5 };
    const errorMessage = 'Repository failure';
    mockLeaderboardRepository.getLeaderboard.mockRejectedValue(new Error(errorMessage));

    await expect(getLeaderboardUseCase.execute(queryParams))
      .rejects.toThrow(errorMessage);
  });
});
