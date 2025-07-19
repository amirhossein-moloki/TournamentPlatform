const request = require('supertest');
const { app, server } = require('../../src/app');
const { sequelize } = require('../../src/infrastructure/database/postgres.connector');
const { User, Game, UserGameProfile } = require('../../src/infrastructure/database/models');
const { generateToken } = require('../../src/utils/jwt');
const { redisAdapter } = require('../../src/config/dependencies');

describe('User Routes', () => {
    let adminUser, user1, user2;
    let adminToken, token1, token2;
    let game1;

    beforeAll(async () => {
        await sequelize.sync({ force: true });

        if (redisAdapter && typeof redisAdapter.initialize === 'function' && !redisAdapter.getClient()) {
            try {
                await redisAdapter.initialize();
                console.log('Redis initialized for user routes tests.');
            } catch (err) {
                console.error('Failed to initialize Redis for user routes tests:', err);
            }
        }

        adminUser = await User.create({ username: 'userAdmin', email: 'useradmin@example.com', password: 'password', role: 'Admin', isVerified: true });
        adminToken = generateToken({ id: adminUser.id, role: adminUser.role, sub: adminUser.id });

        user1 = await User.create({ username: 'testUser1', email: 'user1@example.com', password: 'password123', role: 'User', isVerified: true });
        token1 = generateToken({ id: user1.id, role: user1.role, sub: user1.id });

        user2 = await User.create({ username: 'testUser2', email: 'user2@example.com', password: 'password123', role: 'User', isVerified: false });
        token2 = generateToken({ id: user2.id, role: user2.role, sub: user2.id });

        game1 = await Game.create({ name: 'User Game Profile Game', genre: 'RPG', platform: 'PC', releaseDate: new Date(), developer:"Dev", publisher:"Pub", minPlayers:1, maxPlayers:1 });

        // Create a game profile for user1 and game1
        await UserGameProfile.create({
            userId: user1.id,
            gameId: game1.id,
            ign: 'User1GamerTag',
            rank: 'Gold',
            gameSpecificData: { mmr: 1200 }
        });
    });

    afterAll(async () => {
        await sequelize.close();
        server.close();
    });

    // --- /api/v1/users/me ---
    describe('GET /api/v1/users/me', () => {
        it('should get current user profile', async () => {
            const res = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${token1}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toEqual(user1.id);
            expect(res.body.data.username).toEqual(user1.username);
            expect(res.body.data.email).toEqual(user1.email); // Assuming email is part of public profile
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app).get('/api/v1/users/me');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('PUT /api/v1/users/me', () => {
        it('should update current user profile', async () => {
            const newUsername = 'updatedUser1';
            const res = await request(app)
                .put('/api/v1/users/me')
                .set('Authorization', `Bearer ${token1}`)
                .send({ username: newUsername });
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toEqual(newUsername);

            // Verify in DB
            const updatedUser = await User.findByPk(user1.id);
            expect(updatedUser.username).toEqual(newUsername);
            // Reset username for other tests
            updatedUser.username = 'testUser1';
            await updatedUser.save();
        });

        it('should return 400 if no update data provided', async () => {
            const res = await request(app)
                .put('/api/v1/users/me')
                .set('Authorization', `Bearer ${token1}`)
                .send({});
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/No update data provided/i);
        });

        it('should return 400 for invalid update data (e.g. username too short)', async () => {
            const res = await request(app)
                .put('/api/v1/users/me')
                .set('Authorization', `Bearer ${token1}`)
                .send({ username: 'u' }); // too short
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('must be at least 3 characters long');
        });
    });

    // --- Admin User Management (/api/v1/users/) ---
    describe('GET /api/v1/users (Admin)', () => {
        it('should list all users for admin', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toBeInstanceOf(Array);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(3); // adminUser, user1, user2
        });

        it('should filter users by role for admin', async () => {
            const res = await request(app)
                .get('/api/v1/users?role=Admin')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            res.body.data.items.forEach(user => expect(user.role).toEqual('Admin'));
        });

        it('should filter users by isVerified status for admin', async () => {
            const res = await request(app)
                .get('/api/v1/users?isVerified=false')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            // Check if user2 (isVerified: false) is in the list
            const foundUser2 = res.body.data.items.find(u => u.id === user2.id);
            expect(foundUser2).toBeDefined();
            res.body.data.items.forEach(user => {
                if (user.id === user2.id) expect(user.isVerified).toBe(false);
            });
        });


        it('should return 403 if non-admin tries to list users', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${token1}`);
            expect(res.statusCode).toEqual(403);
        });
    });

    describe('GET /api/v1/users/:id (Admin)', () => {
        it('should get a specific user by ID for admin', async () => {
            const res = await request(app)
                .get(`/api/v1/users/${user1.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.id).toEqual(user1.id);
        });

        it('should return 404 for non-existent user ID for admin', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .get(`/api/v1/users/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
        });

        it('should return 400 for invalid user ID format for admin', async () => {
            const res = await request(app)
                .get(`/api/v1/users/invalid-id`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/Invalid User ID format/i);
        });
    });

    describe('PUT /api/v1/users/:id (Admin)', () => {
        it('should allow admin to update a user', async () => {
            const newUsername = 'adminUpdatedUser2';
            const newRole = 'Admin'; // Promoting user2 to Admin for test
            const res = await request(app)
                .put(`/api/v1/users/${user2.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ username: newUsername, role: newRole, isVerified: true });
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.username).toEqual(newUsername);
            expect(res.body.data.role).toEqual(newRole);
            expect(res.body.data.isVerified).toBe(true);

            const updatedUser = await User.findByPk(user2.id);
            expect(updatedUser.username).toEqual(newUsername);
            expect(updatedUser.role).toEqual(newRole);
            expect(updatedUser.isVerified).toBe(true);
            // Reset for other tests
            updatedUser.username = 'testUser2';
            updatedUser.role = 'User';
            updatedUser.isVerified = false;
            await updatedUser.save();
        });

        it('should return 400 if admin provides no update data', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${user2.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/No update data provided/i);
        });
    });

    describe('DELETE /api/v1/users/:id (Admin)', () => {
        let userToDelete;
        beforeEach(async () => {
            userToDelete = await User.create({ username: 'userToDelete', email: 'delete@example.com', password: 'password' });
        });
        afterEach(async () => {
            // Ensure cleanup if test fails before delete
            const stillExists = await User.findByPk(userToDelete.id);
            if (stillExists) await stillExists.destroy({force: true});
        });

        it('should allow admin to delete a user', async () => {
            const res = await request(app)
                .delete(`/api/v1/users/${userToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toMatch(/User deleted successfully/i);

            const deletedUser = await User.findByPk(userToDelete.id);
            expect(deletedUser).toBeNull(); // Or check for a soft delete flag
        });

        it('should not allow admin to delete their own account', async () => {
            const res = await request(app)
                .delete(`/api/v1/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(403);
            expect(res.body.message).toMatch(/Admin cannot delete their own account/i);
        });
    });

    // --- /api/v1/users/me/game-profiles ---
    describe('User Game Profiles (/me/game-profiles)', () => {
        const newProfileData = {
            gameId: null, // Will be set to game1.id
            ign: 'MyNewIGN',
            rank: 'Diamond',
            gameSpecificData: { server: 'EUW' }
        };
        beforeEach(() => {
            newProfileData.gameId = game1.id;
        });

        describe('POST /api/v1/users/me/game-profiles', () => {
            it('should create a new game profile for the user', async () => {
                // user2 creates a profile for game1
                const res = await request(app)
                    .post('/api/v1/users/me/game-profiles')
                    .set('Authorization', `Bearer ${token2}`)
                    .send(newProfileData);

                expect(res.statusCode).toEqual(201); // Created
                expect(res.body.success).toBe(true);
                expect(res.body.data.userId).toEqual(user2.id);
                expect(res.body.data.gameId).toEqual(game1.id);
                expect(res.body.data.ign).toEqual(newProfileData.ign);

                const profile = await UserGameProfile.findOne({ where: { userId: user2.id, gameId: game1.id }});
                expect(profile).not.toBeNull();
                await profile.destroy(); // Clean up
            });

            it('should update an existing game profile for the user', async () => {
                // user1 updates their existing profile for game1
                const updatedIgn = 'User1UpdatedIGN';
                const res = await request(app)
                    .post('/api/v1/users/me/game-profiles')
                    .set('Authorization', `Bearer ${token1}`)
                    .send({ gameId: game1.id, ign: updatedIgn });

                expect(res.statusCode).toEqual(200); // OK for update
                expect(res.body.data.ign).toEqual(updatedIgn);

                const profile = await UserGameProfile.findOne({ where: { userId: user1.id, gameId: game1.id }});
                expect(profile.ign).toEqual(updatedIgn);
                // Reset for other tests
                profile.ign = 'User1GamerTag';
                await profile.save();
            });

            it('should return 400 if gameId is missing', async () => {
                 const { gameId, ...payload } = newProfileData;
                 const res = await request(app)
                    .post('/api/v1/users/me/game-profiles')
                    .set('Authorization', `Bearer ${token2}`)
                    .send(payload);
                expect(res.statusCode).toEqual(400);
                expect(res.body.errors[0]).toContain('"gameId" is required');
            });

            it('should return 400 if ign is missing', async () => {
                 const { ign, ...payload } = newProfileData;
                 const res = await request(app)
                    .post('/api/v1/users/me/game-profiles')
                    .set('Authorization', `Bearer ${token2}`)
                    .send(payload);
                expect(res.statusCode).toEqual(400);
                expect(res.body.errors[0]).toContain('"ign" is required');
            });

            it('should return 404 if gameId does not exist', async () => {
                const nonExistentGameId = '00000000-0000-0000-0000-000000000000';
                const res = await request(app)
                    .post('/api/v1/users/me/game-profiles')
                    .set('Authorization', `Bearer ${token2}`)
                    .send({ ...newProfileData, gameId: nonExistentGameId });
                expect(res.statusCode).toEqual(404);
                expect(res.body.message).toMatch(/Game not found/i);
            });
        });

        describe('GET /api/v1/users/me/game-profiles', () => {
            it('should get all game profiles for the current user', async () => {
                // user1 has one profile for game1
                const res = await request(app)
                    .get('/api/v1/users/me/game-profiles')
                    .set('Authorization', `Bearer ${token1}`);

                expect(res.statusCode).toEqual(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data).toBeInstanceOf(Array);
                expect(res.body.data.length).toBe(1);
                expect(res.body.data[0].gameId).toEqual(game1.id);
                expect(res.body.data[0].ign).toEqual('User1GamerTag');
            });
        });

        describe('GET /api/v1/users/me/game-profiles/:gameId', () => {
            it('should get a specific game profile for the user by gameId', async () => {
                const res = await request(app)
                    .get(`/api/v1/users/me/game-profiles/${game1.id}`)
                    .set('Authorization', `Bearer ${token1}`);

                expect(res.statusCode).toEqual(200);
                expect(res.body.data.gameId).toEqual(game1.id);
                expect(res.body.data.ign).toEqual('User1GamerTag');
            });

            it('should return 404 if profile for that game does not exist for user', async () => {
                // user2 does not have a profile for game1 initially
                const res = await request(app)
                    .get(`/api/v1/users/me/game-profiles/${game1.id}`)
                    .set('Authorization', `Bearer ${token2}`);
                expect(res.statusCode).toEqual(404);
                expect(res.body.message).toMatch(/Profile not found for this game/i);
            });

            it('should return 400 for invalid gameId format', async () => {
                 const res = await request(app)
                    .get(`/api/v1/users/me/game-profiles/invalid-game-id`)
                    .set('Authorization', `Bearer ${token1}`);
                expect(res.statusCode).toEqual(400);
                expect(res.body.message).toMatch(/Invalid game ID format/i);
            });
        });
    });
});
