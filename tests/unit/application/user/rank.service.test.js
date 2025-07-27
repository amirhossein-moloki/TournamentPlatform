const { RankService } = require('../../../../src/application/user/rank.service');
const { User } = require('../../../../src/domain/user/user.entity');
const { Rank } = require('../../../../src/domain/rank/rank.entity');

describe('RankService', () => {
  let userRepository;
  let rankRepository;
  let rankService;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    rankRepository = {
      findRankByPoints: jest.fn(),
    };
    rankService = new RankService(userRepository, rankRepository);
  });

  it('should update user rank when they reach a new threshold', async () => {
    const user = new User('1', 'test', 'test@test.com', 'hash', ['PLAYER'], null, false, null, new Date(), new Date(), null, 0, null, 100);
    const newRank = new Rank('2', 'Gold', 'url', 100);
    userRepository.findById.mockResolvedValue(user);
    rankRepository.findRankByPoints.mockResolvedValue(newRank);

    await rankService.updateUserRank('1');

    expect(userRepository.update).toHaveBeenCalledWith(expect.objectContaining({
      rankId: '2',
    }));
  });

  it('should add points to a user and update their rank', async () => {
    const user = new User('1', 'test', 'test@test.com', 'hash', ['PLAYER'], null, false, null, new Date(), new Date(), null, 0, null, 50);
    const newRank = new Rank('2', 'Gold', 'url', 100);
    userRepository.findById.mockResolvedValue(user);
    rankRepository.findRankByPoints.mockResolvedValue(newRank);

    await rankService.addPoints('1', 50);

    expect(userRepository.update).toHaveBeenCalledWith(expect.objectContaining({
      points: 100,
      rankId: '2',
    }));
  });
});
