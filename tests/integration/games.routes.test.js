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
        await sequelize.sync({ force: true }); // Reset database before tests

        const adminData = await createUserAndLogin(true);
        adminToken = adminData.token;
        adminUser = adminData.user;

        const userData = await createUserAndLogin(false);
        userToken = userData.token;
        regularUser = userData.user;

        // Pre-populate some games
        game1 = await Game.create({
            name: 'Test Game 1',
            description: 'Description for test game 1',
            genre: 'Adventure',
            platform: 'PC',
            releaseDate: new Date('2023-01-01'),
            developer: 'Test Dev',
            publisher: 'Test Pub',
            minPlayers: 1,
            maxPlayers: 4,
            // coverImageUrl: 'http://example.com/cover1.jpg',
        });
        await Game.create({
            name: 'Test Game 2',
            description: 'Description for test game 2',
            genre: 'Strategy',
            platform: 'PS5',
            releaseDate: new Date('2023-05-01'),
            developer: 'Another Dev',
            publisher: 'Another Pub',
            minPlayers: 1,
            maxPlayers: 2,
        });
    });

    afterAll(async () => {
        await sequelize.close();
        server.close(); // Close the server after tests
    });

    // --- Test Suite for GET /api/v1/games ---
    describe('GET /api/v1/games', () => {
        it('should return a list of games', async () => {
            const res = await request(app).get('/api/v1/games');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
            expect(res.body.data[0]).toHaveProperty('name');
            expect(res.body.data[0]).toHaveProperty('genre');
        });

        it('should return games with pagination (page and limit)', async () => {
            const res = await request(app).get('/api/v1/games?page=1&limit=1');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.currentPage).toBe(1);
            expect(res.body.pagination.limit).toBe(1);
            expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
        });

        it('should filter games by genre', async () => {
            const res = await request(app).get('/api/v1/games?genre=Adventure');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            res.body.data.forEach(game => {
                expect(game.genre).toEqual('Adventure');
            });
        });

        it('should filter games by platform', async () => {
            const res = await request(app).get('/api/v1/games?platform=PC');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            res.body.data.forEach(game => {
                expect(game.platform).toEqual('PC');
            });
        });
    });

    // --- Test Suite for GET /api/v1/games/:gameId ---
    describe('GET /api/v1/games/:gameId', () => {
        it('should return details of a specific game', async () => {
            const res = await request(app).get(`/api/v1/games/${game1.id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toEqual(game1.id);
            expect(res.body.data.name).toEqual(game1.name);
        });

        it('should return 404 if game not found', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000'; // UUID format
            const res = await request(app).get(`/api/v1/games/${nonExistentId}`);
            expect(res.statusCode).toEqual(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/not found/i);
        });

        it('should return 400 for invalid gameId format', async () => {
            const res = await request(app).get('/api/v1/games/invalid-id');
            expect(res.statusCode).toEqual(400); // Assuming UUID validation is in place
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Invalid UUID/i); // Or similar validation message
        });
    });

    // --- Test Suite for POST /api/v1/games (Admin only) ---
    describe('POST /api/v1/games', () => {
        const newGameData = {
            name: 'New Awesome Game',
            description: 'The most awesome game ever.',
            genre: 'RPG',
            platform: 'PC',
            releaseDate: '2024-01-01',
            developer: 'Super Dev',
            publisher: 'Mega Corp',
            minPlayers: 1,
            maxPlayers: 99,
            // coverImageUrl: 'http://example.com/new_cover.jpg'
        };

        it('should allow an admin to create a new game', async () => {
            const res = await request(app)
                .post('/api/v1/games')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newGameData);
            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.name).toEqual(newGameData.name);
        });

        it('should not allow a regular user to create a game', async () => {
            const res = await request(app)
                .post('/api/v1/games')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newGameData);
            expect(res.statusCode).toEqual(403); // Forbidden
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Admin role required/i);
        });

        it('should not allow an unauthenticated user to create a game', async () => {
            const res = await request(app)
                .post('/api/v1/games')
                .send(newGameData);
            expect(res.statusCode).toEqual(401); // Unauthorized
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Authentication token missing or invalid/i);
        });

        it('should return 400 if required fields are missing', async () => {
            const incompleteData = { name: 'Only Name Game' };
            const res = await request(app)
                .post('/api/v1/games')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(incompleteData);
            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/validation failed/i); // Or specific field errors
        });
    });

    // --- Test Suite for PUT /api/v1/games/:gameId (Admin only) ---
    describe('PUT /api/v1/games/:gameId', () => {
        const updatedGameData = {
            name: 'Updated Test Game 1',
            genre: 'Action-Adventure',
            maxPlayers: 8,
        };

        it('should allow an admin to update an existing game', async () => {
            const res = await request(app)
                .put(`/api/v1/games/${game1.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toEqual(updatedGameData.name);
            expect(res.body.data.genre).toEqual(updatedGameData.genre);
            expect(res.body.data.maxPlayers).toEqual(updatedGameData.maxPlayers);
        });

        it('should not allow a regular user to update a game', async () => {
            const res = await request(app)
                .put(`/api/v1/games/${game1.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(403);
            expect(res.body.success).toBe(false);
        });

        it('should return 404 if admin tries to update a non-existent game', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .put(`/api/v1/games/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(404);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for invalid gameId format on update', async () => {
            const res = await request(app)
                .put('/api/v1/games/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatedGameData);
            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Invalid UUID/i);
        });
    });

    // --- Test Suite for DELETE /api/v1/games/:gameId (Admin only) ---
    describe('DELETE /api/v1/games/:gameId', () => {
        let gameToDelete;

        beforeAll(async () => {
            // Create a game specifically for deletion tests to avoid conflicts
            gameToDelete = await Game.create({
                name: 'Game To Delete',
                description: 'This game will be deleted',
                genre: 'Puzzle',
                platform: 'Mobile',
                releaseDate: new Date(),
                developer: 'Temp Dev',
                publisher: 'Temp Pub',
                minPlayers: 1,
                maxPlayers: 1,
            });
        });

        it('should allow an admin to delete a game', async () => {
            const res = await request(app)
                .delete(`/api/v1/games/${gameToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200); // Or 204 if no content is returned
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/deleted successfully/i);

            // Verify game is actually deleted
            const findRes = await request(app).get(`/api/v1/games/${gameToDelete.id}`);
            expect(findRes.statusCode).toEqual(404);
        });

        it('should not allow a regular user to delete a game', async () => {
            // Recreate gameToDelete if it was deleted in a previous run or create a new one
            const tempGame = await Game.create({ name: 'Another Game to Delete Attempt', genre: 'Test', platform: 'Test', releaseDate: new Date(), developer: 'Dev', publisher: 'Pub', minPlayers: 1, maxPlayers:1 });
            const res = await request(app)
                .delete(`/api/v1/games/${tempGame.id}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
            expect(res.body.success).toBe(false);
            await tempGame.destroy(); // Clean up
        });

        it('should return 404 if admin tries to delete a non-existent game', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .delete(`/api/v1/games/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for invalid gameId format on delete', async () => {
            const res = await request(app)
                .delete('/api/v1/games/invalid-id-format')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Invalid UUID/i);
        });
    });
});
