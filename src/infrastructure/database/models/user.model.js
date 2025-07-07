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

  static associate(models) {
    // User -> UserGameProfile (One-to-Many)
    this.hasMany(models.UserGameProfileModel, { // Corrected
      foreignKey: 'userId',
      as: 'gameProfiles',
      onDelete: 'CASCADE',
    });

    // User -> Tournament (Organizer/Creator) (One-to-Many)
    // Note: The foreignKey in TournamentModel was 'organizerId'
    this.hasMany(models.TournamentModel, { // Corrected
      foreignKey: 'organizerId', // This FK must exist in TournamentModel
      as: 'organizedTournaments', // Alias for tournaments organized by the user
      onDelete: 'SET NULL', // Or 'CASCADE' if tournaments should be deleted with user
    });

    // User -> Wallet (One-to-One)
    this.hasOne(models.WalletModel, { // Corrected
      foreignKey: 'userId',
      as: 'wallet',
      onDelete: 'CASCADE',
    });

    // User -> Transaction (though usually Wallet -> Transaction)
    // If users can directly have transactions not tied to a wallet, define here.
    // Otherwise, this is typically accessed via user.getWallet().then(wallet => wallet.getTransactions())

    // User -> DisputeTicket (Reporter) (One-to-Many)
    this.hasMany(models.DisputeTicketModel, { // Corrected
      foreignKey: 'reporterId',
      as: 'reportedDisputes',
      onDelete: 'SET NULL',
    });

    // User -> DisputeTicket (Moderator) (One-to-Many)
    this.hasMany(models.DisputeTicketModel, { // Corrected
      foreignKey: 'moderatorId',
      as: 'moderatedDisputes',
      onDelete: 'SET NULL',
    });

    // User -> IdempotencyRequest (One-to-Many)
    this.hasMany(models.IdempotencyRequestModel, { // Corrected
      foreignKey: 'userId',
      as: 'idempotencyRequests',
      onDelete: 'CASCADE',
    });

    // User -> TournamentParticipant (if a user can be a participant directly)
    // This depends on how TournamentParticipant is structured.
    // If TournamentParticipant links a User to a Tournament:
    // this.hasMany(models.TournamentParticipant, {
    //   foreignKey: 'userId', // Assuming TournamentParticipant has userId
    //   as: 'participations',
    // });
  }
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
