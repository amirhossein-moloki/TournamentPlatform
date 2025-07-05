// src/infrastructure/database/models/user.model.js
const { DataTypes, Model } = require('sequelize');
const { User } = require('../../../domain/user/user.entity'); // Domain entity

class UserModel extends Model {
  static toDomainEntity(userModelInstance) {
    if (!userModelInstance) return null;
    const data = userModelInstance.get({ plain: true });
    return new User(
      data.id,
      data.username,
      data.email,
      data.passwordHash,
      data.role,
      data.refreshToken,
      data.isVerified,
      data.lastLogin,
      data.createdAt,
      data.updatedAt,
      data.verificationToken,
      data.tokenVersion
    );
  }

  // Instance method if preferred, though static is fine for this conversion
  // toDomainEntity() {
  //   if (!this) return null;
  //   const data = this.get({ plain: true });
  //   return new User(...Object.values(data)); // Adjust based on User constructor
  // }
}

module.exports = (sequelize) => {
  UserModel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('User', 'Admin', 'DisputeModerator', 'FinanceManager'),
      allowNull: false,
      defaultValue: 'User',
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastLogin: {
      type: DataTypes.DATE,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
  });
  return UserModel;
};
