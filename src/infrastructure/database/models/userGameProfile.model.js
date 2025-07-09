// src/infrastructure/database/models/userGameProfile.model.js
const { DataTypes, Model } = require('sequelize');

/**
 * Initializes the UserGameProfile model.
 * @param {import('sequelize').Sequelize} sequelize The Sequelize instance.
 * @returns {typeof Model} The UserGameProfile model.
 */
const initUserGameProfileModel = (sequelize) => {
  class UserGameProfile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index.js` file will call this method automatically.
     */
    static associate(models) {
      // A UserGameProfile belongs to a User
      this.belongsTo(models.UserModel, { // Corrected
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE', // If user is deleted, their game profiles are also deleted
      });

      // A UserGameProfile belongs to a Game
      this.belongsTo(models.GameModel, { // Corrected
        foreignKey: 'gameId',
        as: 'game',
        onDelete: 'CASCADE', // If a game is deleted, associated user profiles for that game are also deleted
      });
    }
  }

  UserGameProfile.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users', // Name of the Users table
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    gameId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Games', // Name of the Games table
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    inGameName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'In-game name cannot be empty.' },
        len: {
            args: [1, 100], // Example length validation
            msg: 'In-game name must be between 1 and 100 characters.'
        }
      }
    },
    // Timestamps
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  }, {
    sequelize,
    modelName: 'UserGameProfile',
    tableName: 'UserGameProfiles',
    timestamps: true, // Sequelize will manage createdAt and updatedAt
    indexes: [
      {
        unique: true,
        fields: ['userId', 'gameId'],
        name: 'unique_user_game_profile' // Optional: specify a name for the index
      }
    ]
  });

  return UserGameProfile;
};

module.exports = initUserGameProfileModel;
