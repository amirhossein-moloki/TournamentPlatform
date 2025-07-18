const request = require('supertest');
const { app } = require('../../src/app');
const { server } = require('../../server');
const { sequelize } = require('../../src/infrastructure/database/postgres.connector');
const { User, Game, LeaderboardEntry } = require('../../src/infrastructure/database/models');

describe('Leaderboard Routes', () => {
    let user1, user2;
    let game1;

    beforeAll(async () => {
        await sequelize.sync({ force: true });

        user1 = await User.create({ id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', username: 'leaderUser1', email: 'leader1@example.com', password: 'password' });
        user2 = await User.create({ id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0', username: 'leaderUser2', email: 'leader2@example.com', password: 'password' });

        game1 = await Game.create({
            id: 'g1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
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
    });

    beforeEach(async () => {
        if (LeaderboardEntry) {
            await LeaderboardEntry.destroy({ where: {}, truncate: true });
            await LeaderboardEntry.create({
                userId: user1.id,
                gameId: game1.id,
                gameName: game1.name,
                metric: 'rating',
                value: 1500,
                period: 'all_time',
                lastUpdated: new Date(),
                userName: user1.username,
            });
            await LeaderboardEntry.create({
                userId: user2.id,
                gameId: game1.id,
                gameName: game1.name,
                metric: 'rating',
                value: 1600,
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
        }
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        await LeaderboardEntry.destroy({ where: {}, truncate: true });
    });

    describe('GET /api/v1/leaderboards', () => {
        it('should return a leaderboard for a given game and metric', async () => {
            const res = await request(app)
                .get('/api/v1/leaderboards')
                .query({ gameName: 'Epic Quest RPG', metric: 'rating', period: 'all_time' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('leaderboard');
        });

        it('should return 400 if gameName is missing', async () => {
            const res = await request(app)
                .get('/api/v1/leaderboards')
                .query({ metric: 'rating' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors[0]).toContain('"gameName" is required');
        });
    });

    describe('GET /api/v1/leaderboards/user/:userId', () => {
        it("should return a user's rank details", async () => {
            const res = await request(app)
                .get(`/api/v1/leaderboards/user/${user1.id}`)
                .query({ gameName: 'Epic Quest RPG', metric: 'rating' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.userRank).toBe(null);
        });

        it('should return 400 if gameName is missing for user rank', async () => {
            const res = await request(app)
                .get(`/api/v1/leaderboards/user/${user1.id}`)
                .query({ metric: 'rating' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors[0]).toContain('"gameName" is required');
        });
    });
});
