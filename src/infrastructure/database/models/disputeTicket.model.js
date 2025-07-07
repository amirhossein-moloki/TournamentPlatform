// src/infrastructure/database/models/disputeTicket.model.js
const { DataTypes, Model } = require('sequelize');
const { DisputeTicket } = require('../../../domain/dispute/dispute.entity'); // For DisputeTicket.Status and .validStatuses

class DisputeTicketModel extends Model {
  static toDomainEntity(modelInstance) {
    if (!modelInstance) return null;
    // DisputeTicket.fromPersistence will handle the mapping
    return DisputeTicket.fromPersistence(modelInstance.get({ plain: true }));
  }

  static associate(models) {
    // A dispute ticket belongs to a match
    this.belongsTo(models.MatchModel, {
      foreignKey: 'matchId',
      as: 'match',
    });

    // A dispute ticket is reported by a user
    this.belongsTo(models.UserModel, {
      foreignKey: 'reporterId',
      as: 'reporter',
    });

    // A dispute ticket can be assigned to a moderator (user)
    this.belongsTo(models.UserModel, {
      foreignKey: 'moderatorId',
      as: 'moderator', // Alias for the moderator user
    });
  }
}

module.exports = (sequelize) => {
  DisputeTicketModel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // Ensuring one dispute per match as per original index
      // references: { model: 'Matches', key: 'id' } // Set in models/index.js
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: { model: 'Users', key: 'id' } // Set in models/index.js
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: DisputeTicket.Status.OPEN, // Assuming DisputeTicket.Status.OPEN is 'OPEN'
      validate: {
        isIn: [Object.values(DisputeTicket.Status)], // Use Object.values if Status is an enum-like object
      },
    },
    resolutionDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    moderatorId: { // User ID of the admin/moderator
      type: DataTypes.UUID,
      allowNull: true,
      // references: { model: 'Users', key: 'id' } // Set in models/index.js
    },
  }, {
    sequelize,
    modelName: 'DisputeTicket',
    tableName: 'DisputeTickets',
    timestamps: true,
    indexes: [
      // { unique: true, fields: ['matchId'] }, // Handled by unique:true on column
      { fields: ['status'] },
      { fields: ['moderatorId'] },
      { fields: ['reporterId'] },
    ],
  });
  return DisputeTicketModel;
};
