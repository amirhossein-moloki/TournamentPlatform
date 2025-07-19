const db = require('../infrastructure/database/models');
const GameRepository = require('../infrastructure/database/repositories/game.repository');
const UserGameProfileRepository = require('../infrastructure/database/repositories/userGameProfile.repository');
const { PostgresTournamentRepository } = require('../infrastructure/database/repositories/postgres.tournament.repository');
const { PostgresMatchRepository } = require('../infrastructure/database/repositories/postgres.match.repository');
const { PostgresUserRepository } = require('../infrastructure/database/repositories/postgres.user.repository');
const { PostgresTournamentParticipantRepository } = require('../infrastructure/database/repositories/postgres.tournamentParticipant.repository');
const { PostgresTeamRepository } = require('../infrastructure/database/repositories/postgres.team.repository');
const { PostgresTeamMemberRepository } = require('../infrastructure/database/repositories/postgres.teamMember.repository');
const PostgresChatRepository = require('../infrastructure/database/repositories/postgres.chat.repository');
const LeaderboardRedisRepository = require('../infrastructure/database/repositories/leaderboard.redis.repository');
const GetDashboardDataUseCase = require('../application/use-cases/dashboard/get-dashboard-data.usecase');
const MatchController = require('../presentation/controllers/match.controller');
const GetMatchUseCase = require('../application/use-cases/match/get-match.usecase');
const GetMatchUploadUrlUseCase = require('../application/use-cases/match/get-match-upload-url.usecase');
const SubmitMatchResultUseCase = require('../application/use-cases/match/submit-match-result.usecase');
const FileValidationService = require('../application/services/fileValidation.service');

function initializeRepositories(redisClient) {
    const gameRepository = new GameRepository(db.GameModel, db.GameImageModel);
    const userRepository = new PostgresUserRepository(db.UserModel);
    const userGameProfileRepository = new UserGameProfileRepository(db.UserGameProfileModel, db.GameModel);
    const tournamentParticipantRepository = new PostgresTournamentParticipantRepository(db.TournamentParticipantModel, db.UserModel, db.TournamentModel);
    const tournamentRepository = new PostgresTournamentRepository(
        db.TournamentModel,
        db.TournamentParticipantModel,
        db.GameModel,
        db.UserModel
    );
    const matchRepository = new PostgresMatchRepository(
        db.MatchModel,
        db.TournamentModel,
        db.GameModel
    );
    const teamRepository = new PostgresTeamRepository(
        db.TeamModel,
        db.TeamMemberModel,
        db.UserModel,
        db.sequelize
    );
    const teamMemberRepository = new PostgresTeamMemberRepository(
        db.TeamMemberModel,
        db.UserModel,
        db.TeamModel,
        db.sequelize
    );
    const chatRepository = new PostgresChatRepository(
        db.ChatSessionModel,
        db.ChatMessageModel
    );
    const leaderboardRepository = new LeaderboardRedisRepository(redisClient);

    const getDashboardDataUseCase = new GetDashboardDataUseCase(
        userRepository,
        new (require('../infrastructure/database/repositories/postgres.wallet.repository'))(db.WalletModel),
        tournamentRepository
    );

    const fileValidationService = new FileValidationService();

    const getMatchUseCase = new GetMatchUseCase(tournamentRepository, userGameProfileRepository, matchRepository);
    const getMatchUploadUrlUseCase = new GetMatchUploadUrlUseCase(tournamentRepository);
    const submitMatchResultUseCase = new SubmitMatchResultUseCase(tournamentRepository, fileValidationService);

    const matchController = new MatchController(
        getMatchUseCase,
        getMatchUploadUrlUseCase,
        submitMatchResultUseCase
    );

    return {
        gameRepository,
        userRepository,
        userGameProfileRepository,
        tournamentParticipantRepository,
        tournamentRepository,
        matchRepository,
        teamRepository,
        teamMemberRepository,
        chatRepository,
        leaderboardRepository,
        getDashboardDataUseCase,
        matchController,
    };
}

module.exports = { initializeRepositories };
