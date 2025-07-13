// src/infrastructure/database/models/chatSession.model.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ChatSessionModel extends Model {
    static associate(models) {
      this.belongsTo(models.UserModel, {
        foreignKey: 'user_id',
        as: 'user',
      });
      this.belongsTo(models.UserModel, {
        foreignKey: 'support_id',
        as: 'supportAgent',
      });
      this.belongsTo(models.TournamentModel, {
        foreignKey: 'tournament_id',
        as: 'tournament',
      });
      this.hasMany(models.ChatMessageModel, {
        foreignKey: 'session_id',
        as: 'messages',
      });
    }
  }

  ChatSessionModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      support_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'OPEN',
      },
      tournament_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      user_last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      support_last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ChatSessionModel',
      tableName: 'ChatSessions',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ChatSessionModel;
};
