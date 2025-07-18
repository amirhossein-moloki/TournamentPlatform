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


    router.use('/admin', adminRoutes(dependencies));
    router.use('/admin/users', adminUserRoutes(dependencies));
    router.use('/auth', authRoutes(dependencies));
    router.use('/games', gamesRoutes(dependencies));
    router.use('/leaderboards', leaderboardsRoutes(dependencies));
    router.use('/matches', matchesRoutes(dependencies));
    router.use('/teams', teamsRoutes(dependencies));
    router.use('/tournaments', tournamentsRoutes(dependencies));
    router.use('/wallet', walletRoutes(dependencies));
    router.use('/chats', chatRoutes(dependencies));
    router.use('/upload', uploadRoutes(dependencies));
    router.use('/user-game-profiles', userGameProfilesRoutes(dependencies));


    return router;
};
