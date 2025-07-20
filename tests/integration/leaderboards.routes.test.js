const request = require('supertest');
const { app, server } = require('../../src/app');
const { sequelize } = require('../../src/infrastructure/database/postgres.connector');
const { User, Game, LeaderboardEntry } = require('../../src/infrastructure/database/models'); // Assuming LeaderboardEntry model
const { generateToken } = require('../../src/utils/jwt');
const { leaderboardService, redisAdapter } = require('../../src/config/dependencies'); // To potentially mock or spy

// Mock the leaderboard service if it makes external calls or has complex logic not suitable for integration DB setup
// jest.mock('../../src/config/dependencies', () => ({
//     ...jest.requireActual('../../src/config/dependencies'),
//     leaderboardService: {
//         getLeaderboardUseCase: {
//             execute: jest.fn(),
//         },
//         getUserRankUseCase: {
//             execute: jest.fn(),
//         },
//     },
// }));

describe('Leaderboard Routes', () => {
    let user1, user2;
    let game1;
    // let token1; // Not strictly needed for public leaderboard routes

    beforeAll(async () => {
        await sequelize.sync({ force: true });
        // Ensure Redis is initialized before tests that might use it
        if (redisAdapter && typeof redisAdapter.initialize === 'function' && !redisAdapter.getClient()) {
            try {
                await redisAdapter.initialize();
                console.log('Redis initialized for leaderboard tests.');
            } catch (err) {
                console.error('Failed to initialize Redis for leaderboard tests:', err);
                // Optionally, throw the error to stop tests if Redis is critical
                // throw err;
            }
        }


        user1 = await User.create({ username: 'leaderUser1', email: 'leader1@example.com', password: 'password' });
        user2 = await User.create({ username: 'leaderUser2', email: 'leader2@example.com', password: 'password' });
        // token1 = generateToken({ id: user1.id, role: user1.role });

        game1 = await Game.create({
            name: 'Epic Quest RPG',
            description: 'A grand adventure',
            genre: 'RPG',
            platform: 'PC',
            releaseDate: new Date(),
            developer: 'Devs R Us',
            publisher: 'Pubs Inc',
            minPlayers: 1,
            maxPlayers: 1
        });

        // Manually create some leaderboard entries for testing
        // This depends on how LeaderboardEntry model is structured and if it's used directly
        // Or if the use cases populate a read-optimized store (e.g. Redis)
        // For this test, we'll assume the use cases can work with a relational DB for simplicity,
        // or that we'd mock the service layer for more complex scenarios.

        // If your LeaderboardRepository reads from LeaderboardEntry model:
        if (LeaderboardEntry) {
            await LeaderboardEntry.create({
                userId: user1.id,
                gameId: game1.id, // Assuming gameId is used to link to game name internally
                gameName: game1.name, // Or directly store gameName
                metric: 'rating',
                value: 1500,
                period: 'all_time',
                lastUpdated: new Date(),
                userName: user1.username, // Denormalized for performance
            });
            await LeaderboardEntry.create({
                userId: user2.id,
                gameId: game1.id,
                gameName: game1.name,
                metric: 'rating',
                value: 1600, // user2 has higher rating
                period: 'all_time',
                lastUpdated: new Date(),
                userName: user2.username,
            });
            await LeaderboardEntry.create({
                userId: user1.id,
                gameId: game1.id,
                gameName: game1.name,
                metric: 'wins',
                value: 10,
                period: 'all_time',
                lastUpdated: new Date(),
                userName: user1.username,
            });
        } else {
            // If LeaderboardEntry model doesn't exist or isn't used this way,
            // these tests would rely more on mocking the leaderboardService.execute calls.
            // For now, we proceed assuming the use cases can derive leaderboards from existing data
            // or a simplified LeaderboardEntry model.
            console.warn("LeaderboardEntry model not found or used; tests might be limited or require service mocking.");

            // Example of mocking if direct DB seeding is not feasible:
            // leaderboardService.getLeaderboardUseCase.execute.mockImplementation(async (params) => {
            //     if (params.gameName === 'Epic Quest RPG' && params.metric === 'rating') {
            //         return {
            //             gameName: params.gameName,
            //             metric: params.metric,
            //             period: params.period,
            //             entries: [
            //                 { userId: user2.id, userName: user2.username, rank: 1, value: 1600, otherData: {} },
            //                 { userId: user1.id, userName: user1.username, rank: 2, value: 1500, otherData: {} },
            //             ],
            //             totalItems: 2,
            //             currentPage: params.page || 1,
            //             pageSize: params.limit || 20,
            //             totalPages: Math.ceil(2 / (params.limit || 20)),
            //         };
            //     }
            //     return { entries: [], totalItems: 0, currentPage: 1, pageSize: params.limit || 20, totalPages: 0 };
            // });
        }
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

    describe('GET /api/v1/leaderboards', () => {
        it('should return a leaderboard for a given game and metric', async () => {
            // This test assumes the `getLeaderboardUseCase` can fetch/calculate data.
            // If it relies on a separate store (like Redis) that isn't populated here,
            // you'd need to mock `leaderboardService.getLeaderboardUseCase.execute`.
            // For now, let's assume it works or we'd mock it.

            // To make this test pass without complex seeding or mocking, let's mock the use case
            const mockLeaderboardData = {
                gameName: 'Epic Quest RPG', metric: 'rating', period: 'all_time',
                entries: [
                    { userId: user2.id, userName: user2.username, rank: 1, value: 1600, otherData: {} },
                    { userId: user1.id, userName: user1.username, rank: 2, value: 1500, otherData: {} },
                ],
                totalItems: 2, currentPage: 1, pageSize: 20, totalPages: 1,
            };
            leaderboardService.getLeaderboardUseCase.execute = jest.fn().mockResolvedValue(mockLeaderboardData);


            const res = await request(app)
                .get('/api/v1/leaderboards')
                .query({ gameName: 'Epic Quest RPG', metric: 'rating', period: 'all_time' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('leaderboard');
            expect(res.body.data.leaderboard.length).toBe(2);
            expect(res.body.data.leaderboard[0].value).toEqual(1600); // Higher score first
            expect(res.body.data.gameName).toEqual('Epic Quest RPG');
            expect(res.body.data.metric).toEqual('rating');
        });

        it('should return 400 if gameName is missing', async () => {
            const res = await request(app)
                .get('/api/v1/leaderboards')
                .query({ metric: 'rating' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors[0]).toContain('"gameName" is required');
        });

        it('should use default values for metric, period, page, limit if not provided', async () => {
             leaderboardService.getLeaderboardUseCase.execute = jest.fn().mockResolvedValue({
                gameName: 'Epic Quest RPG', metric: 'rating', period: 'all_time',
                entries: [], totalItems: 0, currentPage: 1, pageSize: 20, totalPages: 0,
            });

            const res = await request(app)
                .get('/api/v1/leaderboards')
                .query({ gameName: 'Epic Quest RPG' });

            expect(res.statusCode).toEqual(200);
            expect(leaderboardService.getLeaderboardUseCase.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    gameName: 'Epic Quest RPG',
                    metric: 'rating', // default
                    period: 'all_time', // default
                    page: 1, // default
                    limit: 20, // default
                })
            );
        });

        it('should handle pagination correctly', async () => {
            leaderboardService.getLeaderboardUseCase.execute = jest.fn().mockResolvedValue({
                gameName: 'Epic Quest RPG', metric: 'rating', period: 'all_time',
                entries: [{ userId: user2.id, userName: user2.username, rank: 1, value: 1600 }], // Only one entry for this page
                totalItems: 2, currentPage: 1, pageSize: 1, totalPages: 2,
            });

            const res = await request(app)
                .get('/api/v1/leaderboards')
                .query({ gameName: 'Epic Quest RPG', limit: 1, page: 1 });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.leaderboard.length).toBe(1);
            expect(res.body.data.currentPage).toBe(1);
            expect(res.body.data.pageSize).toBe(1);
            expect(res.body.data.totalPages).toBe(2);
        });
    });

    describe('GET /api/v1/leaderboards/user/:userId', () => {
        it("should return a user's rank details", async () => {
            // Similar to above, this might need mocking if the DB setup is not straightforward
            const mockUserRankData = {
                userId: user1.id,
                gameName: 'Epic Quest RPG',
                metric: 'rating',
                period: 'all_time',
                rank: 2,
                score: 1500, // This is 'value' in the entity, use case adapts it
                surrounding: [
                    { userId: user2.id, userName: user2.username, rank: 1, value: 1600 },
                    { userId: user1.id, userName: user1.username, rank: 2, value: 1500 },
                ],
            };
            leaderboardService.getUserRankUseCase.execute = jest.fn().mockResolvedValue(mockUserRankData);

            const res = await request(app)
                .get(`/api/v1/leaderboards/user/${user1.id}`)
                .query({ gameName: 'Epic Quest RPG', metric: 'rating' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.userId).toEqual(user1.id);
            expect(res.body.data.rank).toBe(2);
            expect(res.body.data.value).toBe(1500);
            expect(res.body.data.surrounding.length).toBe(2);
        });

        it('should return 400 if gameName is missing for user rank', async () => {
            const res = await request(app)
                .get(`/api/v1/leaderboards/user/${user1.id}`)
                .query({ metric: 'rating' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors[0]).toContain('"gameName" is required');
        });

        it('should return 400 for an invalid userId format', async () => {
            const res = await request(app)
                .get('/api/v1/leaderboards/user/invalid-user-id-format')
                .query({ gameName: 'Epic Quest RPG' });

            // The route itself does a basic check, not full UUID, so 'invalid-user-id-format' would pass that.
            // If the use case or repo then fails due to format, it might be a 404 or 500.
            // The route has: Joi.string().uuid().validate(userId).error && Joi.string().alphanum().min(1).validate(userId).error
            // 'invalid-user-id-format' contains '-', so it's not alphanum. It's not UUID. So this should be a 400 from the route.
            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Invalid user ID format');
        });

        it('should return 404 if user not found on leaderboard (mocked)', async () => {
            leaderboardService.getUserRankUseCase.execute = jest.fn().mockImplementation(() => {
                 const error = new Error('User not found on this leaderboard.');
                 error.statusCode = 404; // Simulate ApiError structure
                 error.isOperational = true;
                 throw error;
            });

            const nonExistentUserId = '00000000-0000-0000-0000-000000000000'; // Valid UUID format
            const res = await request(app)
                .get(`/api/v1/leaderboards/user/${nonExistentUserId}`)
                .query({ gameName: 'Any Game', metric: 'score' });

            expect(res.statusCode).toEqual(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('User not found on this leaderboard');
        });
    });
});
