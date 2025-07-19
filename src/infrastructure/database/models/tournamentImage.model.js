const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TournamentImage extends Model {
    static associate(models) {
      TournamentImage.belongsTo(models.Tournament, {
        foreignKey: 'tournamentId',
        as: 'tournament',
      });
    }
  }

  TournamentImage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tournamentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Tournaments',
          key: 'id',
        },
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'TournamentImage',
      tableName: 'TournamentImages',
      timestamps: true,
    }
  );

  return TournamentImage;
};
