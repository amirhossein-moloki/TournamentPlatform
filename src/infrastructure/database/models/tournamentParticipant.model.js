// src/infrastructure/database/models/tournamentParticipant.model.js
const { DataTypes, Model } = require('sequelize');
const { TournamentParticipant } = require('../../../domain/tournament/tournamentParticipant.entity');

class TournamentParticipantModel extends Model {
  static toDomainEntity(modelInstance) {
    if (!modelInstance) return null;
    return TournamentParticipant.fromPersistence(modelInstance.get({ plain: true }));
  }
}

module.exports = (sequelize) => {
  TournamentParticipantModel.init({
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    tournamentId: { type: DataTypes.UUID, allowNull: false /* References will be set in associations */ },
    participantId: { type: DataTypes.UUID, allowNull: false }, // User or Team ID
    participantType: { type: DataTypes.STRING, allowNull: false }, // 'user' or 'team'
    registeredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    checkInStatus: { type: DataTypes.BOOLEAN, defaultValue: false },
    seed: { type: DataTypes.INTEGER },
  }, { sequelize, modelName: 'TournamentParticipant', tableName: 'TournamentParticipants', timestamps: true });
  return TournamentParticipantModel;
};
