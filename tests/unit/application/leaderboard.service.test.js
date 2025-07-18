const leaderboardService = require('../../../src/services/leaderboard.service');
const { LeaderboardEntry } = require('../../../src/infrastructure/database/models');

jest.mock('../../../src/infrastructure/database/models', () => ({
    LeaderboardEntry: {
        findAll: jest.fn(),
        findOne: jest.fn(),
        count: jest.fn(),
    },
}));

describe('Leaderboard Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getLeaderboard', () => {
        it('should return a leaderboard', async () => {
            const mockLeaderboardData = [
                { dataValues: { userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', userName: 'user1', value: 1500 } },
                { dataValues: { userId: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0', userName: 'user2', value: 1600 } },
            ];
            LeaderboardEntry.findAll.mockResolvedValue(mockLeaderboardData);
            LeaderboardEntry.count.mockResolvedValue(2);

            const result = await leaderboardService.getLeaderboard('game', 'rating', 'all_time', { page: 1, limit: 10 });

            expect(result.leaderboard).toEqual(mockLeaderboardData.map(entry => entry.dataValues));
            expect(result.pagination.totalEntries).toBe(2);
        });
    });

    describe('getUserRank', () => {
        it('should return a user\'s rank', async () => {
            const mockUserRank = { dataValues: { userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', userName: 'user1', value: 1500 } };
            LeaderboardEntry.findOne.mockResolvedValue(mockUserRank);
            LeaderboardEntry.count.mockResolvedValue(2);

            const result = await leaderboardService.getUserRank('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'game', 'rating', 'all_time', 5);

            expect(result.userRank).toEqual({ ...mockUserRank.dataValues, rank: 2 });
        });

        it('should return null if user not found', async () => {
            LeaderboardEntry.findOne.mockResolvedValue(null);

            const result = await leaderboardService.getUserRank('nonexistent-user', 'game', 'rating', 'all_time', 5);

            expect(result.userRank).toBeNull();
        });
    });
});
