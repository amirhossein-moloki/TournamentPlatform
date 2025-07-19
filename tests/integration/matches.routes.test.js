const request = require('supertest');
const { app, server } = require('../../src/app');
const { sequelize, User, Game, Tournament, TournamentParticipant, Match } = require('../../src/infrastructure/database/postgres.connector');
const { generateToken } = require('../../src/utils/jwt');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"); // For mocking S3
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner"); // For mocking S3

jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");


describe('Match Routes', () => {
    let user1, user2, adminUser;
    let token1, token2, adminToken;
    let game;
    let tournament;
    let match1; // Match between user1 and user2

    beforeAll(async () => {
        await sequelize.sync({ force: true });

        adminUser = await User.create({ username: 'matchAdmin', email: 'matchadmin@example.com', password: 'password', role: 'Admin' });
        adminToken = generateToken({ id: adminUser.id, role: adminUser.role, sub: adminUser.id });

        user1 = await User.create({ username: 'matchUser1', email: 'matchuser1@example.com', password: 'password', role: 'User' });
        token1 = generateToken({ id: user1.id, role: user1.role, sub: user1.id });

        user2 = await User.create({ username: 'matchUser2', email: 'matchuser2@example.com', password: 'password', role: 'User' });
        token2 = generateToken({ id: user2.id, role: user2.role, sub: user2.id });

        game = await Game.create({ name: 'Match Game', genre: 'Fighting', platform: 'Arcade', releaseDate: new Date(), developer:"Dev", publisher:"Pub", minPlayers:1, maxPlayers:2 });
        tournament = await Tournament.create({
            name: 'Match Tournament',
            gameId: game.id,
            startDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 48), // Day after tomorrow
            maxParticipants: 2,
            organizerId: adminUser.id,
            status: 'OPEN',
            type: 'SINGLE_ELIMINATION',
            entryFee: 0,
        });

        // Enroll participants
        await TournamentParticipant.create({ tournamentId: tournament.id, userId: user1.id, status: 'REGISTERED' });
        await TournamentParticipant.create({ tournamentId: tournament.id, userId: user2.id, status: 'REGISTERED' });

        // Update tournament status to ACTIVE and create matches (simplified)
        // In a real scenario, match generation is complex. Here we create one manually.
        tournament.status = 'ACTIVE';
        await tournament.save();

        match1 = await Match.create({
            tournamentId: tournament.id,
            participant1Id: user1.id, // User entity ID
            participant2Id: user2.id, // User entity ID
            round: 1,
            status: 'PENDING', // Ready for result submission
            scheduledTime: new Date(Date.now() + 1000 * 60 * 30), // In 30 mins
        });

        // Configure mock for S3 operations
        S3Client.mockImplementation(() => ({
            send: jest.fn().mockResolvedValue({}), // Mock S3 client's send method
        }));
        getSignedUrl.mockResolvedValue('https://s3.mock.url/upload-here?sig=mocked');

    });

    afterAll(async () => {
        await sequelize.close();
        server.close();
    });

    describe('GET /api/v1/matches/:id', () => {
        it('should allow a participant to get match details', async () => {
            const res = await request(app)
                .get(`/api/v1/matches/${match1.id}`)
                .set('Authorization', `Bearer ${token1}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toEqual(match1.id);
            expect(res.body.data.participant1.id).toEqual(user1.id); // Check participant details
            expect(res.body.data.participant2.id).toEqual(user2.id);
        });

        it('should not allow a non-participant to get match details (if restricted)', async () => {
            const otherUser = await User.create({ username: 'otherMatchUser', email: 'othermatch@example.com', password: 'password' });
            const otherToken = generateToken({ id: otherUser.id, role: otherUser.role, sub: otherUser.id });

            const res = await request(app)
                .get(`/api/v1/matches/${match1.id}`)
                .set('Authorization', `Bearer ${otherToken}`);

            // This behavior depends on GetMatchUseCase's authorization logic.
            // It might return 403 (Forbidden) or 404 (if hiding existence).
            // Let's assume 403 for now.
            expect(res.statusCode).toBe(403); // Or 404
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/not authorized to view this match/i);
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app).get(`/api/v1/matches/${match1.id}`);
            expect(res.statusCode).toEqual(401);
        });

        it('should return 404 for a non-existent match ID', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .get(`/api/v1/matches/${nonExistentId}`)
                .set('Authorization', `Bearer ${token1}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should return 400 for an invalid match ID format', async () => {
            const res = await request(app)
                .get('/api/v1/matches/invalid-id-format')
                .set('Authorization', `Bearer ${token1}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/Invalid Match ID format/i);
        });
    });

    describe('POST /api/v1/matches/:id/results/upload-url', () => {
        const uploadRequestPayload = {
            filename: 'result.png',
            contentType: 'image/png',
        };

        it('should allow a participant to get an upload URL', async () => {
            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results/upload-url`)
                .set('Authorization', `Bearer ${token1}`)
                .send(uploadRequestPayload);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('uploadUrl');
            expect(res.body.data).toHaveProperty('fileKey');
            expect(res.body.data.uploadUrl).toEqual('https://s3.mock.url/upload-here?sig=mocked');
            // Check if getSignedUrl was called with expected parameters by the use case (mocked)
            expect(getSignedUrl).toHaveBeenCalled();
        });

        it('should return 400 for invalid filename', async () => {
            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results/upload-url`)
                .set('Authorization', `Bearer ${token1}`)
                .send({ ...uploadRequestPayload, filename: 'result.txt' }); // Invalid extension
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('Filename must be a valid image name');
        });

        it('should return 400 for invalid contentType', async () => {
            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results/upload-url`)
                .set('Authorization', `Bearer ${token1}`)
                .send({ ...uploadRequestPayload, contentType: 'application/pdf' });
            expect(res.statusCode).toEqual(400);
             expect(res.body.errors[0]).toContain('Content type must be one of image/png, image/jpeg, image/gif');
        });


        it('should return 403 if non-participant tries to get upload URL', async () => {
            const otherUser = await User.create({ username: 'anotherMatchUser', email: 'another@example.com', password: 'password' });
            const otherToken = generateToken({ id: otherUser.id, role: otherUser.role, sub: otherUser.id });
            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results/upload-url`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send(uploadRequestPayload);
            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toMatch(/not authorized to perform this action/i);
        });
    });

    describe('POST /api/v1/matches/:id/results', () => {
        // Assume user1 won
        const resultPayload = {
            winningParticipantId: user1.id, // This should be the User ID
            scoreParticipant1: 2,
            scoreParticipant2: 1,
            resultScreenshotFileKey: 'mocked/s3/filekey/result.png', // From upload-url response
            comments: 'Good game!',
        };

        it('should allow a participant to submit match results', async () => {
            // First, ensure the match is in a state that allows submission (e.g., PENDING)
            match1.status = 'PENDING';
            await match1.save();

            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results`)
                .set('Authorization', `Bearer ${token1}`) // User1 submitting the result
                .send(resultPayload);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.matchId).toEqual(match1.id);
            expect(res.body.data.status).toEqual('COMPLETED'); // Or 'PENDING_CONFIRMATION' depending on logic

            // Verify the match in DB
            const updatedMatch = await Match.findByPk(match1.id);
            expect(updatedMatch.status).toEqual('COMPLETED'); // Or 'PENDING_CONFIRMATION'
            expect(updatedMatch.winnerId).toEqual(user1.id);
            expect(updatedMatch.scoreParticipant1).toEqual(resultPayload.scoreParticipant1);
            expect(updatedMatch.scoreParticipant2).toEqual(resultPayload.scoreParticipant2);
        });

        it('should return 400 if winningParticipantId is missing', async () => {
            const { winningParticipantId, ...payload } = resultPayload;
            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results`)
                .set('Authorization', `Bearer ${token1}`)
                .send(payload);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('"winningParticipantId" is required');
        });

        it('should return 400 if resultScreenshotFileKey is missing', async () => {
            const { resultScreenshotFileKey, ...payload } = resultPayload;
            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results`)
                .set('Authorization', `Bearer ${token1}`)
                .send(payload);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('"resultScreenshotFileKey" is required');
        });

        it('should return 403 if a non-participant tries to submit results', async () => {
            const otherUser = await User.create({ username: 'submitNonParticipant', email: 'submitnon@example.com', password: 'password' });
            const otherToken = generateToken({ id: otherUser.id, role: otherUser.role, sub: otherUser.id });

            // Reset match status for this test if needed
            match1.status = 'PENDING';
            match1.winnerId = null;
            await match1.save();

            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send(resultPayload);
            expect(res.statusCode).toEqual(403);
             expect(res.body.message).toMatch(/not authorized to submit results/i);
        });

        it('should return 409 if results are already submitted and confirmed', async () => {
            // Ensure match is completed for this test
            match1.status = 'COMPLETED';
            match1.winnerId = user1.id; // Assume user1 already won
            await match1.save();

            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results`)
                .set('Authorization', `Bearer ${token2}`) // User2 trying to submit again
                .send({ ...resultPayload, winningParticipantId: user2.id }); // Different winner

            expect(res.statusCode).toEqual(409); // Conflict
            expect(res.body.message).toMatch(/Match result already submitted and confirmed/i);
        });

        it('should return 404 if winningParticipantId does not exist', async () => {
            match1.status = 'PENDING';
            match1.winnerId = null;
            await match1.save();

            const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .post(`/api/v1/matches/${match1.id}/results`)
                .set('Authorization', `Bearer ${token1}`)
                .send({ ...resultPayload, winningParticipantId: nonExistentUserId });
            expect(res.statusCode).toEqual(404);
            expect(res.body.message).toMatch(/Winning participant not found or not part of this match/i);
        });
    });
});
