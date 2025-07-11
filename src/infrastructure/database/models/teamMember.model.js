const { DataTypes, Model } = require('sequelize');
const TeamRole = require('../../../domain/team/teamRole.enums');

module.exports = (sequelize) => {
  class TeamMemberModel extends Model {
    static associate(models) {
      TeamMemberModel.belongsTo(models.Team, { // Note: This should be models.TeamModel
        foreignKey: 'teamId',
        as: 'team',
      });
      TeamMemberModel.belongsTo(models.User, { // Note: This should be models.UserModel
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  TeamMemberModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      teamId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Teams', // Table name for teams
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users', // Table name for users
          key: 'id',
        },
      },
      role: {
        type: DataTypes.ENUM,
        values: Object.values(TeamRole),
        allowNull: false,
        defaultValue: TeamRole.MEMBER,
      },
      status: {
        type: DataTypes.STRING, // 'invited', 'active', 'rejected', 'left', 'kicked'
        allowNull: false,
        defaultValue: 'invited',
      },
    },
    {
      sequelize,
      modelName: 'TeamMember', // Sequelize model name
      tableName: 'TeamMembers', // Actual table name in DB
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['teamId', 'userId'],
          name: 'team_user_unique_constraint', // Optional: specify index name
        },
      ],
    }
  );

  return TeamMemberModel;
};
