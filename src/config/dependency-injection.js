// src/config/dependency-injection.js

// Infrastructure
const db = require('../infrastructure/database/models');
const PostgresUserRepository = require('../infrastructure/database/repositories/postgres.user.repository');
const PostgresTeamRepository = require('../infrastructure/database/repositories/postgres.team.repository');
const PostgresTeamMemberRepository = require('../infrastructure/database/repositories/postgres.teamMember.repository');
const PostgresChatRepository = require('../infrastructure/database/repositories/postgres.chat.repository');
const PostgresWalletRepository = require('../infrastructure/database/repositories/postgres.wallet.repository');
const { PostgresTournamentRepository } = require('../infrastructure/database/repositories/postgres.tournament.repository');
const { PostgresMatchRepository } = require('../infrastructure/database/repositories/postgres.match.repository');
const { PostgresTournamentParticipantRepository } = require('../infrastructure/database/repositories/postgres.tournamentParticipant.repository');
const GameRepository = require('../infrastructure/database/repositories/game.repository');
const UserGameProfileRepository = require('../infrastructure/database/repositories/userGameProfile.repository');
const LeaderboardRedisRepository = require('../infrastructure/database/repositories/leaderboard.redis.repository');

const ConsoleEmailService = require('../infrastructure/email/console.email.service');
const SESEmailService = require('../infrastructure/email/ses.email.service');
const LocalFileUploader = require('../infrastructure/file-upload/local.file-uploader');
const RabbitMQAdapter = require('../infrastructure/messaging/rabbitmq.adapter');
const RedisAdapter = require('../infrastructure/cache/redis.adapter');

// Application Services
const FileValidationService = require('../application/services/fileValidation.service');
const IdempotencyService = require('../application/services/idempotency.service');

// Use Cases - Organized by feature
const RegisterUserUseCase = require('../application/use-cases/auth/register-user.usecase');
const LoginUseCase = require('../application/use-cases/auth/login.usecase');
const RefreshTokenUseCase = require('../application/use-cases/auth/refresh-token.usecase');
const LogoutUseCase = require('../application/use-cases/auth/logout.usecase');
const SendVerificationEmailUseCase = require('../application/use-cases/auth/send-verification-email.usecase');
const VerifyEmailUseCase = require('../application/use-cases/auth/verify-email.usecase');

const CreateGameUseCase = require('../application/use-cases/game/createGame.useCase');
const GetGameByIdUseCase = require('../application/use-cases/game/getGameById.useCase');
const ListActiveGamesUseCase = require('../application/use-cases/game/listActiveGames.useCase');
const UpdateGameUseCase = require('../application/use-cases/game/updateGame.useCase');
const DeleteGameUseCase = require('../application/use-cases/game/deleteGame.useCase');

const GetUserProfileUseCase = require('../application/use-cases/user/get-user-profile.usecase');
const UpdateUserProfileUseCase = require('../application/use-cases/user/update-user-profile.usecase');
const ListUsersUseCase = require('../application/use-cases/user/list-users.usecase');
const AdminUpdateUserUseCase = require('../application/use-cases/user/admin-update-user.usecase');
const AdminDeleteUserUseCase = require('../application/use-cases/user/admin-delete-user.usecase');
const AssignRoleUseCase = require('../application/use-cases/user/assign-role.usecase');
const RemoveRoleUseCase = require('../application/use-cases/user/remove-role.usecase');
const UpsertUserGameProfileUseCase = require('../application/use-cases/user/upsertUserGameProfile.useCase');
const GetUserGameProfilesUseCase = require('../application/use-cases/user/getUserGameProfiles.useCase');
const GetUserGameProfileForGameUseCase = require('../application/use-cases/user/getUserGameProfileForGame.useCase');

const CreateTournamentUseCase = require('../application/use-cases/tournament/create-tournament.usecase');
const ListTournamentsUseCase = require('../application/use-cases/tournament/list-tournaments.usecase');
const RegisterForTournamentUseCase = require('../application/use-cases/tournament/registerForTournament.useCase');
const GetTournamentUseCase = require('../application/use-cases/tournament/get-tournament.usecase');

const GetMatchUseCase = require('../application/use-cases/match/get-match.usecase');
const GetMatchUploadUrlUseCase = require('../application/use-cases/match/get-match-upload-url.usecase');
const SubmitMatchResultUseCase = require('../application/use-cases/match/submit-match-result.usecase');

const CreateTeamUseCase = require('../application/use-cases/team/createTeam.usecase');
const GetTeamByIdUseCase = require('../application/use-cases/team/getTeamById.usecase');
const GetAllTeamsUseCase = require('../application/use-cases/team/getAllTeams.usecase');
const UpdateTeamUseCase = require('../application/use-cases/team/updateTeam.usecase');
const DeleteTeamUseCase = require('../application/use-cases/team/deleteTeam.usecase');

const AddTeamMemberUseCase = require('../application/use-cases/teamMember/addTeamMember.usecase');
const RemoveTeamMemberUseCase = require('../application/use-cases/teamMember/removeTeamMember.usecase');

const GetLeaderboardUseCase = require('../application/use-cases/leaderboard/get-leaderboard.usecase');
const GetUserRankUseCase = require('../application/use-cases/leaderboard/get-user-rank.usecase');
const UpdateScoreUseCase = require('../application/use-cases/leaderboard/update-score.usecase');

const CreateChatSessionUseCase = require('../application/use-cases/chat/createChatSession.usecase');
const GetUserChatSessionsUseCase = require('../application/use-cases/chat/getUserChatSessions.usecase');
const GetChatHistoryUseCase = require('../application/use-cases/chat/getChatHistory.usecase');
const EditMessageUseCase = require('../application/use-cases/chat/edit-message.usecase');
const DeleteMessageUseCase = require('../application/use-cases/chat/delete-message.usecase');

const UploadFileUseCase = require('../application/use-cases/upload/upload-file.usecase');

const GetWalletDetailsUseCase = require('../application/use-cases/wallet/get-wallet-details.usecase');
const InitializeDepositUseCase = require('../application/use-cases/wallet/initialize-deposit.usecase');
const GetTransactionHistoryUseCase = require('../application/use-cases/wallet/get-transaction-history.usecase');
const RequestWithdrawalUseCase = require('../application/use-cases/wallet/request-withdrawal.usecase');

const GetDashboardDataUseCase = require('../application/use-cases/dashboard/get-dashboard-data.usecase');


// Controllers
const AuthController = require('../presentation/controllers/auth.controller');
const GameController = require('../presentation/controllers/game.controller');
const UserController = require('../presentation/controllers/user.controller');
const UserGameProfileController = require('../presentation/controllers/userGameProfile.controller');
const TournamentController = require('../presentation/controllers/tournament.controller');
const TeamController = require('../presentation/controllers/team.controller');
const ChatController = require('../presentation/controllers/chat.controller');
const UploadController = require('../presentation/controllers/upload.controller');
const AdminController = require('../presentation/controllers/admin.controller');
const MatchController = require('../presentation/controllers/match.controller');
const LeaderboardController = require('../presentation/controllers/leaderboard.controller');
const WalletController = require('../presentation/controllers/wallet.controller');
const DashboardController = require('../presentation/controllers/dashboard.controller');


function initializeDependencies(config, redisClient) {
  // --- Infrastructure Layer ---

  // Repositories
  const userRepository = new PostgresUserRepository({ UserModel: db.UserModel });
  const teamRepository = new PostgresTeamRepository({ TeamModel: db.TeamModel, TeamMemberModel: db.TeamMemberModel, UserModel: db.UserModel, sequelize: db.sequelize });
  const teamMemberRepository = new PostgresTeamMemberRepository({ TeamMemberModel: db.TeamMemberModel, UserModel: db.UserModel, TeamModel: db.TeamModel, sequelize: db.sequelize });
  const chatRepository = new PostgresChatRepository({ ChatSessionModel: db.ChatSessionModel, ChatMessageModel: db.ChatMessageModel });
  const walletRepository = new PostgresWalletRepository({ WalletModel: db.WalletModel });
  const tournamentRepository = new PostgresTournamentRepository({ TournamentModel: db.TournamentModel, TournamentParticipantModel: db.TournamentParticipantModel, GameModel: db.GameModel, UserModel: db.UserModel });
  const matchRepository = new PostgresMatchRepository({ MatchModel: db.MatchModel, TournamentModel: db.TournamentModel, GameModel: db.GameModel });
  const tournamentParticipantRepository = new PostgresTournamentParticipantRepository({ TournamentParticipantModel: db.TournamentParticipantModel, UserModel: db.UserModel, TournamentModel: db.TournamentModel });
  const gameRepository = new GameRepository({ GameModel: db.GameModel, GameImageModel: db.GameImageModel });
  const userGameProfileRepository = new UserGameProfileRepository({ UserGameProfileModel: db.UserGameProfileModel, GameModel: db.GameModel });
  const leaderboardRepository = new LeaderboardRedisRepository(redisClient);

  // External Services
  const emailService = config.env === 'production'
    ? new SESEmailService({
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        region: config.aws.region,
      })
    : new ConsoleEmailService();
  const fileUploader = new LocalFileUploader(); // Replace with S3FileUploader in production if needed
  const messageQueue = new RabbitMQAdapter(config.rabbitmq.url);
  const cache = new RedisAdapter(redisClient);


  // --- Application Layer ---

  // Services
  const fileValidationService = new FileValidationService({
    matchRepository,
    s3Service: fileUploader, // Assuming S3 uploader interface matches
    notificationService: messageQueue,
    logger: console,
  });
  const idempotencyService = new IdempotencyService(db.IdempotencyRequest);


  // Use Cases
  const registerUserUseCase = new RegisterUserUseCase(userRepository, emailService);
  const loginUseCase = new LoginUseCase(userRepository);
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository);
  const logoutUseCase = new LogoutUseCase(userRepository);
  const sendVerificationEmailUseCase = new SendVerificationEmailUseCase(userRepository, emailService);
  const verifyEmailUseCase = new VerifyEmailUseCase(userRepository);

  const createGameUseCase = new CreateGameUseCase(gameRepository);
  const getGameByIdUseCase = new GetGameByIdUseCase(gameRepository);
  const listActiveGamesUseCase = new ListActiveGamesUseCase(gameRepository);
  const updateGameUseCase = new UpdateGameUseCase(gameRepository);
  const deleteGameUseCase = new DeleteGameUseCase(gameRepository);

  const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
  const updateUserProfileUseCase = new UpdateUserProfileUseCase(userRepository);
  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const adminUpdateUserUseCase = new AdminUpdateUserUseCase(userRepository);
  const adminDeleteUserUseCase = new AdminDeleteUserUseCase(userRepository);
  const assignRoleUseCase = new AssignRoleUseCase(userRepository);
  const removeRoleUseCase = new RemoveRoleUseCase(userRepository);

  const upsertUserGameProfileUseCase = new UpsertUserGameProfileUseCase(userGameProfileRepository, gameRepository);
  const getUserGameProfilesUseCase = new GetUserGameProfilesUseCase(userGameProfileRepository);
  const getUserGameProfileForGameUseCase = new GetUserGameProfileForGameUseCase(userGameProfileRepository);

  const createTournamentUseCase = new CreateTournamentUseCase(tournamentRepository, userRepository, gameRepository);
  const listTournamentsUseCase = new ListTournamentsUseCase(tournamentRepository);
  const getTournamentUseCase = new GetTournamentUseCase(tournamentRepository);
  const registerForTournamentUseCase = new RegisterForTournamentUseCase(tournamentRepository, tournamentParticipantRepository, userGameProfileRepository, walletRepository);

  const getMatchUseCase = new GetMatchUseCase(tournamentRepository, userGameProfileRepository, matchRepository);
  const getMatchUploadUrlUseCase = new GetMatchUploadUrlUseCase(matchRepository, fileUploader);
  const submitMatchResultUseCase = new SubmitMatchResultUseCase(matchRepository, fileValidationService);

  const createTeamUseCase = new CreateTeamUseCase({ teamRepository, teamMemberRepository, userRepository });
  const getTeamByIdUseCase = new GetTeamByIdUseCase(teamRepository);
  const getAllTeamsUseCase = new GetAllTeamsUseCase(teamRepository);
  const updateTeamUseCase = new UpdateTeamUseCase(teamRepository);
  const deleteTeamUseCase = new DeleteTeamUseCase(teamRepository);

  const addTeamMemberUseCase = new AddTeamMemberUseCase(teamMemberRepository, teamRepository, userRepository);
  const removeTeamMemberUseCase = new RemoveTeamMemberUseCase(teamMemberRepository, teamRepository);

  const getLeaderboardUseCase = new GetLeaderboardUseCase(leaderboardRepository);
  const getUserRankUseCase = new GetUserRankUseCase(leaderboardRepository);
  const updateScoreUseCase = new UpdateScoreUseCase(leaderboardRepository, userRepository);

  const createChatSessionUseCase = new CreateChatSessionUseCase({ chatRepository, userRepository });
  const getUserChatSessionsUseCase = new GetUserChatSessionsUseCase({ chatRepository });
  const getChatHistoryUseCase = new GetChatHistoryUseCase({ chatRepository });
  const editMessageUseCase = new EditMessageUseCase(chatRepository);
  const deleteMessageUseCase = new DeleteMessageUseCase(chatRepository);

  const uploadFileUseCase = new UploadFileUseCase(fileUploader);

  const getWalletDetailsUseCase = new GetWalletDetailsUseCase(walletRepository);
  const initializeDepositUseCase = new InitializeDepositUseCase(walletRepository);
  const getTransactionHistoryUseCase = new GetTransactionHistoryUseCase(walletRepository); // Assuming wallet repo has this method
  const requestWithdrawalUseCase = new RequestWithdrawalUseCase(walletRepository);

  const getDashboardDataUseCase = new GetDashboardDataUseCase({ tournamentRepository, matchRepository, userRepository });


  // --- Presentation Layer ---

  // Controllers
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

  const userController = new UserController({
    getUserProfileUseCase,
    updateUserProfileUseCase,
    listUsersUseCase,
    adminUpdateUserUseCase,
    adminDeleteUserUseCase,
    assignRoleUseCase,
    removeRoleUseCase,
  });

  const userGameProfileController = new UserGameProfileController(
    upsertUserGameProfileUseCase,
    getUserGameProfilesUseCase,
    getUserGameProfileForGameUseCase
  );

  const tournamentController = new TournamentController({
    createTournamentUseCase,
    listTournamentsUseCase,
    getTournamentUseCase,
    registerForTournamentUseCase,
  });

  const teamController = new TeamController({
    createTeamUseCase,
    getTeamByIdUseCase,
    getAllTeamsUseCase,
    updateTeamUseCase,
    deleteTeamUseCase,
    addTeamMemberUseCase,
    removeTeamMemberUseCase,
  });

  const chatController = new ChatController({
    createChatSessionUseCase,
    getUserChatSessionsUseCase,
    getChatHistoryUseCase,
    editMessageUseCase,
    deleteMessageUseCase,
  });

  const uploadController = new UploadController({ uploadFileUseCase });

  const adminController = new AdminController({
      // Assuming admin use cases are aggregated here
      // e.g., listUsers: listUsersUseCase,
  });

  const matchController = new MatchController({
    getMatchUseCase,
    getMatchUploadUrlUseCase,
    submitMatchResultUseCase,
  });

  const leaderboardController = new LeaderboardController({
    getLeaderboardUseCase,
    getUserRankUseCase,
  });

  const walletController = new WalletController({
    getWalletDetailsUseCase,
    initializeDepositUseCase,
    getTransactionHistoryUseCase,
    requestWithdrawalUseCase,
  });

  const dashboardController = new DashboardController({
    getDashboardDataUseCase,
  });

  return {
    // Controllers
    authController,
    gameController,
    userController,
    userGameProfileController,
    tournamentController,
    teamController,
    chatController,
    uploadController,
    adminController,
    matchController,
    leaderboardController,
    walletController,
    dashboardController,

    // Services & Adapters that might be needed directly
    emailService,
    messageQueue,
    cache,
    idempotencyService,

    // Use Cases (if needed directly in routes or middleware)
    // ...
  };
}

module.exports = { initializeDependencies };
