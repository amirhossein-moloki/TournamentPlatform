// src/infrastructure/database/models/tournamentParticipant.model.js
const { DataTypes, Model } = require('sequelize');
const { TournamentParticipant } = require('../../../domain/tournament/tournamentParticipant.entity');

class TournamentParticipantModel extends Model {
  toDomainEntity() {
    return TournamentParticipant.fromPersistence(this.get({ plain: true }));
  }

  static associate(models) {
    // A tournament participant record belongs to a tournament
    this.belongsTo(models.TournamentModel, {
      foreignKey: 'tournamentId',
      as: 'tournament',
    });

    // Note: Associations for participantId (to UserModel or TeamModel)
    // are typically handled at the application/repository layer due to polymorphism.
    // If you wanted to attempt this at the model level, you might use hooks
    // or define separate, nullable foreign keys (e.g., userId, teamId).
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
