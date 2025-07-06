import { DataTypes, Model } from 'sequelize';

/**
 * Initializes the Game model.
 * @param {import('sequelize').Sequelize} sequelize The Sequelize instance.
 * @returns {typeof Model} The Game model.
 */
const initGameModel = (sequelize) => {
  class Game extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index.js` file will call this method automatically.
     */
    static associate(models) {
      // A game can have many tournaments.
      this.hasMany(models.Tournament, {
        foreignKey: 'gameId',
        as: 'tournaments',
      });

      // A game can have many teams.
      this.hasMany(models.Team, { // Assuming models.Team will exist
        foreignKey: 'gameId',
        as: 'teams',
        // onDelete: 'CASCADE', // Or 'SET NULL' depending on desired behavior if a Game is deleted
      });

      // A game can have many user game profiles (linking users to this game with their in-game names)
      this.hasMany(models.UserGameProfile, { // Assuming UserGameProfileModel is models.UserGameProfile
        foreignKey: 'gameId',
        as: 'userGameProfiles', // Alias for user profiles specific to this game
        onDelete: 'CASCADE', // If a game is deleted, the specific user profiles for it are also deleted
      });
    }
  }

  Game.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'A game with this name already exists.'
      },
      validate: {
        notEmpty: { msg: 'Game name cannot be empty.' },
      }
    },
    shortName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'A game with this short name already exists.'
      },
      validate: {
        notEmpty: { msg: 'Game short name cannot be empty.' },
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    iconUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isUrl: { msg: 'Please provide a valid URL for the icon.' }
      }
    },
    bannerUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: { msg: 'Please provide a valid URL for the banner.' }
        }
    },
    platforms: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
    },
    supportedModes: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    // This new field defines the win condition for the game.
    winCondition: {
        type: DataTypes.ENUM('higher_score_wins', 'lower_score_wins'),
        allowNull: false,
        defaultValue: 'higher_score_wins',
    }
  }, {
    sequelize,
    modelName: 'Game',
    tableName: 'games',
    timestamps: true,
  });

  return Game;
};

export default initGameModel;
