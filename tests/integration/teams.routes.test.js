const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { sequelize } = require('../../src/infrastructure/database/postgres.connector');
const { User, Team, TeamMember } = require('../../src/infrastructure/database/models');
const { generateToken } = require('../../src/utils/jwt');

describe('Team Routes Integration Tests', () => {
  let testUser1, testUser2, adminUser;
  let tokenUser1, tokenUser2, adminToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testUser1 = await User.create({ id: 'a15a1357-8242-42f5-8495-17482335c6e7', username: 'user1', email: 'user1@example.com', password: 'password1', roles: ['PLAYER'], isVerified: true });
    testUser2 = await User.create({ id: 'a15a1357-8242-42f5-8495-17482335c6e8', username: 'user2', email: 'user2@example.com', password: 'password2', roles: ['PLAYER'], isVerified: true });
    adminUser = await User.create({ id: 'a15a1357-8242-42f5-8495-17482335c6e9', username: 'admin', email: 'admin@example.com', password: 'password3', roles: ['ADMIN'], isVerified: true });

    tokenUser1 = generateToken({ sub: testUser1.id, roles: testUser1.roles, tokenVersion: testUser1.tokenVersion });
    tokenUser2 = generateToken({ sub: testUser2.id, roles: testUser2.roles, tokenVersion: testUser2.tokenVersion });
    adminToken = generateToken({ sub: adminUser.id, roles: adminUser.roles, tokenVersion: adminUser.tokenVersion });
  });

  let server;

  beforeAll(async () => {
      await sequelize.sync({ force: true });
      server = app.listen(0);
  });

  afterAll(done => {
    sequelize.close().then(() => {
        server.close(done);
    });
  });

  describe('POST /api/v1/teams', () => {
    it('should create a new team and set the creator as the owner', async () => {
      const newTeamData = { name: 'The Awesome Team', description: 'A very awesome team.', tag: 'AWE' };

      const res = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(newTeamData)
        .expect(httpStatus.CREATED);

      expect(res.body.data.name).toBe(newTeamData.name);
      expect(res.body.data.ownerId).toBe(testUser1.id);

      const teamInDb = await Team.findByPk(res.body.data.id);
      expect(teamInDb).not.toBeNull();

      const teamOwnerMember = await TeamMember.findOne({
        where: { teamId: res.body.data.id, userId: testUser1.id },
      });
      expect(teamOwnerMember).not.toBeNull();
      expect(teamOwnerMember.role).toBe('OWNER');
    });

    it('should return 401 Unauthorized if no token is provided', async () => {
      await request(app)
        .post('/api/v1/teams')
        .send({ name: 'No Auth Team' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 400 Bad Request if team name is missing', async () => {
      await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ description: 'This team has no name.' })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 409 Conflict if team name already exists', async () => {
      await Team.create({ name: 'Existing Name', ownerId: testUser2.id });

      await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ name: 'Existing Name' })
        .expect(httpStatus.CONFLICT);
    });
  });
});
