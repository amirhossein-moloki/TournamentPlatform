const LeaderboardRedisRepository = require('../../../../../src/infrastructure/database/repositories/leaderboard.redis.repository');
const { LeaderboardEntry } = require('../../../../../src/domain/leaderboard/leaderboard.entity');
const redisAdapter = require('../../../../../src/infrastructure/cache/redis.adapter');

// Mock redisAdapter and its getClient method
jest.mock('../../../../../src/infrastructure/cache/redis.adapter', () => ({
  getClient: jest.fn(),
}));

describe('LeaderboardRedisRepository', () => {
  let mockRedisClient;
  let leaderboardRepository;

  beforeEach(() => {
    // Setup mock Redis client functions for each test
    mockRedisClient = {
      hSet: jest.fn().mockResolvedValue(1),
      zAdd: jest.fn().mockResolvedValue(1),
      zCard: jest.fn().mockResolvedValue(0),
      zRangeWithScores: jest.fn().mockResolvedValue([]),
      hGet: jest.fn().mockResolvedValue('MockUsername'),
      multi: jest.fn(),
      zRevRank: jest.fn(), // Will be chained with multi
      zScore: jest.fn(),   // Will be chained with multi
      exec: jest.fn(),     // Will be chained with multi
    };
    // Configure multi to return itself for chaining, and then specific mock for exec
    mockRedisClient.multi.mockReturnValue(mockRedisClient);
    mockRedisClient.zRevRank.mockReturnValue(mockRedisClient);
    mockRedisClient.zScore.mockReturnValue(mockRedisClient);


    redisAdapter.getClient.mockReturnValue(mockRedisClient);
    leaderboardRepository = new LeaderboardRedisRepository(redisAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addScore', () => {
    it('should add score and user info to Redis', async () => {
      const userId = 'user1';
      const username = 'PlayerOne';
      const score = 100;
      const gameName = 'TestGame';
      const metric = 'rating';
      const period = 'all_time';

      await leaderboardRepository.addScore(userId, username, score, gameName, metric, period);

      const expectedLeaderboardKey = 'leaderboard:TestGame:rating:all_time';
      const expectedUserInfoKey = 'userinfo:user1';

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(expectedUserInfoKey, 'username', username);
      expect(mockRedisClient.zAdd).toHaveBeenCalledWith(expectedLeaderboardKey, { score, value: userId });
    });

    it('should throw error if userId is invalid', async () => {
      await expect(leaderboardRepository.addScore('', 'PlayerOne', 100, 'Game', 'metric', 'period'))
        .rejects.toThrow('User ID must be a non-empty string.');
       await expect(leaderboardRepository.addScore(null, 'PlayerOne', 100, 'Game', 'metric', 'period'))
        .rejects.toThrow('User ID must be a non-empty string.');
    });

    it('should throw error if username is not a string', async () => {
        await expect(leaderboardRepository.addScore('user1', null, 100, 'Game', 'metric', 'period'))
          .rejects.toThrow('Username must be a string.');
    });

    it('should throw error if score is not a number', async () => {
        await expect(leaderboardRepository.addScore('user1', 'PlayerOne', NaN, 'Game', 'metric', 'period'))
            .rejects.toThrow('Score must be a valid number.');
        await expect(leaderboardRepository.addScore('user1', 'PlayerOne', '100', 'Game', 'metric', 'period'))
            .rejects.toThrow('Score must be a valid number.');
    });
  });

  describe('getLeaderboard', () => {
    it('should return empty list if leaderboard is empty', async () => {
      mockRedisClient.zCard.mockResolvedValue(0);
      const result = await leaderboardRepository.getLeaderboard('TestGame', 'rating', 'all_time', 1, 10);
      expect(result).toEqual({ entries: [], totalItems: 0 });
      expect(mockRedisClient.zRangeWithScores).not.toHaveBeenCalled();
    });

    it('should retrieve leaderboard entries and usernames', async () => {
      const gameName = 'TestGame';
      const metric = 'rating';
      const period = 'all_time';
      const page = 1;
      const limit = 2;

      mockRedisClient.zCard.mockResolvedValue(2);
      mockRedisClient.zRangeWithScores.mockResolvedValue([
        { value: 'user1', score: 1500 },
        { value: 'user2', score: 1200 },
      ]);
      mockRedisClient.hGet
        .mockResolvedValueOnce('PlayerOne')
        .mockResolvedValueOnce('PlayerTwo');

      const result = await leaderboardRepository.getLeaderboard(gameName, metric, period, page, limit);

      expect(mockRedisClient.zCard).toHaveBeenCalledWith('leaderboard:TestGame:rating:all_time');
      expect(mockRedisClient.zRangeWithScores).toHaveBeenCalledWith('leaderboard:TestGame:rating:all_time', 0, 1, { REV: true });
      expect(mockRedisClient.hGet).toHaveBeenCalledWith('userinfo:user1', 'username');
      expect(mockRedisClient.hGet).toHaveBeenCalledWith('userinfo:user2', 'username');

      expect(result.totalItems).toBe(2);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toEqual(new LeaderboardEntry('user1', 'PlayerOne', 1500, 1));
      expect(result.entries[1]).toEqual(new LeaderboardEntry('user2', 'PlayerTwo', 1200, 2));
    });

     it('should use fallback username if hGet fails or returns null', async () => {
      mockRedisClient.zCard.mockResolvedValue(1);
      mockRedisClient.zRangeWithScores.mockResolvedValue([{ value: 'userNoName', score: 1000 }]);
      mockRedisClient.hGet.mockResolvedValue(null); // Simulate username not found

      const result = await leaderboardRepository.getLeaderboard('TestGame', 'rating', 'all_time', 1, 1);

      expect(result.entries[0].username).toBe('User userNo'); // Default fallback
    });
  });

  describe('getUserRank', () => {
    it('should return user rank details if user exists', async () => {
      const userId = 'user1';
      const gameName = 'TestGame';
      const metric = 'rating';
      const period = 'all_time';

      // Mock pipeline results for zRevRank and zScore
      mockRedisClient.exec.mockResolvedValue([0, 1500]); // rank 0 (becomes 1), score 1500

      mockRedisClient.zRangeWithScores.mockResolvedValue([ // Surrounding players
        { value: 'user0', score: 1600 },
        { value: 'user1', score: 1500 },
        { value: 'user2', score: 1400 },
      ]);
      mockRedisClient.hGet
        .mockResolvedValueOnce('PlayerZero')
        .mockResolvedValueOnce('PlayerOne')
        .mockResolvedValueOnce('PlayerTwo');

      const result = await leaderboardRepository.getUserRank(userId, gameName, metric, period, 1); // surroundingCount = 1

      expect(mockRedisClient.multi).toHaveBeenCalled();
      expect(mockRedisClient.zRevRank).toHaveBeenCalledWith('leaderboard:TestGame:rating:all_time', userId);
      expect(mockRedisClient.zScore).toHaveBeenCalledWith('leaderboard:TestGame:rating:all_time', userId);
      expect(mockRedisClient.exec).toHaveBeenCalled();

      // Rank is 0 (user1) - 1 (surrounding) - 1 (0-indexed) = -2. Max(0, -2) = 0
      // End rank is 0 (user1) + 1 (surrounding) -1 (0-indexed) = 0
      // Corrected logic for start/end rank in repo:
      // userRank = 1 (0-indexed rank 0 + 1)
      // startRankOffset = max(0, 1 - 1 - 1) = max(0, -1) = 0
      // endRankOffset = 1 + 1 - 1 = 1
      // So zRangeWithScores would be called with 0, 1 (if surroundingCount = 1)
      expect(mockRedisClient.zRangeWithScores).toHaveBeenCalledWith('leaderboard:TestGame:rating:all_time', 0, 1, { REV: true });


      expect(result.userExists).toBe(true);
      expect(result.rank).toBe(1);
      expect(result.score).toBe(1500);
      expect(result.surrounding).toHaveLength(3);
      expect(result.surrounding[0]).toEqual(new LeaderboardEntry('user0', 'PlayerZero', 1600, 1)); // Rank based on startRankOffset + i + 1
      expect(result.surrounding[1]).toEqual(new LeaderboardEntry('user1', 'PlayerOne', 1500, 2));
      expect(result.surrounding[2]).toEqual(new LeaderboardEntry('user2', 'PlayerTwo', 1400, 3));
    });

    it('should return not found if user does not exist on leaderboard', async () => {
      mockRedisClient.exec.mockResolvedValue([null, null]); // Simulate user not found

      const result = await leaderboardRepository.getUserRank('ghostUser', 'TestGame', 'rating', 'all_time');
      expect(result.userExists).toBe(false);
      expect(result.rank).toBe(-1);
      expect(result.score).toBe(0);
      expect(result.surrounding).toEqual([]);
      expect(mockRedisClient.zRangeWithScores).not.toHaveBeenCalled(); // Should not fetch surrounding if user not found
    });
  });

  describe('updateUsername', () => {
    it('should update username in Redis', async () => {
      const userId = 'userToUpdate';
      const newUsername = 'UpdatedPlayer';
      await leaderboardRepository.updateUsername(userId, newUsername);
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(`userinfo:${userId}`, 'username', newUsername);
    });

    it('should throw error if redis hSet fails', async () => {
        mockRedisClient.hSet.mockRejectedValue(new Error('Redis unavailable'));
        await expect(leaderboardRepository.updateUsername('user1', 'newUn'))
            .rejects.toThrow('Redis unavailable');
    });
  });
});
