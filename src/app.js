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
// Import game routes factory and dependencies
const gamesRoutesFactory = require('./presentation/api/games.routes');
// Assuming auth middlewares are available
const { authMiddleware, adminRoleMiddleware, authenticateToken, authorizeRole } = require('./middleware/auth.middleware'); // Added authenticateToken, authorizeRole
const {
    gameController,
    userGameProfileController,
    // User use cases needed by usersRoutesFactory
    getUserProfileUseCase,
    updateUserProfileUseCase,
    listUsersUseCase,
    adminUpdateUserUseCase,
    adminDeleteUserUseCase,
    // Tournament use cases needed by tournamentsRoutesFactory
    createTournamentUseCase,
    listTournamentsUseCase,
    getTournamentUseCase,
    registerForTournamentUseCase,
    // Match use cases needed by matchesRoutesFactory
    getMatchUseCase,
    getMatchUploadUrlUseCase,
    submitMatchResultUseCase
} = require('./config/dependencies');


const swaggerUi = require('swagger-ui-express');
// const YAML = require('yamljs'); // No longer needed for YAML loading here
const path = require('path');
const fs = require('fs'); // For reading the JSON file

const app = express();

// Load OpenAPI specification
// const ursprünglichesSwaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yml'));
let swaggerDocument;
try {
    const swaggerJsonPath = path.join(__dirname, '../docs/swagger-generated.json');
    const swaggerJsonContent = fs.readFileSync(swaggerJsonPath, 'utf8');
    swaggerDocument = JSON.parse(swaggerJsonContent);
} catch (error) {
    console.error("Failed to load or parse swagger-generated.json:", error);
    // Fallback or default empty spec if loading fails
    swaggerDocument = { openapi: '3.0.0', info: { title: 'API Docs Not Available', version: '0.0.0' }, paths: {} };
}


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
// apiRouter.use('/matches', matchesRoutes); // Will be replaced by the factory call
const matchesRoutesInstance = matchesRoutes( // matchesRoutes is now a factory
    { getMatchUseCase, getMatchUploadUrlUseCase, submitMatchResultUseCase },
    authenticateToken || ((req,res,next)=>next())
);
apiRouter.use('/matches', matchesRoutesInstance);
apiRouter.use('/teams', teamsRoutes);
// apiRouter.use('/tournaments', tournamentsRoutes); // Will be replaced by the factory call
const tournamentsRoutesInstance = tournamentsRoutes( // tournamentsRoutes is now a factory
    { createTournamentUseCase, listTournamentsUseCase, getTournamentUseCase, registerForTournamentUseCase },
    authenticateToken || ((req,res,next)=>next()),
    authorizeRole || ((roles)=>(req,res,next)=>next())
);
apiRouter.use('/tournaments', tournamentsRoutesInstance);
// apiRouter.use('/users', usersRoutes); // Will be replaced by the factory call
const usersRoutesInstance = usersRoutes( // usersRoutes is now a factory
    { getUserProfileUseCase, updateUserProfileUseCase, listUsersUseCase, adminUpdateUserUseCase, adminDeleteUserUseCase },
    userGameProfileController,
    authenticateToken || ((req,res,next)=>next()), // Placeholder for authenticateToken
    authorizeRole || ((roles)=>(req,res,next)=>next()) // Placeholder for authorizeRole
);
apiRouter.use('/users', usersRoutesInstance);
apiRouter.use('/wallet', walletRoutes);

// Register Game API routes
// Ensure authMiddleware and adminRoleMiddleware are correctly implemented or use placeholders
const gamesRouter = gamesRoutesFactory(gameController, authMiddleware || ((req,res,next)=>next()), adminRoleMiddleware || ((req,res,next)=>next()));
apiRouter.use('/games', gamesRouter);

app.use('/api/v1', apiRouter);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
