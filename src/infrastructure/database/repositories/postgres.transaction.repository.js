const { sequelize, DataTypes, Op } = require('../postgres.connector');
const { Transaction } = require('../../../domain/wallet/transaction.entity');
const TransactionRepositoryInterface = require('../../../domain/wallet/transaction.repository.interface');
// const { WalletModel } = require('./postgres.wallet.repository'); // If needed for associations

// Define the Sequelize model for Transaction, mapping to the 'Transactions' table
const TransactionModel = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  walletId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Wallets', // Name of the Wallets table
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE', // Or 'RESTRICT' if transactions should prevent wallet deletion
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    // Consider ENUM if types are strictly defined and limited
    // type: DataTypes.ENUM(...Transaction.validTypes), // If Transaction.validTypes is available and static
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
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'PENDING',
    // Consider ENUM if statuses are strictly defined
    // type: DataTypes.ENUM(...Transaction.validStatuses),
  },
  idempotencyKey: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true, // Ensures idempotency
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB, // For storing gateway responses, etc.
    allowNull: true,
  },
  transactionDate: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
  },
  // createdAt and updatedAt are automatically added by Sequelize
}, {
  tableName: 'Transactions',
  timestamps: true,
  indexes: [ // Ensure indexes match migration
    { fields: ['walletId'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['idempotencyKey'], unique: true }, // Redundant if unique:true on column, but good for clarity
  ],
});

// Optional: Define association if you need to include Wallet details when fetching Transaction
// TransactionModel.belongsTo(WalletModel, { foreignKey: 'walletId', as: 'wallet' });

// Helper to convert Sequelize model instance to domain Transaction entity
function toDomainEntity(txModelInstance) {
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

class PostgresTransactionRepository extends TransactionRepositoryInterface {
  constructor() {
    super();
    this.TransactionModel = TransactionModel;
  }

  async findById(id) {
    const txModelInstance = await this.TransactionModel.findByPk(id);
    return toDomainEntity(txModelInstance);
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null; // Or throw error if key is mandatory for this lookup
    const txModelInstance = await this.TransactionModel.findOne({ where: { idempotencyKey } });
    return toDomainEntity(txModelInstance);
  }

  async findAllByWalletId({ walletId, page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC' }) {
    const offset = (page - 1) * limit;
    const whereClause = { walletId };

    if (filters.type) {
      whereClause.type = filters.type;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }
    // Add date range filters if needed:
    // if (filters.startDate) whereClause.transactionDate = { [Op.gte]: filters.startDate };
    // if (filters.endDate) whereClause.transactionDate = { ...whereClause.transactionDate, [Op.lte]: filters.endDate };

    const { count, rows } = await this.TransactionModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    return {
      transactions: rows.map(toDomainEntity),
      total: count,
      page,
      limit,
    };
  }

  async findAll({ page = 1, limit = 10, filters = {}, sortBy = 'transactionDate', sortOrder = 'DESC' }) {
    const offset = (page - 1) * limit;
    const whereClause = { ...filters }; // Directly use filters passed, assuming they match column names

    // Example of more specific filter handling:
    // if (filters.userId) { /* This would require joining with Wallets then Users */ }

    const { count, rows } = await this.TransactionModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      // include: [{ model: WalletModel, as: 'wallet', include: [User] }] // If deep fetching needed
    });

    return {
      transactions: rows.map(toDomainEntity),
      total: count,
      page,
      limit,
    };
  }

  async create(transactionEntityOrData) {
    const txData = {
      id: transactionEntityOrData.id, // Assuming ID is pre-generated
      walletId: transactionEntityOrData.walletId,
      type: transactionEntityOrData.type,
      amount: transactionEntityOrData.amount,
      status: transactionEntityOrData.status || 'PENDING',
      idempotencyKey: transactionEntityOrData.idempotencyKey,
      description: transactionEntityOrData.description,
      metadata: transactionEntityOrData.metadata,
      transactionDate: transactionEntityOrData.transactionDate || new Date(),
    };
    const createdTxModel = await this.TransactionModel.create(txData);
    return toDomainEntity(createdTxModel);
  }

  async update(id, updateData, options = {}) {
    // Sanitize updateData to only include fields that should be updatable
    const allowedUpdates = ['status', 'description', 'metadata', 'transactionDate'];
    const sanitizedUpdateData = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        sanitizedUpdateData[key] = updateData[key];
      }
    }

    if (Object.keys(sanitizedUpdateData).length === 0) {
      return this.findById(id); // No valid fields to update
    }

    const [numberOfAffectedRows] = await this.TransactionModel.update(
      sanitizedUpdateData,
      {
        where: { id },
        transaction: options.transaction, // Pass transaction if provided
      }
    );

    if (numberOfAffectedRows > 0) {
      const updatedInstance = await this.TransactionModel.findByPk(id);
      return toDomainEntity(updatedInstance);
    }
    return null;
  }
}

module.exports = PostgresTransactionRepository;

// Note: TransactionModel aligns with the 'Transactions' table in migration.
// Amount validation (min: 0.01) is included.
// IdempotencyKey has a unique constraint.
// Indexes from migration are mirrored in model definition for clarity, though Sequelize might infer them.
// `findAll` is a generic method for querying transactions, useful for admin purposes.
// `findAllByWalletId` is specific to a user's wallet transaction history.
// `create` assumes ID is pre-generated (e.g., UUID by application/domain).
// `update` allows changing status, description, metadata, and transactionDate.
// The commented-out `delete` method from interface aligns with best practice of not deleting financial records.
// `Op` from Sequelize is imported for potential advanced filtering (e.g., date ranges) if added later.
