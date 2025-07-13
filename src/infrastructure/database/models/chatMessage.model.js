// src/infrastructure/database/models/chatMessage.model.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ChatMessageModel extends Model {
    static associate(models) {
      this.belongsTo(models.ChatSessionModel, {
        foreignKey: 'session_id',
        as: 'session',
      });
      this.belongsTo(models.UserModel, {
        foreignKey: 'sender_id',
        as: 'sender',
      });
    }
  }

  ChatMessageModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sender_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message_content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      message_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'TEXT',
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ChatMessageModel',
      tableName: 'ChatMessages',
      timestamps: false, // Timestamps are handled manually by the entity/migration
    }
  );

  return ChatMessageModel;
};
