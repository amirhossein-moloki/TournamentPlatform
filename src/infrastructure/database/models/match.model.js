// src/infrastructure/database/models/match.model.js
const { DataTypes, Model } = require('sequelize');
const { Match, MatchStatus } = require('../../../domain/tournament/match.entity');

class MatchModel extends Model {
    toDomainEntity() {
        return Match.fromPersistence(this.toJSON());
    }
}

module.exports = (sequelize) => {
    MatchModel.init({
        id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
        tournamentId: { type: DataTypes.UUID, allowNull: false /* References will be set in associations */ },
        roundNumber: { type: DataTypes.INTEGER, allowNull: false }, // Changed from round
        matchNumberInRound: { type: DataTypes.INTEGER, allowNull: false }, // Added allowNull: false
        participant1Id: { type: DataTypes.UUID, allowNull: true },
        participant1Type: { type: DataTypes.STRING, allowNull: true }, // 'user' or 'team'
        participant2Id: { type: DataTypes.UUID, allowNull: true },
        participant2Type: { type: DataTypes.STRING, allowNull: true },
        participant1Score: { type: DataTypes.INTEGER },
        participant2Score: { type: DataTypes.INTEGER },
        winnerId: { type: DataTypes.UUID },
        winnerType: { type: DataTypes.STRING },
        status: { type: DataTypes.ENUM(...Object.values(MatchStatus)), allowNull: false, defaultValue: MatchStatus.PENDING },
        scheduledTime: { type: DataTypes.DATE },
        actualStartTime: { type: DataTypes.DATE },
        actualEndTime: { type: DataTypes.DATE },
        resultProofUrlP1: { type: DataTypes.STRING },
        resultProofUrlP2: { type: DataTypes.STRING },
        isConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // Added field
        moderatorNotes: { type: DataTypes.TEXT },
        nextMatchId: { type: DataTypes.UUID /* References will be set in associations */ },
        nextMatchLoserId: { type: DataTypes.UUID /* References will be set in associations */ },
        metadata: { type: DataTypes.JSONB },
    }, { sequelize, modelName: 'Match', tableName: 'Matches', timestamps: true });
    return MatchModel;
};
