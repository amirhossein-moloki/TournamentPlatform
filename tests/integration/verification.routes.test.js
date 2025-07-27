const request = require('supertest');
const { app } = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');
const http = require('http');

jest.mock('../../src/infrastructure/database/models', () => ({
  User: {
    create: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Tournament: {
    create: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Match: {
    create: jest.fn(),
  },
  TournamentParticipant: {
      findAll: jest.fn(),
  },
  Wallet: {
      findOne: jest.fn(),
  }
}));

const { User, Tournament, Match, TournamentParticipant, Wallet } = require('../../src/infrastructure/database/models');

describe('Verification Routes', () => {
  let server;
  let adminUser, user1;

  beforeAll((done) => {
    server = http.createServer(app);
    server.listen(done);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    adminUser = {
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: 'hashedpassword',
      roles: 'ADMIN',
      hasRole: (role) => role === 'ADMIN',
    };
    user1 = {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcde0',
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hashedpassword',
        roles: 'PLAYER',
        verificationLevel: 1,
        idCardPhotoUrl: null,
        verificationVideoUrl: null,
        hasRole: (role) => role === 'PLAYER',
        update: jest.fn(),
    };
    User.findByPk.mockImplementation((id) => {
        if (id === adminUser.id) return Promise.resolve(adminUser);
        if (id === user1.id) return Promise.resolve(user1);
        return Promise.resolve(null);
    });
    User.findOne.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/users/me/submit-id-card', () => {
    it('should submit an ID card for verification', async () => {
        const token = generateToken({ id: user1.id, roles: user1.roles });
        const response = await request(server)
          .post('/api/v1/users/me/submit-id-card')
          .set('Authorization', `Bearer ${token}`)
          .attach('idCard', 'tests/fixtures/test-image.png');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('ID card submitted successfully. Waiting for admin approval.');
      });
  });
});
