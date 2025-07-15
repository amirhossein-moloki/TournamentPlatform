const router = require('express').Router();

const adminRoutes = require('./presentation/api/admin.routes');
const authRoutes = require('./presentation/api/auth.routes');
const gamesRoutes = require('./presentation/api/games.routes');
const leaderboardsRoutes = require('./presentation/api/leaderboards.routes');
const matchesRoutes = require('./presentation/api/matches.routes');
const teamsRoutes = require('./presentation/api/teams.routes');
const tournamentsRoutes = require('./presentation/api/tournaments.routes');
const walletRoutes = require('./presentation/api/wallet.routes');
const chatRoutes = require('./presentation/api/chat.routes');
const { chatController, postgresUserRepository } = require('./config/dependencies');


router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/games', gamesRoutes);
router.use('/leaderboards', leaderboardsRoutes);
router.use('/matches', matchesRoutes);
router.use('/teams', teamsRoutes);
router.use('/tournaments', tournamentsRoutes);
router.use('/wallet', walletRoutes);
router.use('/chats', chatRoutes(chatController, postgresUserRepository));


module.exports = router;
