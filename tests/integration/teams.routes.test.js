const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app'); // Main Express app
const { sequelize } = require('../../src/infrastructure/database/postgres.connector');
const { User, Team, TeamMember } = require('../../src/infrastructure/database/models'); // Sequelize Models
const { generateTestToken } = require('../utils/tokenGenerator'); // Utility to generate JWT for tests
const { insertUsers, clearUsers, clearTeams, clearTeamMembers } = require('../utils/dbTestUtils'); // DB utilities

describe('Team Routes Integration Tests', () => {
  let testUser1, testUser2;
  let tokenUser1, tokenUser2;

  beforeAll(async () => {
    // Ensure DB is connected, and migrations are up to date.
    // await sequelize.sync({ force: true }); // Or run migrations if not using sync in test env
  });

  beforeEach(async () => {
    // Clear relevant tables before each test
    await clearTeamMembers();
    await clearTeams();
    await clearUsers();

    // Setup initial users
    [testUser1] = await insertUsers([{ username: 'user1', email: 'user1@example.com', passwordHash: 'hashedpassword1', role: 'User' }]);
    [testUser2] = await insertUsers([{ username: 'user2', email: 'user2@example.com', passwordHash: 'hashedpassword2', role: 'User' }]);

    tokenUser1 = generateTestToken({ id: testUser1.id, role: testUser1.role, email: testUser1.email });
    tokenUser2 = generateTestToken({ id: testUser2.id, role: testUser2.role, email: testUser2.email });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/teams', () => {
    it('should create a new team successfully and set creator as owner', async () => {
      const newTeamData = { name: 'The Awesome Team', description: 'A very awesome team.' };
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(newTeamData)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(newTeamData.name);
      expect(res.body.description).toBe(newTeamData.description);
      expect(res.body.ownerId).toBe(testUser1.id);

      // Verify in database
      const teamInDb = await Team.findByPk(res.body.id);
      expect(teamInDb).not.toBeNull();
      expect(teamInDb.name).toBe(newTeamData.name);
      expect(teamInDb.ownerId).toBe(testUser1.id);

      const teamOwnerMember = await TeamMember.findOne({
        where: { teamId: res.body.id, userId: testUser1.id },
      });
      expect(teamOwnerMember).not.toBeNull();
      expect(teamOwnerMember.role).toBe('owner');
      expect(teamOwnerMember.status).toBe('active');
    });

    it('should return 401 Unauthorized if no token is provided', async () => {
      const newTeamData = { name: 'No Auth Team' };
      await request(app)
        .post('/api/teams')
        .send(newTeamData)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 400 Bad Request if team name is missing', async () => {
      const newTeamData = { description: 'This team has no name.' };
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(newTeamData)
        .expect(httpStatus.BAD_REQUEST);

      // Assuming your error middleware formats errors consistently
      // expect(res.body.message).toContain('name is required');
    });

    it('should return 409 Conflict if team name already exists', async () => {
      // Pre-insert a team with the same name by the same user or another
      await Team.create({ name: 'Existing Name', ownerId: testUser2.id, description: 'An old team' });

      const newTeamData = { name: 'Existing Name', description: 'Trying to create with duplicate name.' };
      await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(newTeamData)
        .expect(httpStatus.CONFLICT);
    });
  });

  describe('GET /api/teams/:teamId', () => {
    let createdTeam;
    beforeEach(async () => {
        // Create a team for testing GET by ID
        const team = await Team.create({ name: 'Gettable Team', ownerId: testUser1.id, description: 'Team for GET test' });
        // Add owner as member
        await TeamMember.create({teamId: team.id, userId: testUser1.id, role: 'owner', status: 'active'});
        createdTeam = team;
    });

    it('should retrieve a specific team by its ID', async () => {
        const res = await request(app)
            .get(`/api/teams/${createdTeam.id}`)
            .set('Authorization', `Bearer ${tokenUser1}`)
            .expect(httpStatus.OK);

        expect(res.body.id).toBe(createdTeam.id);
        expect(res.body.name).toBe(createdTeam.name);
        expect(res.body.ownerId).toBe(testUser1.id);
        expect(res.body.owner).toBeDefined(); // Check if owner details are included
        expect(res.body.owner.id).toBe(testUser1.id);
    });

    it('should return 404 Not Found if team ID does not exist', async () => {
        const nonExistentUuid = '123e4567-e89b-12d3-a456-426614174000';
        await request(app)
            .get(`/api/teams/${nonExistentUuid}`)
            .set('Authorization', `Bearer ${tokenUser1}`)
            .expect(httpStatus.NOT_FOUND);
    });

     it('should return 401 Unauthorized if no token is provided for GET /:teamId', async () => {
      await request(app)
        .get(`/api/teams/${createdTeam.id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  // TODO: Add tests for GET /api/teams (list all teams with pagination and filters)
  // TODO: Add tests for PUT /api/teams/:teamId (update team)
  // TODO: Add tests for DELETE /api/teams/:teamId (delete team)
  // TODO: Add tests for PATCH /api/teams/:teamId/owner (change owner)

  // TODO: Add tests for Team Member routes (POST, GET, DELETE, PATCH under /api/teams/:teamId/members/)
  // Example for adding a member:
  describe('POST /api/teams/:teamId/members', () => {
    let teamForAddingMembers;
     beforeEach(async () => {
        teamForAddingMembers = await Team.create({ name: 'Team For Members', ownerId: testUser1.id });
        await TeamMember.create({teamId: teamForAddingMembers.id, userId: testUser1.id, role: 'owner', status: 'active'});
    });

    it('should allow team owner to add a new member to the team', async () => {
        const res = await request(app)
            .post(`/api/teams/${teamForAddingMembers.id}/members`)
            .set('Authorization', `Bearer ${tokenUser1}`) // testUser1 is the owner
            .send({ userId: testUser2.id, role: 'member' })
            .expect(httpStatus.CREATED);

        expect(res.body.userId).toBe(testUser2.id);
        expect(res.body.teamId).toBe(teamForAddingMembers.id);
        expect(res.body.role).toBe('member');
        expect(res.body.status).toBe('invited'); // Default status from use case

        const memberInDb = await TeamMember.findOne({ where: { teamId: teamForAddingMembers.id, userId: testUser2.id }});
        expect(memberInDb).not.toBeNull();
        expect(memberInDb.role).toBe('member');
    });

    // Add more tests: non-owner trying to add, adding non-existent user, adding existing member, etc.
  });

});

// Mock utilities (dbTestUtils.js, tokenGenerator.js) would need to be implemented:
// generateTestToken: Creates a JWT similar to your actual auth system.
// insertUsers, clearUsers, etc.: Helper functions to interact with DB for test setup/teardown.
// Example dbTestUtils.js:
// const { User, Team, TeamMember } = require('../../src/infrastructure/database/models');
// const clearUsers = () => User.destroy({ where: {}, truncate: true, cascade: true });
// const insertUsers = (users) => User.bulkCreate(users, { individualHooks: true }); // Use hooks for password hashing if set up
// Similar for Team and TeamMember.
// Need to handle password hashing for User creation carefully if not using individualHooks or if service layer does it.
// For tests, you might insert pre-hashed passwords or mock the hashing.
