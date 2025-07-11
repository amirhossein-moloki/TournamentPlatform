const { LeaderboardEntry, Leaderboard, UserRankDetail } = require('../../../../src/domain/leaderboard/leaderboard.entity');

describe('Leaderboard Entities', () => {
  describe('LeaderboardEntry', () => {
    it('should create a LeaderboardEntry instance with all fields', () => {
      const entry = new LeaderboardEntry('user1', 'PlayerOne', 1500, 1, 10);
      expect(entry.userId).toBe('user1');
      expect(entry.username).toBe('PlayerOne');
      expect(entry.score).toBe(1500);
      expect(entry.rank).toBe(1);
      expect(entry.gamesPlayed).toBe(10);
    });

    it('should create a LeaderboardEntry instance without gamesPlayed', () => {
      const entry = new LeaderboardEntry('user2', 'PlayerTwo', 1200, 2);
      expect(entry.userId).toBe('user2');
      expect(entry.username).toBe('PlayerTwo');
      expect(entry.score).toBe(1200);
      expect(entry.rank).toBe(2);
      expect(entry.gamesPlayed).toBeUndefined();
    });
  });

  describe('Leaderboard', () => {
    it('should create a Leaderboard instance', () => {
      const entries = [
        new LeaderboardEntry('user1', 'PlayerOne', 1500, 1),
        new LeaderboardEntry('user2', 'PlayerTwo', 1200, 2),
      ];
      const leaderboard = new Leaderboard('TestGame', 'rating', 'all_time', entries, 2, 1, 10, 1);

      expect(leaderboard.gameName).toBe('TestGame');
      expect(leaderboard.metric).toBe('rating');
      expect(leaderboard.period).toBe('all_time');
      expect(leaderboard.entries).toEqual(entries);
      expect(leaderboard.totalItems).toBe(2);
      expect(leaderboard.currentPage).toBe(1);
      expect(leaderboard.pageSize).toBe(10);
      expect(leaderboard.totalPages).toBe(1);
    });
  });

  describe('UserRankDetail', () => {
    it('should create a UserRankDetail instance', () => {
      const surrounding = [
        new LeaderboardEntry('user0', 'PlayerZero', 1600, 1),
        new LeaderboardEntry('user1', 'PlayerOne', 1500, 2),
        new LeaderboardEntry('user2', 'PlayerTwo', 1400, 3),
      ];
      const userRankDetail = new UserRankDetail('user1', 'TestGame', 'rating', 'all_time', 2, 1500, surrounding);

      expect(userRankDetail.userId).toBe('user1');
      expect(userRankDetail.gameName).toBe('TestGame');
      expect(userRankDetail.metric).toBe('rating');
      expect(userRankDetail.period).toBe('all_time');
      expect(userRankDetail.rank).toBe(2);
      expect(userRankDetail.score).toBe(1500);
      expect(userRankDetail.surrounding).toEqual(surrounding);
    });
  });
});
