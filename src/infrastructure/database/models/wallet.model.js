// src/infrastructure/database/models/wallet.model.js
const { DataTypes, Model } = require('sequelize');
const { Wallet } = require('../../../domain/wallet/wallet.entity');

class WalletModel extends Model {
  static toDomainEntity(walletModelInstance) {
    if (!walletModelInstance) return null;
    const data = walletModelInstance.get({ plain: true });
    return new Wallet(
      data.id,
      data.userId,
      parseFloat(data.balance), // Ensure balance is a number
      data.currency,
      data.createdAt,
      data.updatedAt
    );
  }
}

module.exports = (sequelize) => {
  WalletModel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // Each user has one wallet
      // references: { model: 'Users', key: 'id' } // This will be set up in models/index.js associations
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2), // Compatible with PostgreSQL NUMERIC
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: true,
        min: 0, // Balance cannot be negative
      },
    },
    currency: {
      type: DataTypes.STRING(3), // e.g., USD, EUR
      allowNull: false,
      defaultValue: 'USD',
    },
  }, {
    sequelize,
    modelName: 'Wallet',
    tableName: 'Wallets',
    timestamps: true,
  });
  return WalletModel;
};
