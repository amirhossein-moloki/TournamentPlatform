const request = require('supertest');
const { app } = require('../../src/app');
const { server } = require('../../server');
const {
    sequelize, User, Game, Tournament, TournamentParticipant, Match,
    DisputeTicket, Transaction, Wallet
} = require('../../src/infrastructure/database/postgres.connector');
const { generateToken } = require('../../src/utils/jwt');
const { TournamentStatus } = require('../../src/domain/tournament/tournament.entity');
const { DisputeStatus } = require('../../src/domain/dispute/dispute.entity.js');
const { TransactionStatus, TransactionType } = require('../../src/domain/wallet/transaction.entity');

describe('Admin Routes (/api/v1/admin)', () => {
    let adminUser, disputeModerator, financeManager, regularUser;
    let adminToken, disputeModToken, financeManagerToken, userToken;
    let game1, tournament1, match1, participant1, participant2;
    let dispute1;
    let withdrawalRequest1;
    let walletForWithdrawal;

    const isoFutureDate = (offsetDays = 1) => new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

    beforeAll(async () => {
        await sequelize.sync({ force: true });

        // Users and Tokens
        adminUser = await User.create({ username: 'adminMain', email: 'admin.main@example.com', password: 'password', role: 'Admin', isVerified: true });
        adminToken = generateToken({ id: adminUser.id, role: adminUser.role, sub: adminUser.id });

        disputeModerator = await User.create({ username: 'disputeMod', email: 'disputemod@example.com', password: 'password', role: 'DisputeModerator', isVerified: true });
        disputeModToken = generateToken({ id: disputeModerator.id, role: disputeModerator.role, sub: disputeModerator.id });

        financeManager = await User.create({ username: 'financeMgr', email: 'financemgr@example.com', password: 'password', role: 'FinanceManager', isVerified: true });
        financeManagerToken = generateToken({ id: financeManager.id, role: financeManager.role, sub: financeManager.id });

        regularUser = await User.create({ username: 'adminRouteUser', email: 'adminrouteuser@example.com', password: 'password', role: 'User', isVerified: true });
        userToken = generateToken({ id: regularUser.id, role: regularUser.role, sub: regularUser.id });

        // Game, Tournament, Participants, Match
        game1 = await Game.create({ name: 'Admin Test Game', genre: 'Strategy', platform: 'PC', releaseDate: new Date(), developer:"AG", publisher:"AP", minPlayers:1, maxPlayers:2 });
        tournament1 = await Tournament.create({
            name: 'Admin Test Tournament', gameId: game1.id, entryFee: 10, prizePool: 100, maxParticipants: 2,
            startDate: isoFutureDate(1), organizerId: adminUser.id, status: TournamentStatus.REGISTRATION_OPEN, type: 'SINGLE_ELIMINATION'
        });
    });

    beforeEach(async () => {
        await DisputeTicket.destroy({ where: {}, truncate: true });
        await Transaction.destroy({ where: {}, truncate: true });
        await Wallet.destroy({ where: {}, truncate: true });
        await Match.destroy({ where: {}, truncate: true });
        await TournamentParticipant.destroy({ where: {}, truncate: true });

        participant1 = await TournamentParticipant.create({ tournamentId: tournament1.id, userId: regularUser.id, status: 'REGISTERED' });
        // Need another user for a match
        const tempUserForMatch = await User.create({username: 'tempMatchPlayer', email: 'tempMatch@example.com', password:'password'});
        participant2 = await TournamentParticipant.create({ tournamentId: tournament1.id, userId: tempUserForMatch.id, status: 'REGISTERED' });

        tournament1.status = TournamentStatus.ONGOING; // To allow match creation/disputes
        await tournament1.save();

        match1 = await Match.create({
            tournamentId: tournament1.id, participant1Id: regularUser.id, participant2Id: tempUserForMatch.id,
            round: 1, status: 'PENDING'
        });

        // Dispute
        dispute1 = await DisputeTicket.create({
            matchId: match1.id,
            tournamentId: tournament1.id,
            raisedByUserId: regularUser.id,
            reason: 'Opponent cheated.',
            description: 'Detailed description of cheating.',
            status: DisputeStatus.OPEN,
        });

        // Wallet and Withdrawal
        walletForWithdrawal = await Wallet.create({ userId: regularUser.id, balance: 200.00 });
        withdrawalRequest1 = await Transaction.create({
            walletId: walletForWithdrawal.id,
            type: TransactionType.WITHDRAWAL,
            amount: 50.00,
            status: TransactionStatus.PENDING_APPROVAL,
            description: 'Withdrawal request',
            userId: regularUser.id, // denormalized for easier query
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        await DisputeTicket.destroy({ where: {}, truncate: true });
        await Transaction.destroy({ where: {}, truncate: true });
        await Wallet.destroy({ where: {}, truncate: true });
        await Match.destroy({ where: {}, truncate: true });
        await TournamentParticipant.destroy({ where: {}, truncate: true });
    });

    // --- Dispute Management ---
    describe('GET /api/v1/admin/disputes (DisputeModerator or Admin)', () => {
        it('should list disputes for Admin', async () => {
            const res = await request(app)
                .get('/api/v1/admin/disputes')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data.items[0].id).toEqual(dispute1.id);
        });

        it('should list disputes for DisputeModerator', async () => {
            const res = await request(app)
                .get('/api/v1/admin/disputes')
                .set('Authorization', `Bearer ${disputeModToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
        });

        it('should filter disputes by status', async () => {
            const res = await request(app)
                .get('/api/v1/admin/disputes?status=OPEN')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            res.body.data.items.forEach(d => expect(d.status).toEqual(DisputeStatus.OPEN));
        });

        it('should be forbidden for FinanceManager', async () => {
            const res = await request(app)
                .get('/api/v1/admin/disputes')
                .set('Authorization', `Bearer ${financeManagerToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

    describe('POST /api/v1/admin/disputes/:id/resolve (DisputeModerator or Admin)', () => {
        const resolutionData = {
            resolutionStatus: DisputeStatus.RESOLVED_PARTICIPANT1_WIN,
            resolutionDetails: 'After review, participant 1 is declared the winner.',
        };

        it('should allow Admin to resolve a dispute', async () => {
            const res = await request(app)
                .post(`/api/v1/admin/disputes/${dispute1.id}/resolve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(resolutionData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.status).toEqual(resolutionData.resolutionStatus);
            expect(res.body.data.resolvedByUserId).toEqual(adminUser.id);

            const dbDispute = await DisputeTicket.findByPk(dispute1.id);
            expect(dbDispute.status).toEqual(resolutionData.resolutionStatus);
            // Reset for other tests if needed
            dbDispute.status = DisputeStatus.OPEN;
            dbDispute.resolvedByUserId = null;
            dbDispute.resolutionDetails = null;
            await dbDispute.save();
        });

        it('should return 400 for invalid resolutionStatus', async () => {
            const res = await request(app)
                .post(`/api/v1/admin/disputes/${dispute1.id}/resolve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ ...resolutionData, resolutionStatus: "INVALID_STATUS_FOO" });
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0]).toContain('"resolutionStatus" must be one of');
        });
    });

    // --- Tournament Management (Admin only, tested in admin.tournaments.routes.test.js) ---
    // This file focuses on non-tournament admin routes. Tournament specific admin routes are in admin.tournaments.routes.test.js
    // However, the admin.routes.js file DOES include tournament admin routes. So we should test them here.

    describe('PUT /api/v1/admin/tournaments/:id (Admin)', () => {
        it('should allow admin to update tournament details', async () => {
            const newName = "Updated Admin Tournament Name";
            const res = await request(app)
                .put(`/api/v1/admin/tournaments/${tournament1.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: newName, entryFee: 15 });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.name).toEqual(newName);
            expect(res.body.data.entryFee).toEqual(15);
            const dbTournament = await Tournament.findByPk(tournament1.id);
            expect(dbTournament.name).toEqual(newName);
        });
    });

    describe('PATCH /api/v1/admin/tournaments/:id/status (Admin)', () => {
        it('should allow admin to change tournament status', async () => {
            const res = await request(app)
                .patch(`/api/v1/admin/tournaments/${tournament1.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ newStatus: TournamentStatus.COMPLETED });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.status).toEqual(TournamentStatus.COMPLETED);
            const dbTournament = await Tournament.findByPk(tournament1.id);
            expect(dbTournament.status).toEqual(TournamentStatus.COMPLETED);
            // Reset for other tests
            dbTournament.status = TournamentStatus.ONGOING;
            await dbTournament.save();
        });
    });

    describe('GET /api/v1/admin/tournaments/:id/participants (Admin)', () => {
        it('should list tournament participants for admin', async () => {
            const res = await request(app)
                .get(`/api/v1/admin/tournaments/${tournament1.id}/participants`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.participants).toBeInstanceOf(Array);
            expect(res.body.data.participants.length).toBeGreaterThanOrEqual(2); // participant1 and participant2
        });
    });

    describe('DELETE /api/v1/admin/tournaments/:tournamentId/participants/:userId (Admin)', () => {
        let tempParticipantUser;
        let tempParticipantEntry;

        beforeEach(async () => {
            tempParticipantUser = await User.create({ username: 'tempPartUser', email: 'temppart@example.com', password: 'password' });
            tempParticipantEntry = await TournamentParticipant.create({ tournamentId: tournament1.id, userId: tempParticipantUser.id, status: 'REGISTERED' });
        });
        afterEach(async() => {
            // ensure cleanup
            await TournamentParticipant.destroy({where: {id: tempParticipantEntry.id}});
            await User.destroy({where: {id: tempParticipantUser.id}});
        });

        it('should allow admin to remove a participant', async () => {
            const res = await request(app)
                .delete(`/api/v1/admin/tournaments/${tournament1.id}/participants/${tempParticipantUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(204); // No content

            const findParticipant = await TournamentParticipant.findOne({ where: { tournamentId: tournament1.id, userId: tempParticipantUser.id } });
            expect(findParticipant).toBeNull();
        });
    });


    // --- Withdrawal Management ---
    describe('GET /api/v1/admin/withdrawals (FinanceManager or Admin)', () => {
        it('should list withdrawals for Admin', async () => {
            const res = await request(app)
                .get('/api/v1/admin/withdrawals')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data.items[0].id).toEqual(withdrawalRequest1.id);
        });

        it('should list withdrawals for FinanceManager', async () => {
            const res = await request(app)
                .get('/api/v1/admin/withdrawals')
                .set('Authorization', `Bearer ${financeManagerToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
        });

        it('should be forbidden for DisputeModerator', async () => {
            const res = await request(app)
                .get('/api/v1/admin/withdrawals')
                .set('Authorization', `Bearer ${disputeModToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

    describe('POST /api/v1/admin/withdrawals/:id/approve (FinanceManager or Admin)', () => {
        it('should allow Admin to approve a withdrawal', async () => {
            const res = await request(app)
                .post(`/api/v1/admin/withdrawals/${withdrawalRequest1.id}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ notes: 'Approved by admin.' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.status).toEqual(TransactionStatus.APPROVED);
            expect(res.body.data.processedByUserId).toEqual(adminUser.id);

            const dbWithdrawal = await Transaction.findByPk(withdrawalRequest1.id);
            expect(dbWithdrawal.status).toEqual(TransactionStatus.APPROVED);
            // Reset for reject test
            dbWithdrawal.status = TransactionStatus.PENDING_APPROVAL;
            dbWithdrawal.processedByUserId = null;
            dbWithdrawal.adminNotes = null;
            await dbWithdrawal.save();
        });
    });

    describe('POST /api/v1/admin/withdrawals/:id/reject (FinanceManager or Admin)', () => {
        const rejectionData = { reason: 'Insufficient details for withdrawal.' };

        it('should allow FinanceManager to reject a withdrawal', async () => {
            const res = await request(app)
                .post(`/api/v1/admin/withdrawals/${withdrawalRequest1.id}/reject`)
                .set('Authorization', `Bearer ${financeManagerToken}`)
                .send(rejectionData);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.status).toEqual(TransactionStatus.REJECTED);
            expect(res.body.data.processedByUserId).toEqual(financeManager.id);
            expect(res.body.data.adminNotes).toEqual(rejectionData.reason);

            const dbWithdrawal = await Transaction.findByPk(withdrawalRequest1.id);
            expect(dbWithdrawal.status).toEqual(TransactionStatus.REJECTED);
        });

        it('should return 400 if reason is missing for rejection', async () => {
            const res = await request(app)
                .post(`/api/v1/admin/withdrawals/${withdrawalRequest1.id}/reject`)
                .set('Authorization', `Bearer ${financeManagerToken}`)
                .send({}); // Missing reason
            expect(res.statusCode).toEqual(400);
             expect(res.body.errors[0]).toContain('"reason" is required');
        });
    });
});
