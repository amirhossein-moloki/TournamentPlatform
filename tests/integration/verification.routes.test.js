const request = require('supertest');
const { app } = require('../../src/app');
const { User } = require('../../src/infrastructure/database/models');
const { generateToken } = require('../../src/utils/jwt');

describe('Verification Routes', () => {
  let adminUser, user1;

  beforeAll(async () => {
    await User.destroy({ where: {} });
    adminUser = await User.create({
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: 'hashedpassword',
      roles: 'ADMIN',
    });
    user1 = await User.create({
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcde0',
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hashedpassword',
    });
  });

  afterAll(async () => {
    await User.destroy({ where: {} });
  });

  describe('POST /api/v1/users/me/submit-id-card', () => {
    it('should submit an ID card for verification', async () => {
      const token = generateToken({ id: user1.id, roles: user1.roles });
      const response = await request(app)
        .post('/api/v1/users/me/submit-id-card')
        .set('Authorization', `Bearer ${token}`)
        .attach('idCard', 'tests/fixtures/test-image.png');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('ID card submitted successfully. Waiting for admin approval.');
    });
  });
});
