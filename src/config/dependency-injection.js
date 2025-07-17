// src/config/dependency-injection.js

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

function initializeRepositories(redisClient) {
    const gameRepository = new GameRepository(db.GameModel, db.GameImageModel);
    const userRepository = new PostgresUserRepository({ UserModel: db.UserModel });
    const userGameProfileRepository = new UserGameProfileRepository(db.UserGameProfileModel, db.GameModel);
    const tournamentParticipantRepository = new PostgresTournamentParticipantRepository(db.TournamentParticipantModel, db.UserModel, db.TournamentModel);
    const tournamentRepository = new PostgresTournamentRepository({
        TournamentModel: db.TournamentModel,
        TournamentParticipantModel: db.TournamentParticipantModel,
        GameModel: db.GameModel,
        UserModel: db.UserModel,
    });
    const matchRepository = new PostgresMatchRepository({
        MatchModel: db.MatchModel,
        TournamentModel: db.TournamentModel,
        GameModel: db.GameModel,
    });
    const teamRepository = new PostgresTeamRepository({
        TeamModel: db.TeamModel,
        TeamMemberModel: db.TeamMemberModel,
        UserModel: db.UserModel,
        sequelize: db.sequelize,
    });
    const teamMemberRepository = new PostgresTeamMemberRepository({
        TeamMemberModel: db.TeamMemberModel,
        UserModel: db.UserModel,
        TeamModel: db.TeamModel,
        sequelize: db.sequelize,
    });
    const chatRepository = new PostgresChatRepository({
        ChatSessionModel: db.ChatSessionModel,
        ChatMessageModel: db.ChatMessageModel,
    });
    const leaderboardRepository = new LeaderboardRedisRepository(redisClient);

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
    };
}

module.exports = { initializeRepositories };
