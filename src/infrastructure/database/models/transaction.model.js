// src/infrastructure/database/models/transaction.model.js
const { DataTypes, Model } = require('sequelize');
const { Transaction } = require('../../../domain/wallet/transaction.entity');

class TransactionModel extends Model {
  static toDomainEntity(txModelInstance) {
    if (!txModelInstance) return null;
    const data = txModelInstance.get({ plain: true });
    return new Transaction(
      data.id,
      data.walletId,
      data.type,
      parseFloat(data.amount), // Ensure amount is a number
      data.status,
      data.idempotencyKey,
      data.description,
      data.metadata,
      data.transactionDate,
      data.createdAt,
      data.updatedAt
    );
  }

  static associate(models) {
    // A transaction belongs to a wallet
    this.belongsTo(models.WalletModel, {
      foreignKey: 'walletId',
      as: 'wallet',
    });
  }
}

module.exports = (sequelize) => { // sequelize instance is passed here
  TransactionModel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references will be set in models/index.js
    },
    type: {
      type: DataTypes.ENUM(...Transaction.validTypes),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0.01, // Transactions usually involve a positive amount
      },
    },
    status: {
      type: DataTypes.ENUM(...Transaction.validStatuses),
      allowNull: false,
      defaultValue: Transaction.Status.PENDING, // Ensure this matches the string value 'PENDING'
    },
    idempotencyKey: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    transactionDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW, // Corrected default value
    },
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'Transactions',
    timestamps: true,
    indexes: [
      { fields: ['walletId'] },
      { fields: ['type'] },
      { fields: ['status'] },
      // unique constraint on idempotencyKey is already defined on the column itself
      // but if it wasn't, it could be { fields: ['idempotencyKey'], unique: true }
    ],
  });
  return TransactionModel;
};
