// src/infrastructure/database/models/tournament.model.js
const { DataTypes, Model } = require('sequelize');
const { Tournament, TournamentStatus, BracketType } = require('../../../domain/tournament/tournament.entity');

class TournamentModel extends Model {
  toDomainEntity() {
    const tournamentJson = this.toJSON();
    const tournament = Tournament.fromPersistence(tournamentJson);

    if (tournamentJson.participants) {
      tournament.participants = tournamentJson.participants.map(p => p.toDomainEntity());
    }

    return tournament;
  }

  static associate(models) {
    // A tournament belongs to a game.
    this.belongsTo(models.GameModel, { // Corrected
      foreignKey: 'gameId',
      as: 'game', // This allows us to include game details when querying tournaments
    });

    // A tournament is organized by a user (organizer).
    this.belongsTo(models.UserModel, { // Corrected
      foreignKey: 'organizerId',
      as: 'organizer',
    });

    // A tournament can have many matches.
    this.hasMany(models.MatchModel, { // Corrected
      foreignKey: 'tournamentId',
      as: 'matches',
    });

    // Add other associations if needed, e.g., with TournamentParticipant
    this.hasMany(models.TournamentParticipantModel, {
      foreignKey: 'tournamentId',
      as: 'participants',
    });
  }
}

module.exports = (sequelize) => {
  TournamentModel.init({
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // gameName is replaced by gameId
    // gameName: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    // },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Games', // Name of the Games table (created from Game model)
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // Or SET NULL if you want to keep tournaments of deleted games
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TournamentStatus)),
      allowNull: false,
      defaultValue: TournamentStatus.UPCOMING, // Defaulting to UPCOMING as per original model
    },
    maxParticipants: { // Changed from capacity
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currentParticipants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    entryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    prizePool: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bannerImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    organizerId: { // Changed from createdBy
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users', // Name of the Users table
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    bracketType: {
      type: DataTypes.ENUM(...Object.values(BracketType)),
      allowNull: false,
      defaultValue: BracketType.SINGLE_ELIMINATION,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Tournament',
    tableName: 'Tournaments',
    timestamps: true,
  });
  return TournamentModel;
};
