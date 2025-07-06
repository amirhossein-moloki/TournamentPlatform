const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // Optional: for request logging
const ApiError = require('./utils/ApiError');
const { errorHandler } = require('./middleware/error.middleware'); // Assuming you will create this

// Import routes
const adminRoutes = require('./presentation/api/admin.routes');
const authRoutes = require('./presentation/api/auth.routes');
const leaderboardsRoutes = require('./presentation/api/leaderboards.routes');
const matchesRoutes = require('./presentation/api/matches.routes');
const teamsRoutes = require('./presentation/api/teams.routes');
const tournamentsRoutes = require('./presentation/api/tournaments.routes');
const usersRoutes = require('./presentation/api/users.routes');
const walletRoutes = require('./presentation/api/wallet.routes');

const app = express();

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Configure as needed
    credentials: true
}));

app.use(express.json({ limit: process.env.REQUEST_LIMIT || '16kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '16kb' }));
app.use(express.static('public')); // If you have a public folder for static assets

// Morgan for logging in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// API Routes
const apiRouter = express.Router();

apiRouter.use('/admin', adminRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/leaderboards', leaderboardsRoutes);
apiRouter.use('/matches', matchesRoutes);
apiRouter.use('/teams', teamsRoutes);
apiRouter.use('/tournaments', tournamentsRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/wallet', walletRoutes);

app.use('/api/v1', apiRouter);

// Health check route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy and running!' });
});

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});


// Handle 404 Not Found errors
app.use((req, res, next) => {
    next(new ApiError(404, 'Not Found - The requested resource does not exist on this server.'));
});

// Global error handler middleware
// Note: This relies on 'errorHandler' being correctly defined in './middleware/error.middleware.js'
// Ensure that file exists and exports 'errorHandler' or adjust the import and usage.
app.use(errorHandler);

module.exports = app;
