const request = require('supertest');
const { app } = require('../../src/app');
const { User, Tournament } = require('../../src/infrastructure/database/models');
const { generateToken } = require('../../src/utils/jwt');

describe('Tournament Decision Routes', () => {
  let managerUser, tournament;

  beforeAll(async () => {
    await User.destroy({ where: {} });
    await Tournament.destroy({ where: {} });

    managerUser = await User.create({
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      username: 'manager',
      email: 'manager@example.com',
      passwordHash: 'hashedpassword',
      roles: 'TOURNAMENT_MANAGER',
    });

    tournament = await Tournament.create({
        id: 't1b2c3d4-e5f6-7890-1234-567890abcdef',
        name: 'Test Tournament',
        gameId: 'g1b2c3d4-e5f6-7890-1234-567890abcdef',
        status: 'AWAITING_DECISION',
        isSingleMatch: true,
        startDate: new Date(),
        maxParticipants: 2,
    });
  });

  afterAll(async () => {
    await User.destroy({ where: {} });
    await Tournament.destroy({ where: {} });
  });

  describe('POST /api/v1/tournaments/:id/decide', () => {
    it('should start a single match tournament', async () => {
      const token = generateToken({ id: managerUser.id, roles: managerUser.roles });
      const response = await request(app)
        .post(`/api/v1/tournaments/${tournament.id}/decide`)
        .set('Authorization', `Bearer ${token}`)
        .send({ decision: 'start' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Tournament started successfully.');
    });
  });
});
