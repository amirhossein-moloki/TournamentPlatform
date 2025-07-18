const request = require('supertest');
const { app } = require('../../src/app');
const { server } = require('../../server');
const { sequelize, User, Op } = require('../../src/infrastructure/database/postgres.connector');
const { generateToken } = require('../../src/utils/jwt');

describe('Admin User Management Routes (/api/v1/admin/users)', () => {
    let adminUser, regularUser1, regularUser2;
    let adminToken, userToken;

    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await User.destroy({ where: {}, truncate: true });

        // Create users
        adminUser = await User.create({ username: 'adminUser', email: 'admin@example.com', password: 'password', role: 'Admin', isVerified: true });
        regularUser1 = await User.create({ username: 'testuser1', email: 'test1@example.com', password: 'password', role: 'User', isVerified: true });
        regularUser2 = await User.create({ username: 'testuser2', email: 'test2@example.com', password: 'password', role: 'User', isVerified: false });

        // Generate tokens
        adminToken = generateToken({ id: adminUser.id, role: adminUser.role, sub: adminUser.id });
        userToken = generateToken({ id: regularUser1.id, role: regularUser1.role, sub: regularUser1.id });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    // --- GET /api/v1/admin/users ---
    describe('GET /api/v1/admin/users', () => {
        it('should be forbidden for non-admin users', async () => {
            const res = await request(app)
                .get('/api/v1/admin/users')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should list all users for an admin', async () => {
            const res = await request(app)
                .get('/api/v1/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items).toBeInstanceOf(Array);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(3);
        });

        it('should filter users by role', async () => {
            const res = await request(app)
                .get('/api/v1/admin/users?role=Admin')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toEqual(1);
            expect(res.body.data.items[0].role).toEqual('Admin');
        });

        it('should filter users by verification status', async () => {
            const res = await request(app)
                .get('/api/v1/admin/users?isVerified=false')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toEqual(1);
            expect(res.body.data.items[0].isVerified).toEqual(false);
        });
    });

    // --- GET /api/v1/admin/users/:id ---
    describe('GET /api/v1/admin/users/:id', () => {
        it('should get a specific user by ID for an admin', async () => {
            const res = await request(app)
                .get(`/api/v1/admin/users/${regularUser1.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.id).toEqual(regularUser1.id);
            expect(res.body.data.username).toEqual(regularUser1.username);
        });
    });

    // --- PUT /api/v1/admin/users/:id ---
    describe('PUT /api/v1/admin/users/:id', () => {
        it('should allow an admin to update a user', async () => {
            const newUsername = 'updatedUsernameByAdmin';
            const res = await request(app)
                .put(`/api/v1/admin/users/${regularUser1.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ username: newUsername, role: 'User' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.username).toEqual(newUsername);
            const dbUser = await User.findByPk(regularUser1.id);
            expect(dbUser.username).toEqual(newUsername);
        });
    });

    // --- DELETE /api/v1/admin/users/:id ---
    describe('DELETE /api/v1/admin/users/:id', () => {
        it('should allow an admin to delete a user', async () => {
            const userToDelete = await User.create({ username: 'toDelete', email: 'delete@me.com', password: 'password' });
            const res = await request(app)
                .delete(`/api/v1/admin/users/${userToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            const findUser = await User.findByPk(userToDelete.id);
            expect(findUser).toBeNull();
        });

        it('should not allow an admin to delete themselves', async () => {
            const res = await request(app)
                .delete(`/api/v1/admin/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(400);
        });
    });

    // --- Role Management ---
    describe('POST /api/v1/admin/users/:id/roles', () => {
        it('should allow an admin to assign a role to a user', async () => {
            const res = await request(app)
                .post(`/api/v1/admin/users/${regularUser1.id}/roles`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'DisputeModerator' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.roles).toContain('DisputeModerator');
        });
    });

    describe('DELETE /api/v1/admin/users/:id/roles/:role', () => {
        it('should allow an admin to remove a role from a user', async () => {
            // First add a role to remove
            await request(app)
                .post(`/api/v1/admin/users/${regularUser1.id}/roles`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'FinanceManager' });

            // Now remove it
            const res = await request(app)
                .delete(`/api/v1/admin/users/${regularUser1.id}/roles/FinanceManager`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.roles).not.toContain('FinanceManager');
        });
    });
});
