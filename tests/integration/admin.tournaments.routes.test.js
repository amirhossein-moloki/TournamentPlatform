// tests/integration/admin.tournaments.routes.test.js
const request = require('supertest');
const { app, server } = require('../../src/app'); // Corrected path and include server for close
const db = require('../../src/infrastructure/database/models'); // Sequelize models
const { generateToken } = require('../../src/utils/jwt'); // Corrected path for generateToken
const { UserRole } = require('../../src/domain/user/user.entity');
const { TournamentStatus } = require('../../src/domain/tournament/tournament.entity');


// Helper to create users and tokens
let adminUser, regularUser, adminToken, regularUserToken, testGame, testTournament;

// Adjusted setupTestUser to match the User model structure more closely for creation
const setupTestUser = async (role = UserRole.USER, isVerified = true, usernameSuffix = '') => {
  const uniqueSuffix = Date.now() + usernameSuffix;
  const userData = {
    username: `test${role}${uniqueSuffix}`,
    email: `test${role}${uniqueSuffix}@example.com`,
    password: 'password123', // Plain password, will be hashed by User model hooks if set up
    role: role,
    isVerified: isVerified,
    // tokenVersion: 0, // Assuming User model sets this default or it's handled
  };
  const user = await db.UserModel.create(userData);
  // Pass sub, role for token generation as per typical JWT setup
  const token = generateToken({ sub: user.id, role: user.role });
  return { user, token };
};

describe('Admin Tournament Routes', () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    // Clean and setup database before all tests
    // Create users
    const adminData = await setupTestUser(UserRole.ADMIN, true, 'admin');
    adminUser = adminData.user;
    adminToken = adminData.token;

    const regularData = await setupTestUser(UserRole.USER, true, 'regular'); // Changed to USER from PLAYER if PLAYER is not a direct role
    regularUser = regularData.user;
    regularUserToken = regularData.token;

    // Create a game
    testGame = await db.GameModel.create({
        name: 'Test Game for Admin Tournaments',
        // shortName: 'TGAT', // Assuming shortName is not a field or optional
        description: 'A game for testing admin tournament routes',
        platform: 'PC',
        genre: 'Strategy',
        releaseDate: new Date(),
        developer: 'Test Dev', // Added missing required fields
        publisher: 'Test Pub',
        minPlayers: 1,
        maxPlayers: 2,
        // bannerImageUrl: 'http://example.com/banner.jpg', // Assuming optional
        // isActive: true // Assuming optional or defaults to true
    });

    // Create a base tournament for testing updates, status changes, etc.
    testTournament = await db.TournamentModel.create({
        name: 'Initial Test Tournament',
        gameId: testGame.id,
        description: 'A tournament to be managed by admin.',
        rules: 'Standard rules apply.',
        status: TournamentStatus.PENDING, // Using imported enum
        entryFee: 10,
        prizePool: 100,
        maxParticipants: 16,
        // currentParticipants: 0, // Usually handled by triggers or logic, not set directly
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        organizerId: adminUser.id,
        type: 'SINGLE_ELIMINATION', // Added missing type
        // bannerImageUrl: 'http://example.com/tour_banner.jpg', // Assuming optional
        // bracketType: 'SINGLE_ELIMINATION', // 'type' field is used for this
        // settings: { someSetting: true } // Assuming optional
    });
  });

  let server;

  beforeAll(async () => {
      await db.sequelize.sync({ force: true });
      server = app.listen(0);
  });

  afterAll(done => {
    db.sequelize.close().then(() => {
        server.close(done);
    });
  });

  // --- PUT /admin/tournaments/:id ---
  describe('PUT /api/v1/admin/tournaments/:id', () => {
    it('should allow Admin to update a tournament', async () => {
      const updateData = {
        name: 'Updated Tournament Name by Admin',
        description: 'Updated description.',
        entryFee: 15,
      };
      const response = await request(app)
        .put(`/api/v1/admin/tournaments/${testTournament.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.entryFee).toBe(updateData.entryFee);

      const dbTournament = await db.TournamentModel.findByPk(testTournament.id);
      expect(dbTournament.name).toBe(updateData.name);
    });

    it('should forbid non-Admin from updating a tournament', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/tournaments/${testTournament.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ name: 'Attempted Update' });
      expect(response.statusCode).toBe(403);
    });

    it('should return 400 for invalid update data', async () => {
        const updateData = { entryFee: -100 }; // Invalid entry fee
        const response = await request(app)
            .put(`/api/v1/admin/tournaments/${testTournament.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData);
        expect(response.statusCode).toBe(400); // Joi validation from schema
    });

    it('should return 404 if tournament to update is not found', async () => {
        const response = await request(app)
            .put(`/api/v1/admin/tournaments/00000000-0000-0000-0000-000000000000`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'No such tournament' });
        expect(response.statusCode).toBe(404);
    });
  });

  // --- PATCH /admin/tournaments/:id/status ---
  describe('PATCH /api/v1/admin/tournaments/:id/status', () => {
    let statusTestTournament;
    beforeAll(async () => { // Create a dedicated tournament for status tests to avoid interference
        statusTestTournament = await db.TournamentModel.create({
            name: 'Status Test Tournament', gameId: testGame.id, status: 'PENDING',
            startDate: new Date(Date.now() + 3600000), maxParticipants: 8, entryFee: 0, prizePool: 0
        });
    });

    it('should allow Admin to change tournament status (e.g., PENDING to REGISTRATION_OPEN)', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/tournaments/${statusTestTournament.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newStatus: 'REGISTRATION_OPEN' }); // TournamentStatus.REGISTRATION_OPEN

      expect(response.statusCode).toBe(200);
      expect(response.body.data.status).toBe('REGISTRATION_OPEN');
      const dbTournament = await db.TournamentModel.findByPk(statusTestTournament.id);
      expect(dbTournament.status).toBe('REGISTRATION_OPEN');
    });

    it('should require reason when changing status to CANCELED', async () => {
        await request(app) // First, move to a cancelable state if needed e.g. REGISTRATION_OPEN
            .patch(`/api/v1/admin/tournaments/${statusTestTournament.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ newStatus: 'REGISTRATION_OPEN' });

        const responseNoReason = await request(app)
            .patch(`/api/v1/admin/tournaments/${statusTestTournament.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ newStatus: 'CANCELED' }); // TournamentStatus.CANCELED
        expect(responseNoReason.statusCode).toBe(400); // Joi validation: reason required

        const responseWithReason = await request(app)
            .patch(`/api/v1/admin/tournaments/${statusTestTournament.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ newStatus: 'CANCELED', cancelReason: 'Admin cancellation test' });
        expect(responseWithReason.statusCode).toBe(200);
        expect(responseWithReason.body.data.status).toBe('CANCELED');
    });

    it('should return 400 for invalid status transition (as per entity logic)', async () => {
        // Example: trying to open registration for an already COMPLETED tournament
        const completedTournament = await db.TournamentModel.create({
            name: 'Completed Tournament', gameId: testGame.id, status: 'COMPLETED',
            startDate: new Date(Date.now() - 3600000), maxParticipants: 8, entryFee: 0, prizePool: 0
        });
        const response = await request(app)
            .patch(`/api/v1/admin/tournaments/${completedTournament.id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ newStatus: 'REGISTRATION_OPEN' });
        expect(response.statusCode).toBe(400);
    });
  });

  // --- Participant Management: DELETE and GET ---
  describe('Participant Management in /api/v1/admin/tournaments/:tournamentId/participants', () => {
    let participantTournament;
    let participantUser;

    beforeAll(async () => {
        participantTournament = await db.TournamentModel.create({
            name: 'Participant Management Test', gameId: testGame.id, status: 'REGISTRATION_OPEN',
            startDate: new Date(Date.now() + 3600000), maxParticipants: 8, entryFee: 0, prizePool: 0
        });
        // Create a user who will be a participant
        const pUserData = await setupTestUser(UserRole.PLAYER, true, 'participant');
        participantUser = pUserData.user;

        // Register participantUser to participantTournament (simulate via direct DB for test setup ease)
        await db.TournamentParticipantModel.create({
            tournamentId: participantTournament.id,
            participantId: participantUser.id, // This is the User's ID
            participantType: 'user',
            registeredAt: new Date()
        });
        await participantTournament.increment('currentParticipants');
    });

    // GET /admin/tournaments/:id/participants
    it('should allow Admin to list participants of a tournament', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/tournaments/${participantTournament.id}/participants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.participants).toBeInstanceOf(Array);
      expect(response.body.data.participants.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.participants[0].participantId).toBe(participantUser.id);
      expect(response.body.data.totalItems).toBeGreaterThanOrEqual(1);
    });

    // DELETE /admin/tournaments/:tournamentId/participants/:userId
    it('should allow Admin to remove a participant from a tournament', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/tournaments/${participantTournament.id}/participants/${participantUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(204); // No content

      // Verify participant is removed
      const dbParticipant = await db.TournamentParticipantModel.findOne({
          where: { tournamentId: participantTournament.id, participantId: participantUser.id }
      });
      expect(dbParticipant).toBeNull();

      const tour = await db.TournamentModel.findByPk(participantTournament.id);
      expect(tour.currentParticipants).toBe(0); // Assuming only one participant was there
    });

    it('should return 404 if trying to remove a non-existent participant', async () => {
        const response = await request(app)
            .delete(`/api/v1/admin/tournaments/${participantTournament.id}/participants/00000000-0000-0000-0000-000000000000`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404); // User not found or participant entry not found
    });
  });

  // Add more tests for edge cases, different roles, invalid inputs etc.
});
