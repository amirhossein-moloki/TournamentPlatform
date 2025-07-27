// src/config/dependencies.js
const { initializeRepositories } = require('./dependency-injection');

// Auth Use Cases
const RegisterUserUseCase = require('../application/use-cases/auth/register-user.usecase.js');
const LoginUseCase = require('../application/use-cases/auth/login.usecase.js');
const RefreshTokenUseCase = require('../application/use-cases/auth/refresh-token.usecase.js');
const LogoutUseCase = require('../application/use-cases/auth/logout.usecase.js');
const SendVerificationEmailUseCase = require('../application/use-cases/auth/send-verification-email.usecase.js');
const VerifyEmailUseCase = require('../application/use-cases/auth/verify-email.usecase.js');

// Game Use Cases
const CreateGameUseCase = require('../application/use-cases/game/createGame.useCase.js');
const GetGameByIdUseCase = require('../application/use-cases/game/getGameById.useCase.js');
const ListActiveGamesUseCase = require('../application/use-cases/game/listActiveGames.useCase.js');
const UpdateGameUseCase = require('../application/use-cases/game/updateGame.useCase.js');
const DeleteGameUseCase = require('../application/use-cases/game/deleteGame.useCase.js');

// User Use Cases
const GetUserProfileUseCase = require('../application/use-cases/user/get-user-profile.usecase');
const UpdateUserProfileUseCase = require('../application/use-cases/user/update-user-profile.usecase');
const ListUsersUseCase = require('../application/use-cases/user/list-users.usecase');
const AdminUpdateUserUseCase = require('../application/use-cases/user/admin-update-user.usecase');
const AdminDeleteUserUseCase = require('../application/use-cases/user/admin-delete-user.usecase');
const AssignRoleUseCase = require('../application/use-cases/user/assign-role.usecase');
const RemoveRoleUseCase = require('../application/use-cases/user/remove-role.usecase');
const UpsertUserGameProfileUseCase = require('../application/use-cases/user/upsertUserGameProfile.useCase.js');
const GetUserGameProfilesUseCase = require('../application/use-cases/user/getUserGameProfiles.useCase.js');
const GetUserGameProfileForGameUseCase = require('../application/use-cases/user/getUserGameProfileForGame.useCase.js');
const SubmitIdCardUseCase = require('../application/use-cases/user/submitIdCard.js');
const SubmitVerificationVideoUseCase = require('../application/use-cases/user/submitVerificationVideo.js');

// Admin Use Cases
const ApproveVerificationUseCase = require('../application/use-cases/admin/approveVerification.js');
const RejectVerificationUseCase = require('../application/use-cases/admin/rejectVerification.js');

// Tournament Use Cases
const CreateTournamentUseCase = require('../application/use-cases/tournament/create-tournament.usecase.js');
const ListTournamentsUseCase = require('../application/use-cases/tournament/list-tournaments.usecase.js');
const RegisterForTournamentUseCase = require('../application/use-cases/tournament/registerForTournament.useCase.js');
const GetTournamentUseCase = require('../application/use-cases/tournament/get-tournament.usecase.js');
const DecideTournamentUseCase = require('../application/use-cases/tournament/decideTournament.js');
const StartSingleMatchUseCase = require('../application/use-cases/tournament/startSingleMatch.js');
const RefundEntryFeesUseCase = require('../application/use-cases/tournament/refundEntryFees.js');

// Match Use Cases
const GetMatchUseCase = require('../application/use-cases/match/get-match.usecase.js');
const GetMatchUploadUrlUseCase = require('../application/use-cases/match/get-match-upload-url.usecase.js');
const SubmitMatchResultUseCase = require('../application/use-cases/match/submit-match-result.usecase.js');

// Team Use Cases
const CreateTeamUseCase = require('../application/use-cases/team/createTeam.usecase.js');
const GetTeamByIdUseCase = require('../application/use-cases/team/getTeamById.usecase.js');
const GetAllTeamsUseCase = require('../application/use-cases/team/getAllTeams.usecase.js');
const UpdateTeamUseCase = require('../application/use-cases/team/updateTeam.usecase.js');
const DeleteTeamUseCase = require('../application/use-cases/team/deleteTeam.usecase.js');
const AddTeamMemberUseCase = require('../application/use-cases/teamMember/addTeamMember.usecase.js');
const RemoveTeamMemberUseCase = require('../application/use-cases/teamMember/removeTeamMember.usecase.js');

// Leaderboard Use Cases
const GetLeaderboardUseCase = require('../application/use-cases/leaderboard/get-leaderboard.usecase');
const GetUserRankUseCase = require('../application/use-cases/leaderboard/get-user-rank.usecase');
const UpdateScoreUseCase = require('../application/use-cases/leaderboard/update-score.usecase');

// Chat Use Cases
const CreateChatSessionUseCase = require('../application/use-cases/chat/createChatSession.usecase.js');
const GetUserChatSessionsUseCase = require('../application/use-cases/chat/getUserChatSessions.usecase.js');
const GetChatHistoryUseCase = require('../application/use-cases/chat/getChatHistory.usecase.js');
const EditMessageUseCase = require('../application/use-cases/chat/edit-message.usecase.js');
const DeleteMessageUseCase = require('../application/use-cases/chat/delete-message.usecase.js');

// Upload Use Cases
const UploadFileUseCase = require('../application/use-cases/upload/upload-file.usecase.js');

// Controllers
const AuthController = require('../presentation/controllers/auth.controller.js');
const GameController = require('../presentation/controllers/game.controller.js');
const UserController = require('../presentation/controllers/user.controller.js');
const UserGameProfileController = require('../presentation/controllers/userGameProfile.controller.js');
const TournamentController = require('../presentation/controllers/tournament.controller.js');
const TeamController = require('../presentation/controllers/team.controller.js');
const ChatController = require('../presentation/controllers/chat.controller.js');
const UploadController = require('../presentation/controllers/upload.controller.js');
const AdminController = require('../presentation/controllers/admin.controller.js');
const MatchController = require('../presentation/controllers/match.controller.js');
const LeaderboardController = require('../presentation/controllers/leaderboard.controller.js');
const WalletController = require('../presentation/controllers/wallet.controller.js');
const DashboardController = require('../presentation/controllers/dashboard.controller.js');

// Wallet Use Cases
const GetWalletDetailsUseCase = require('../application/use-cases/wallet/get-wallet-details.usecase.js');
const InitializeDepositUseCase = require('../application/use-cases/wallet/initialize-deposit.usecase.js');
const GetTransactionHistoryUseCase = require('../application/use-cases/wallet/get-transaction-history.usecase.js');
const RequestWithdrawalUseCase = require('../application/use-cases/wallet/request-withdrawal.usecase.js');

// Dashboard Use Cases
const GetDashboardDataUseCase = require('../application/use-cases/dashboard/get-dashboard-data.usecase.js');


// Infrastructure
const LocalFileUploader = require('../infrastructure/file-upload/local.file-uploader.js');
const walletRepository = {}; // This is a mock, replace with actual implementation

function initializeDependencies(redisClient) {
    const repositories = initializeRepositories(redisClient);

    // Instantiate Use Cases
    const registerUserUseCase = new RegisterUserUseCase(repositories.userRepository);
    const loginUseCase = new LoginUseCase(repositories.userRepository);
    const refreshTokenUseCase = new RefreshTokenUseCase(repositories.userRepository);
    const logoutUseCase = new LogoutUseCase(repositories.userRepository);
    const sendVerificationEmailUseCase = new SendVerificationEmailUseCase(repositories.userRepository);
    const verifyEmailUseCase = new VerifyEmailUseCase(repositories.userRepository);

    const createGameUseCase = new CreateGameUseCase(repositories.gameRepository);
    const getGameByIdUseCase = new GetGameByIdUseCase(repositories.gameRepository);
    const listActiveGamesUseCase = new ListActiveGamesUseCase(repositories.gameRepository);
    const updateGameUseCase = new UpdateGameUseCase(repositories.gameRepository);
    const deleteGameUseCase = new DeleteGameUseCase(repositories.gameRepository);

    const getUserProfileUseCase = new GetUserProfileUseCase(repositories.userRepository);
    const updateUserProfileUseCase = new UpdateUserProfileUseCase(repositories.userRepository);
    const listUsersUseCase = new ListUsersUseCase(repositories.userRepository);
    const adminUpdateUserUseCase = new AdminUpdateUserUseCase(repositories.userRepository);
    const adminDeleteUserUseCase = new AdminDeleteUserUseCase(repositories.userRepository);
    const assignRoleUseCase = new AssignRoleUseCase(repositories.userRepository);
    const removeRoleUseCase = new RemoveRoleUseCase(repositories.userRepository);

    const submitIdCardUseCase = new SubmitIdCardUseCase({
        userRepository: repositories.userRepository,
        fileUploader: new LocalFileUploader(),
    });
    const submitVerificationVideoUseCase = new SubmitVerificationVideoUseCase({
        userRepository: repositories.userRepository,
        fileUploader: new LocalFileUploader(),
    });

    const approveVerificationUseCase = new ApproveVerificationUseCase({ userRepository: repositories.userRepository });
    const rejectVerificationUseCase = new RejectVerificationUseCase({ userRepository: repositories.userRepository });

    const upsertUserGameProfileUseCase = new UpsertUserGameProfileUseCase(repositories.userGameProfileRepository, repositories.gameRepository);
    const getUserGameProfilesUseCase = new GetUserGameProfilesUseCase(repositories.userGameProfileRepository);
    const getUserGameProfileForGameUseCase = new GetUserGameProfileForGameUseCase(repositories.userGameProfileRepository);

    const createTournamentUseCase = new CreateTournamentUseCase(repositories.tournamentRepository, repositories.userRepository, repositories.gameRepository);
    const listTournamentsUseCase = new ListTournamentsUseCase(repositories.tournamentRepository);
    const getTournamentUseCase = new GetTournamentUseCase(repositories.tournamentRepository);
    const registerForTournamentUseCase = new RegisterForTournamentUseCase(repositories.tournamentRepository, repositories.tournamentParticipantRepository, repositories.userGameProfileRepository, walletRepository);
    const refundEntryFeesUseCase = new RefundEntryFeesUseCase({
        tournamentParticipantRepository: repositories.tournamentParticipantRepository,
        walletRepository: repositories.walletRepository,
    });
    const startSingleMatchUseCase = new StartSingleMatchUseCase({
        matchRepository: repositories.matchRepository,
        tournamentParticipantRepository: repositories.tournamentParticipantRepository,
    });
    const decideTournamentUseCase = new DecideTournamentUseCase({
        tournamentRepository: repositories.tournamentRepository,
        matchRepository: repositories.matchRepository,
        userRepository: repositories.userRepository,
        startSingleMatch: startSingleMatchUseCase,
        refundEntryFees: refundEntryFeesUseCase,
    });

    const getMatchUseCase = new GetMatchUseCase(repositories.tournamentRepository, repositories.userGameProfileRepository, repositories.matchRepository);
    const getMatchUploadUrlUseCase = new GetMatchUploadUrlUseCase(repositories.matchRepository);
    const submitMatchResultUseCase = new SubmitMatchResultUseCase(repositories.matchRepository);

    const matchController = new MatchController({
        getMatchUseCase,
        getMatchUploadUrlUseCase,
        submitMatchResultUseCase,
    });

    const createTeamUseCase = new CreateTeamUseCase({
        teamRepository: repositories.teamRepository,
        teamMemberRepository: repositories.teamMemberRepository,
        userRepository: repositories.userRepository,
    });
    const getTeamByIdUseCase = new GetTeamByIdUseCase(repositories.teamRepository);
    const getAllTeamsUseCase = new GetAllTeamsUseCase(repositories.teamRepository);
    const updateTeamUseCase = new UpdateTeamUseCase(repositories.teamRepository);
    const deleteTeamUseCase = new DeleteTeamUseCase(repositories.teamRepository);
    const addTeamMemberUseCase = new AddTeamMemberUseCase(repositories.teamMemberRepository, repositories.teamRepository, repositories.userRepository);
    const removeTeamMemberUseCase = new RemoveTeamMemberUseCase(repositories.teamMemberRepository, repositories.teamRepository);

    const getLeaderboardUseCase = new GetLeaderboardUseCase(repositories.leaderboardRepository);
    const getUserRankUseCase = new GetUserRankUseCase(repositories.leaderboardRepository);
    const updateScoreUseCase = new UpdateScoreUseCase(repositories.leaderboardRepository, repositories.userRepository);

    const createChatSessionUseCase = new CreateChatSessionUseCase({ chatRepository: repositories.chatRepository, userRepository: repositories.userRepository });
    const getUserChatSessionsUseCase = new GetUserChatSessionsUseCase({ chatRepository: repositories.chatRepository });
    const getChatHistoryUseCase = new GetChatHistoryUseCase({ chatRepository: repositories.chatRepository });
    const editMessageUseCase = new EditMessageUseCase(repositories.chatRepository);
    const deleteMessageUseCase = new DeleteMessageUseCase(repositories.chatRepository);

    const localFileUploader = new LocalFileUploader();
    const uploadFileUseCase = new UploadFileUseCase(localFileUploader);

    // Instantiate Controllers
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

    const tournamentController = new TournamentController({
        createTournamentUseCase,
        listTournamentsUseCase,
        getTournamentUseCase,
        registerForTournamentUseCase,
        decideTournamentUseCase,
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

    const uploadController = new UploadController({
        uploadFileUseCase,
    });

    const userController = new UserController({
        getUserProfileUseCase,
        updateUserProfileUseCase,
        listUsersUseCase,
        adminUpdateUserUseCase,
        adminDeleteUserUseCase,
        assignRoleUseCase,
        removeRoleUseCase,
        submitIdCardUseCase,
        submitVerificationVideoUseCase,
    });

    const adminController = new AdminController({
        approveVerificationUseCase,
        rejectVerificationUseCase,
    });

    const leaderboardController = new LeaderboardController({
        getLeaderboardUseCase,
        getUserRankUseCase,
    });

    const getWalletDetailsUseCase = new GetWalletDetailsUseCase(repositories.walletRepository);
    const initializeDepositUseCase = new InitializeDepositUseCase(repositories.walletRepository);
    const getTransactionHistoryUseCase = new GetTransactionHistoryUseCase(repositories.transactionRepository);
    const requestWithdrawalUseCase = new RequestWithdrawalUseCase(repositories.walletRepository);

    const walletController = new WalletController({
        getWalletDetailsUseCase,
        initializeDepositUseCase,
        getTransactionHistoryUseCase,
        requestWithdrawalUseCase,
    });

    const getDashboardDataUseCase = new GetDashboardDataUseCase({
        tournamentRepository: repositories.tournamentRepository,
        matchRepository: repositories.matchRepository,
        userRepository: repositories.userRepository,
    });

    const dashboardController = new DashboardController({
        getDashboardDataUseCase,
    });

    return {
        authController,
        gameController,
        userGameProfileController,
        tournamentController,
        teamController,
        chatController,
        uploadController,
        matchController,
        adminController,
        userController,
        leaderboardController,
        walletController,
        dashboardController,
        //... export other dependencies if needed
    };
}

let dependencies = {};

function getDependencies() {
    return dependencies;
}

async function initialize(redisClient) {
    dependencies = initializeDependencies(redisClient);
}

module.exports = {
    initialize,
    getDependencies,
};
