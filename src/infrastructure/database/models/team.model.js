const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class TeamModel extends Model {
    static associate(models) {
      TeamModel.belongsTo(models.User, { // Note: Using models.User as per project structure
        foreignKey: 'ownerId',
        as: 'owner',
      });
      TeamModel.hasMany(models.TeamMember, { // Note: This will be models.TeamMemberModel once defined
        foreignKey: 'teamId',
        as: 'members',
      });
    }
  }

  TeamModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
      },
      logoUrl: {
        type: DataTypes.STRING,
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users', // Table name for users
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'Team', // Sequelize model name
      tableName: 'Teams', // Actual table name in DB
      timestamps: true,
    }
  );

  return TeamModel;
};
