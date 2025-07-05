// src/infrastructure/database/models/tournament.model.js
const { DataTypes, Model } = require('sequelize');
const { Tournament, TournamentStatus, BracketType } = require('../../../domain/tournament/tournament.entity');

class TournamentModel extends Model {
  toDomainEntity() {
    return Tournament.fromPersistence(this.toJSON());
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
    gameName: { // Changed from gameType
      type: DataTypes.STRING,
      allowNull: false,
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
