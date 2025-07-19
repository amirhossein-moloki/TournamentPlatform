const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TeamInvitation extends Model {}

  TeamInvitation.init(
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
          model: 'Teams',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      inviterId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
    },
    {
      sequelize,
      modelName: 'TeamInvitation',
      tableName: 'TeamInvitations',
      timestamps: true,
    }
  );

  return TeamInvitation;
};
