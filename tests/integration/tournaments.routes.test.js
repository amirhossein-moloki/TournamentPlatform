const request = require('supertest');
const { app, server } = require('../../src/app');
const { sequelize } = require('../../src/infrastructure/database/postgres.connector');
const { User, Game, Tournament, TournamentParticipant } = require('../../src/infrastructure/database/models');
const { generateToken } = require('../../src/utils/jwt');
const { redisAdapter } = require('../../src/config/dependencies');

describe('Tournament Routes', () => {
    let adminUser, regularUser, regularUser2;
    let adminToken, userToken, userToken2;
    let game1;
    let tournament1, tournament2_full, tournament_for_registration;

    const isoFutureDate = (offsetDays = 1) => new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();
    const isoPastDate = (offsetDays = 1) => new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString();


    beforeAll(async () => {
        await sequelize.sync({ force: true });

        if (redisAdapter && typeof redisAdapter.initialize === 'function' && !redisAdapter.getClient()) {
            try {
                await redisAdapter.initialize();
                console.log('Redis initialized for tournament routes tests.');
            } catch (err) {
                console.error('Failed to initialize Redis for tournament routes tests:', err);
            }
        }

        adminUser = await User.create({ username: 'tournAdmin', email: 'tournadmin@example.com', password: 'password', role: 'Admin' });
        adminToken = generateToken({ id: adminUser.id, role: adminUser.role, sub: adminUser.id });

        regularUser = await User.create({ username: 'tournUser1', email: 'tournuser1@example.com', password: 'password', role: 'User' });
        userToken = generateToken({ id: regularUser.id, role: regularUser.role, sub: regularUser.id });

        regularUser2 = await User.create({ username: 'tournUser2', email: 'tournuser2@example.com', password: 'password', role: 'User' });
        userToken2 = generateToken({ id: regularUser2.id, role: regularUser2.role, sub: regularUser2.id });


        game1 = await Game.create({ name: 'Tournament Game', genre: 'Strategy', platform: 'PC', releaseDate: new Date(), developer:"Dev", publisher:"Pub", minPlayers:1, maxPlayers:2 });

        tournament1 = await Tournament.create({
            name: 'Summer Championship',
            gameId: game1.id,
            description: 'Annual summer tournament',
            rules: 'Standard rules apply',
            entryFee: 10.00,
            prizePool: 1000.00,
            maxParticipants: 16,
            startDate: isoFutureDate(7),
            endDate: isoFutureDate(9),
            organizerId: adminUser.id,
            status: 'REGISTRATION_OPEN',
            type: 'SINGLE_ELIMINATION'
        });

        tournament2_full = await Tournament.create({
            name: 'Full Capacity Tournament',
            gameId: game1.id,
            entryFee: 0,
            prizePool: 50,
            maxParticipants: 2, // Small for testing full
            startDate: isoFutureDate(2),
            organizerId: adminUser.id,
            status: 'REGISTRATION_OPEN',
            type: 'SINGLE_ELIMINATION'
        });
        // Fill this tournament
        await TournamentParticipant.create({ tournamentId: tournament2_full.id, userId: adminUser.id, status: 'REGISTERED'}); // admin as a participant
        await TournamentParticipant.create({ tournamentId: tournament2_full.id, userId: regularUser.id, status: 'REGISTERED'});
        // Update count (use case would do this, here manually for test setup)
        tournament2_full.currentParticipantsCount = 2;
        await tournament2_full.save();


        tournament_for_registration = await Tournament.create({
            name: 'Open Reg Tournament',
            gameId: game1.id,
            entryFee: 5.00,
            prizePool: 100,
            maxParticipants: 8,
            startDate: isoFutureDate(3),
            organizerId: adminUser.id,
            status: 'REGISTRATION_OPEN',
            type: 'SINGLE_ELIMINATION'
        });
    });

let server;

beforeAll(async () => {
    await sequelize.sync({ force: true });
    server = app.listen(0);
});

    afterAll(async () => {
        await sequelize.close();
        server.close();
    });

    describe('POST /api/v1/tournaments (Admin Only)', () => {
        const newTournamentData = {
            name: 'Winter Classic',
            gameId: null, // Will be set to game1.id in test
            description: 'The grand winter classic tournament.',
            rules: 'Follow fair play.',
            entryFee: 20,
            prizePool: 2000,
            maxParticipants: 32,
            startDate: isoFutureDate(30),
            endDate: isoFutureDate(32),
        };

        beforeEach(() => {
            newTournamentData.gameId = game1.id; // Ensure gameId is set before each test
        });

        it('should allow an admin to create a tournament', async () => {
            const res = await request(app)
                .post('/api/v1/tournaments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newTournamentData);

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toEqual(newTournamentData.name);
            expect(res.body.data.gameId).toEqual(game1.id);
            expect(res.body.data.organizerId).toEqual(adminUser.id); // Or creator's ID
        });

        it('should not allow a regular user to create a tournament', async () => {
            const res = await request(app)
                .post('/api/v1/tournaments')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newTournamentData);
            expect(res.statusCode).toEqual(403); // Forbidden
        });

        it('should return 400 if required fields are missing (e.g., name)', async () => {
            const { name, ...incompleteData } = newTournamentData;
            const res = await request(app)
                .post('/api/v1/tournaments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(incompleteData);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('"name" is required');
        });

        it('should return 400 if gameId is not a valid UUID', async () => {
            const res = await request(app)
                .post('/api/v1/tournaments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...newTournamentData, gameId: 'invalid-uuid' });
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('"gameId" must be a valid GUID');
        });

        it('should return 400 if startDate is not in the future', async () => {
            const res = await request(app)
                .post('/api/v1/tournaments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...newTournamentData, startDate: isoPastDate(1) });
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('Start date must be in the future');
        });
         it('should return 404 if gameId does not exist', async () => {
            const nonExistentGameId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .post('/api/v1/tournaments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...newTournamentData, gameId: nonExistentGameId });
            expect(res.statusCode).toEqual(404); // Assuming CreateTournamentUseCase checks for game existence
            expect(res.body.message).toMatch(/Game with ID .* not found/i);
        });
    });

    describe('GET /api/v1/tournaments (Public)', () => {
        it('should return a list of tournaments', async () => {
            const res = await request(app).get('/api/v1/tournaments');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toBeInstanceOf(Array);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(3); // tournament1, tournament2_full, tournament_for_registration
            expect(res.body.data.items[0]).toHaveProperty('name');
            expect(res.body.data.items[0]).toHaveProperty('gameName');
        });

        it('should filter tournaments by status', async () => {
            // Create a tournament with a different status for testing filter
            await Tournament.create({ name: 'Completed Tourn', gameId: game1.id, entryFee:0, prizePool:0, maxParticipants:2, startDate: isoPastDate(2), endDate: isoPastDate(1), organizerId: adminUser.id, status: 'COMPLETED', type:'SINGLE_ELIMINATION' });
            const res = await request(app).get('/api/v1/tournaments?status=COMPLETED');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
            res.body.data.items.forEach(t => expect(t.status).toEqual('COMPLETED'));
        });

        it('should filter tournaments by gameId', async () => {
            const otherGame = await Game.create({ name: 'Other Game', genre:'Other', platform:'Mobile', releaseDate:new Date(), developer:"D", publisher:"P", minPlayers:1,maxPlayers:1});
            await Tournament.create({ name: 'Other Game Tourn', gameId: otherGame.id, entryFee:0, prizePool:0, maxParticipants:2, startDate: isoFutureDate(1), organizerId: adminUser.id, status: 'REGISTRATION_OPEN', type:'SINGLE_ELIMINATION' });

            const res = await request(app).get(`/api/v1/tournaments?gameId=${game1.id}`);
            expect(res.statusCode).toEqual(200);
            const gameNames = res.body.data.items.map(t => t.gameName);
            expect(gameNames).not.toContain('Other Game');
            gameNames.forEach(gn => expect(gn).toEqual(game1.name)); // All returned tournaments should be for game1
        });

        it('should handle pagination (page and limit)', async () => {
            const res = await request(app).get('/api/v1/tournaments?page=1&limit=2');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toBeLessThanOrEqual(2);
            expect(res.body.data.page).toBe(1);
            expect(res.body.data.limit).toBe(2);
            expect(res.body.data.totalPages).toBeGreaterThanOrEqual(Math.ceil(3/2)); // At least 3 tournaments created in beforeAll
        });
    });

    describe('GET /api/v1/tournaments/:id (Public)', () => {
        it('should return details of a specific tournament', async () => {
            const res = await request(app).get(`/api/v1/tournaments/${tournament1.id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toEqual(tournament1.id);
            expect(res.body.data.name).toEqual(tournament1.name);
            expect(res.body.data.game.name).toEqual(game1.name); // Game details included
        });

        it('should return 404 if tournament not found', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app).get(`/api/v1/tournaments/${nonExistentId}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should return 400 for an invalid tournament ID format', async () => {
            const res = await request(app).get('/api/v1/tournaments/invalid-id');
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Invalid Tournament ID.');
        });

        it('should include participants if requested (and supported by use case)', async () => {
            // This test depends on GetTournamentUseCase supporting `includeParticipants`
            // Add a participant to tournament1 for this test
            await TournamentParticipant.create({ tournamentId: tournament1.id, userId: regularUser.id, status: 'REGISTERED'});
            tournament1.currentParticipantsCount = (tournament1.currentParticipantsCount || 0) + 1;
            await tournament1.save();

            const res = await request(app).get(`/api/v1/tournaments/${tournament1.id}?include=participants`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.participants).toBeInstanceOf(Array);
            expect(res.body.data.participants.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data.participants[0].userId).toEqual(regularUser.id);
        });
    });

    describe('POST /api/v1/tournaments/:id/register (Authenticated User)', () => {
        it('should allow an authenticated user to register for an open tournament', async () => {
            // User regularUser2 registers for tournament_for_registration
            const res = await request(app)
                .post(`/api/v1/tournaments/${tournament_for_registration.id}/register`)
                .set('Authorization', `Bearer ${userToken2}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/Successfully registered/i);
            expect(res.body.data.tournamentId).toEqual(tournament_for_registration.id);
            expect(res.body.data.userId).toEqual(regularUser2.id);
            expect(res.body.data.status).toEqual('CONFIRMED'); // Or 'REGISTERED'

            const participant = await TournamentParticipant.findOne({
                where: { tournamentId: tournament_for_registration.id, userId: regularUser2.id }
            });
            expect(participant).not.toBeNull();
        });

        it('should not allow registration if tournament is full', async () => {
            // tournament2_full is already full (adminUser, regularUser)
            // regularUser2 tries to register
            const res = await request(app)
                .post(`/api/v1/tournaments/${tournament2_full.id}/register`)
                .set('Authorization', `Bearer ${userToken2}`);
            expect(res.statusCode).toEqual(403); // Forbidden or Conflict
            expect(res.body.message).toMatch(/Tournament is full/i);
        });

        it('should not allow registration if registration is closed', async () => {
            const closedTournament = await Tournament.create({
                name: 'Closed Reg Tourn', gameId: game1.id, entryFee:0, prizePool:0, maxParticipants:4, startDate: isoFutureDate(5), organizerId: adminUser.id, status: 'REGISTRATION_CLOSED', type:'SINGLE_ELIMINATION'
            });
            const res = await request(app)
                .post(`/api/v1/tournaments/${closedTournament.id}/register`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toMatch(/Registration for this tournament is not open/i);
        });

        it('should return 409 if user is already registered', async () => {
            // regularUser is already in tournament2_full. Let them try to register again.
            const res = await request(app)
                .post(`/api/v1/tournaments/${tournament2_full.id}/register`)
                .set('Authorization', `Bearer ${userToken}`); // regularUser's token
            expect(res.statusCode).toEqual(409); // Conflict
            expect(res.body.message).toMatch(/User already registered/i);
        });

        it('should return 401 if user is not authenticated', async () => {
            const res = await request(app)
                .post(`/api/v1/tournaments/${tournament_for_registration.id}/register`);
            expect(res.statusCode).toEqual(401);
        });

        it('should return 404 if tournament for registration not found', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .post(`/api/v1/tournaments/${nonExistentId}/register`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(404);
        });
    });
});
