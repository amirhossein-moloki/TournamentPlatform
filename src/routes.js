module.exports = (dependencies) => {
    const router = require('express').Router();

    const adminRoutes = require('./presentation/api/admin.routes');
    const adminUserRoutes = require('./presentation/api/admin/users.routes');
    const authRoutes = require('./presentation/api/auth.routes');
    const gamesRoutes = require('./presentation/api/games.routes');
    const leaderboardsRoutes = require('./presentation/api/leaderboards.routes');
    const matchesRoutes = require('./presentation/api/matches.routes');
    const teamsRoutes = require('./presentation/api/teams.routes');
    const tournamentsRoutes = require('./presentation/api/tournaments.routes');
    const walletRoutes = require('./presentation/api/wallet.routes');
    const chatRoutes = require('./presentation/api/chat.routes');
    const uploadRoutes = require('./presentation/api/upload.routes');
    const userGameProfilesRoutes = require('./presentation/api/userGameProfiles.routes');
    const dashboardRoutes = require('./presentation/api/dashboard.routes');


    router.use('/admin', adminRoutes({ adminController: dependencies.adminController }));
    router.use('/admin/users', adminUserRoutes({ userController: dependencies.userController, adminController: dependencies.adminController }));
    router.use('/auth', authRoutes({ authController: dependencies.authController }));
    router.use('/games', gamesRoutes({ gameController: dependencies.gameController }));
    router.use('/leaderboards', leaderboardsRoutes({ leaderboardController: dependencies.leaderboardController }));
    router.use('/matches', matchesRoutes({ matchController: dependencies.matchController }));
    router.use('/teams', teamsRoutes({ teamController: dependencies.teamController, teamMemberController: dependencies.teamMemberController }));
    router.use('/tournaments', tournamentsRoutes({ tournamentController: dependencies.tournamentController }));
    router.use('/wallet', walletRoutes(dependencies));
    router.use('/chats', chatRoutes({ chatController: dependencies.chatController }));
    router.use('/upload', uploadRoutes({ uploadController: dependencies.uploadController }));
    router.use('/user-game-profiles', userGameProfilesRoutes({ userGameProfileController: dependencies.userGameProfileController }));
    router.use('/dashboard', dashboardRoutes({ dashboardController: dependencies.dashboardController }));


    return router;
};
