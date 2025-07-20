const request = require('supertest');
const { app, server } = require('../../src/app'); // Assuming your app entry point is app.js
const { sequelize } = require('../../src/infrastructure/database/postgres.connector');
const { User, Game } = require('../../src/infrastructure/database/models');
const { generateToken } = require('../../src/utils/jwt'); // Assuming you have a JWT utility

// Helper function to create a user and generate a token
const createUserAndLogin = async (isAdmin = false) => {
    const userData = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        role: isAdmin ? 'Admin' : 'User',
    };
    const user = await User.create(userData);
    const token = generateToken({ id: user.id, role: user.role });
    return { user, token };
};

describe('Game Routes', () => {
    let adminToken;
    let userToken;
    let adminUser;
    let regularUser;
    let game1;

    beforeAll(async () => {
        await sequelize.sync({ force: true });
        const adminData = await createUserAndLogin(true);
        adminToken = adminData.token;
        adminUser = adminData.user;

        const userData = await createUserAndLogin(false);
        userToken = userData.token;
        regularUser = userData.user;

        // Pre-populate some games
        game1 = await Game.create({
            name: 'Test Game 1',
            shortName: 'TG1',
            description: 'Description for test game 1',
            platforms: ['PC', 'PS5'],
            supportedModes: ['1v1', '2v2'],
            winCondition: 'higher_score_wins',
        });
        await Game.create({
            name: 'Test Game 2',
            shortName: 'TG2',
            description: 'Description for test game 2',
            platforms: ['Xbox', 'PC'],
            supportedModes: ['1v1'],
            winCondition: 'lower_score_wins',
        });
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

    // --- Test Suite for GET /api/v1/games ---
    describe('GET /api/v1/games', () => {
        it('should return a list of games', async () => {
            const res = await request(app).get('/api/v1/games');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('platforms');
        });
    });

    // --- Test Suite for GET /api/v1/games/:gameId ---
    describe('GET /api/v1/games/:id', () => {
        it('should return details of a specific game', async () => {
            const res = await request(app).get(`/api/v1/games/${game1.id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.id).toEqual(game1.id);
            expect(res.body.name).toEqual(game1.name);
            expect(res.body).toHaveProperty('images');
        });

        it('should return 404 if game not found', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000'; // UUID format
            const res = await request(app).get(`/api/v1/games/${nonExistentId}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should return 400 for invalid gameId format', async () => {
            const res = await request(app).get('/api/v1/games/invalid-id');
            expect(res.statusCode).toEqual(400);
        });
    });

    // --- Test Suite for POST /api/v1/games (Admin only) ---
    describe('POST /api/v1/games', () => {
        const newGameData = {
            name: 'New Awesome Game',
            shortName: 'NAG',
            description: 'The most awesome game ever.',
            platforms: ['PC'],
            supportedModes: ['1v1'],
            winCondition: 'higher_score_wins',
            images: [
                { type: 'icon', url: 'http://example.com/icon.jpg' },
                { type: 'banner', url: 'http://example.com/banner.jpg' },
            ]
        };

        it('should allow an admin to create a new game with images', async () => {
            const res = await request(app)
                .post('/api/v1/games')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newGameData);
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toEqual(newGameData.name);
            expect(res.body.images.length).toEqual(2);
        });

        it('should not allow a regular user to create a game', async () => {
            const res = await request(app)
                .post('/api/v1/games')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newGameData);
            expect(res.statusCode).toEqual(403);
        });

        it('should not allow an unauthenticated user to create a game', async () => {
            const res = await request(app)
                .post('/api/v1/games')
                .send(newGameData);
            expect(res.statusCode).toEqual(401);
        });

        it('should return 400 if required fields are missing', async () => {
            const incompleteData = { name: 'Only Name Game' };
            const res = await request(app)
                .post('/api/v1/games')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(incompleteData);
            expect(res.statusCode).toEqual(400);
        });
    });

    // --- Test Suite for PUT /api/v1/games/:gameId (Admin only) ---
    describe('PUT /api/v1/games/:id', () => {
        const updatedGameData = {
            name: 'Updated Test Game 1',
            images: [
                { type: 'icon', url: 'http://example.com/new_icon.jpg' },
            ]
        };

        it('should allow an admin to update an existing game', async () => {
            const res = await request(app)
                .put(`/api/v1/games/${game1.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.name).toEqual(updatedGameData.name);
            expect(res.body.images.length).toEqual(1);
            expect(res.body.images[0].url).toEqual(updatedGameData.images[0].url);
        });

        it('should not allow a regular user to update a game', async () => {
            const res = await request(app)
                .put(`/api/v1/games/${game1.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(403);
        });

        it('should return 404 if admin tries to update a non-existent game', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .put(`/api/v1/games/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(404);
        });

        it('should return 400 for invalid gameId format on update', async () => {
            const res = await request(app)
                .put('/api/v1/games/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(400);
        });
    });

    // --- Test Suite for DELETE /api/v1/games/:gameId (Admin only) ---
    describe('DELETE /api/v1/games/:id', () => {
        let gameToDelete;

        beforeAll(async () => {
            // Create a game specifically for deletion tests to avoid conflicts
            gameToDelete = await Game.create({
                name: 'Game To Delete',
                shortName: 'GTD',
                description: 'This game will be deleted',
                platforms: ['PC'],
                supportedModes: ['1v1'],
                winCondition: 'higher_score_wins',
            });
        });

        it('should allow an admin to delete a game', async () => {
            const res = await request(app)
                .delete(`/api/v1/games/${gameToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(204);

            // Verify game is actually deleted
            const findRes = await request(app).get(`/api/v1/games/${gameToDelete.id}`);
            expect(findRes.statusCode).toEqual(404);
        });

        it('should not allow a regular user to delete a game', async () => {
            const tempGame = await Game.create({ name: 'Another Game to Delete Attempt', shortName: 'AGDA' });
            const res = await request(app)
                .delete(`/api/v1/games/${tempGame.id}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
            await tempGame.destroy(); // Clean up
        });

        it('should return 404 if admin tries to delete a non-existent game', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .delete(`/api/v1/games/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should return 400 for invalid gameId format on delete', async () => {
            const res = await request(app)
                .delete('/api/v1/games/invalid-id-format')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
        });
    });
});
