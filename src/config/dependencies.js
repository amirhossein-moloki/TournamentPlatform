// src/config/dependencies.js

// Sequelize Models
const db = require('../infrastructure/database/models/index.js'); // CommonJS import

// Repositories
const GameRepository = require('../infrastructure/database/repositories/game.repository.js');
const UserGameProfileRepository = require('../infrastructure/database/repositories/userGameProfile.repository.js');
const { PostgresTournamentRepository } = require('../infrastructure/database/repositories/postgres.tournament.repository.js');
const { PostgresMatchRepository } = require('../infrastructure/database/repositories/postgres.match.repository.js');
const { PostgresUserRepository } = require('../infrastructure/database/repositories/postgres.user.repository.js');
const { PostgresTournamentParticipantRepository } = require('../infrastructure/database/repositories/postgres.tournamentParticipant.repository.js'); // Assuming this exists or will be created
const PostgresChatRepository = require('../infrastructure/database/repositories/postgres.chat.repository.js');

// Game Use Cases
const CreateGameUseCase = require('../application/use-cases/game/createGame.useCase.js');
const GetGameByIdUseCase = require('../application/use-cases/game/getGameById.useCase.js');
const ListActiveGamesUseCase = require('../application/use-cases/game/listActiveGames.useCase.js');
const UpdateGameUseCase = require('../application/use-cases/game/updateGame.useCase.js');
const DeleteGameUseCase = require('../application/use-cases/game/deleteGame.useCase.js');

// UserGameProfile Use Cases
const UpsertUserGameProfileUseCase = require('../application/use-cases/user/upsertUserGameProfile.useCase.js');
const GetUserGameProfilesUseCase = require('../application/use-cases/user/getUserGameProfiles.useCase.js');
const GetUserGameProfileForGameUseCase = require('../application/use-cases/user/getUserGameProfileForGame.useCase.js');

// Tournament Use Cases
const CreateTournamentUseCase = require('../application/use-cases/tournament/create-tournament.usecase.js');
const ListTournamentsUseCase = require('../application/use-cases/tournament/list-tournaments.usecase.js');
const RegisterForTournamentUseCase = require('../application/use-cases/tournament/registerForTournament.useCase.js');
const GetTournamentUseCase = require('../application/use-cases/tournament/get-tournament.usecase.js'); // Added

// Match Use Cases
const GetMatchUseCase = require('../application/use-cases/match/get-match.usecase.js');
const GetMatchUploadUrlUseCase = require('../application/use-cases/match/get-match-upload-url.usecase.js'); // Added
const SubmitMatchResultUseCase = require('../application/use-cases/match/submit-match-result.usecase.js'); // Added

// Controllers
const GameController = require('../presentation/controllers/game.controller.js');
const UserGameProfileController = require('../presentation/controllers/userGameProfile.controller.js');
// TODO: Add UserController when created/refactored
const TournamentController = require('../presentation/controllers/tournament.controller.js');

// Auth Use Cases
const RegisterUserUseCase = require('../application/use-cases/auth/register-user.usecase.js');
const LoginUseCase = require('../application/use-cases/auth/login.usecase.js');
const RefreshTokenUseCase = require('../application/use-cases/auth/refresh-token.usecase.js');
const LogoutUseCase = require('../application/use-cases/auth/logout.usecase.js');
const SendVerificationEmailUseCase = require('../application/use-cases/auth/send-verification-email.usecase.js');
const VerifyEmailUseCase = require('../application/use-cases/auth/verify-email.usecase.js');

// User Use Cases (from users.routes.js)
const GetUserProfileUseCase = require('../application/use-cases/user/get-user-profile.usecase');
const UpdateUserProfileUseCase = require('../application/use-cases/user/update-user-profile.usecase');
const ListUsersUseCase = require('../application/use-cases/user/list-users.usecase');
const AdminUpdateUserUseCase = require('../application/use-cases/user/admin-update-user.usecase');
const AdminDeleteUserUseCase = require('../application/use-cases/user/admin-delete-user.usecase');


// Instantiate Repositories
const gameRepository = new GameRepository(db.GameModel);
const userRepository = new PostgresUserRepository({ UserModel: db.UserModel }); // Pass models object
const userGameProfileRepository = new UserGameProfileRepository(db.UserGameProfileModel, db.GameModel);
const tournamentParticipantRepository = new PostgresTournamentParticipantRepository(db.TournamentParticipantModel, db.UserModel, db.TournamentModel); // Assuming constructor
const tournamentRepository = new PostgresTournamentRepository({
    TournamentModel: db.TournamentModel,
    TournamentParticipantModel: db.TournamentParticipantModel,
    GameModel: db.GameModel,
    UserModel: db.UserModel
});
const matchRepository = new PostgresMatchRepository({
    MatchModel: db.MatchModel,
    TournamentModel: db.TournamentModel,
    GameModel: db.GameModel
});
const chatRepository = new PostgresChatRepository({
    ChatSessionModel: db.ChatSessionModel,
    ChatMessageModel: db.ChatMessageModel,
});
const LeaderboardRedisRepository = require('../infrastructure/database/repositories/leaderboard.redis.repository');
const leaderboardRepository = new LeaderboardRedisRepository(); // Assumes redis client is available via adapter


// Instantiate Game Use Cases
const createGameUseCase = new CreateGameUseCase(gameRepository);
const getGameByIdUseCase = new GetGameByIdUseCase(gameRepository);
const listActiveGamesUseCase = new ListActiveGamesUseCase(gameRepository);
const updateGameUseCase = new UpdateGameUseCase(gameRepository);
const deleteGameUseCase = new DeleteGameUseCase(gameRepository);

// Instantiate Auth Use Cases
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const loginUseCase = new LoginUseCase(userRepository);
const refreshTokenUseCase = new RefreshTokenUseCase(userRepository);
const logoutUseCase = new LogoutUseCase(userRepository);
const sendVerificationEmailUseCase = new SendVerificationEmailUseCase(userRepository);
const verifyEmailUseCase = new VerifyEmailUseCase(userRepository);

// Instantiate User Use Cases (from users.routes.js)
const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
const updateUserProfileUseCase = new UpdateUserProfileUseCase(userRepository);
const listUsersUseCase = new ListUsersUseCase(userRepository);
const adminUpdateUserUseCase = new AdminUpdateUserUseCase(userRepository);
const adminDeleteUserUseCase = new AdminDeleteUserUseCase(userRepository);

// Instantiate UserGameProfile Use Cases
const upsertUserGameProfileUseCase = new UpsertUserGameProfileUseCase(userGameProfileRepository, gameRepository);
const getUserGameProfilesUseCase = new GetUserGameProfilesUseCase(userGameProfileRepository);
const getUserGameProfileForGameUseCase = new GetUserGameProfileForGameUseCase(userGameProfileRepository);

// Instantiate Tournament Use Cases
const createTournamentUseCase = new CreateTournamentUseCase(tournamentRepository, userRepository, gameRepository); // Already updated
const listTournamentsUseCase = new ListTournamentsUseCase(tournamentRepository); // Already correct
const getTournamentUseCase = new GetTournamentUseCase(tournamentRepository); // Added
const registerForTournamentUseCase = new RegisterForTournamentUseCase(tournamentRepository, tournamentParticipantRepository, userGameProfileRepository, walletRepository); // Already updated

// Instantiate Match Use Cases
const getMatchUseCase = new GetMatchUseCase(tournamentRepository, userGameProfileRepository, matchRepository);
const getMatchUploadUrlUseCase = new GetMatchUploadUrlUseCase(matchRepository /*, s3Service */); // s3Service to be added
const submitMatchResultUseCase = new SubmitMatchResultUseCase(matchRepository /*, fileValidationService */); // fileValidationService to be added

// Instantiate Leaderboard Use Cases
const GetLeaderboardUseCase = require('../application/use-cases/leaderboard/get-leaderboard.usecase');
const GetUserRankUseCase = require('../application/use-cases/leaderboard/get-user-rank.usecase');
const UpdateScoreUseCase = require('../application/use-cases/leaderboard/update-score.usecase');

const getLeaderboardUseCase = new GetLeaderboardUseCase(leaderboardRepository);
const getUserRankUseCase = new GetUserRankUseCase(leaderboardRepository);
const updateScoreUseCase = new UpdateScoreUseCase(leaderboardRepository, userRepository); // userRepository can be optional


const ChatController = require('../presentation/controllers/chat.controller.js');
const CreateChatSessionUseCase = require('../application/use-cases/chat/createChatSession.usecase.js');
const GetUserChatSessionsUseCase = require('../application/use-cases/chat/getUserChatSessions.usecase.js');
const GetChatHistoryUseCase = require('../application/use-cases/chat/getChatHistory.usecase.js');

const createChatSessionUseCase = new CreateChatSessionUseCase({ chatRepository, userRepository });
const getUserChatSessionsUseCase = new GetUserChatSessionsUseCase({ chatRepository });
const getChatHistoryUseCase = new GetChatHistoryUseCase({ chatRepository });

const chatController = new ChatController({
    createChatSessionUseCase,
    getUserChatSessionsUseCase,
    getChatHistoryUseCase,
});

// Instantiate Controllers
const AuthController = require('../presentation/controllers/auth.controller.js');

const authController = new AuthController({
    registerUser: registerUserUseCase,
    login: loginUseCase,
    refreshToken: refreshTokenUseCase,
    logout: logoutUseCase,
    sendVerificationEmail: sendVerificationEmailUseCase,
    verifyEmail: verifyEmailUseCase,
});

const gameController = new GameController(
  createGameUseCase,
  getGameByIdUseCase,
  listActiveGamesUseCase,
  updateGameUseCase,
  deleteGameUseCase
);

const userGameProfileController = new UserGameProfileController(
  upsertUserGameProfileUseCase,
  getUserGameProfilesUseCase,
  getUserGameProfileForGameUseCase
);

// TODO: Instantiate a UserController if you create a separate one for user profile/admin actions.
// For now, users.routes.js handles its own controller logic or directly uses use cases.
// If we refactor users.routes.js to use a dedicated UserController, instantiate it here.

const tournamentController = new TournamentController({
  createTournamentUseCase,
  listTournamentsUseCase,
  getTournamentUseCase,
  registerForTournamentUseCase,
});


// Export instances
module.exports = {
  // Controllers
  authController,
  gameController,
  userGameProfileController, // Added
  tournamentController,
  chatController,
  // Repositories
  gameRepository,
  userRepository,
  userGameProfileRepository,
  tournamentRepository,
  matchRepository,
  tournamentParticipantRepository,
  leaderboardRepository, // Added
  chatRepository,
  // Game Use Cases
  createGameUseCase,
  getGameByIdUseCase,
  listActiveGamesUseCase,
  updateGameUseCase,
  deleteGameUseCase,
  // User Use Cases
  getUserProfileUseCase,
  updateUserProfileUseCase,
  listUsersUseCase,
  adminUpdateUserUseCase,
  adminDeleteUserUseCase,
  // UserGameProfile Use Cases
  upsertUserGameProfileUseCase,
  getUserGameProfilesUseCase,
  getUserGameProfileForGameUseCase,
  // Tournament Use Cases
  createTournamentUseCase,
  listTournamentsUseCase,
  registerForTournamentUseCase,
  getTournamentUseCase, // Added
  // Match Use Cases
  getMatchUseCase,
  getMatchUploadUrlUseCase, // Added
  submitMatchResultUseCase, // Added
  // Leaderboard Use Cases
  getLeaderboardUseCase,
  getUserRankUseCase,
  updateScoreUseCase,
  // Grouped Leaderboard service for routes
  leaderboardService: {
    getLeaderboardUseCase,
    getUserRankUseCase,
    updateScoreUseCase,
  }
};
