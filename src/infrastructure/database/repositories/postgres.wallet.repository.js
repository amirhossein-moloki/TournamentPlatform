const { sequelize, DataTypes } = require('../postgres.connector');
const { Wallet } = require('../../../domain/wallet/wallet.entity');
const WalletRepositoryInterface = require('../../../domain/wallet/wallet.repository.interface');
const { User } = require('../../../domain/user/user.entity'); // For potential associations if needed

// Define the Sequelize model for Wallet, mapping to the 'Wallets' table
const WalletModel = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // Each user has one wallet
    references: {
      model: 'Users', // Name of the Users table as defined in its model or migration
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      isDecimal: true,
      min: 0, // Balance cannot be negative
    },
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  },
  // createdAt and updatedAt are automatically added by Sequelize (timestamps: true in connector)
}, {
  tableName: 'Wallets',
  timestamps: true,
  // Ensure indexes match those in migration if any beyond FKs (e.g., userId is already indexed by unique constraint)
});

// Optional: Define association if you need to include User details when fetching Wallet
// UserModel would need to be imported from postgres.user.repository.js
// WalletModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

// Helper to convert Sequelize model instance to domain Wallet entity
function toDomainEntity(walletModelInstance) {
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

class PostgresWalletRepository extends WalletRepositoryInterface {
  constructor() {
    super();
    this.WalletModel = WalletModel;
  }

  async findById(id) {
    const walletModelInstance = await this.WalletModel.findByPk(id);
    return toDomainEntity(walletModelInstance);
  }

  async findByUserId(userId) {
    const walletModelInstance = await this.WalletModel.findOne({ where: { userId } });
    return toDomainEntity(walletModelInstance);
  }

  async create(walletEntityOrData) {
    // Accepts either a domain entity or a plain data object
    const walletData = {
      id: walletEntityOrData.id, // Assuming ID is generated (e.g. UUID) before calling create
      userId: walletEntityOrData.userId,
      balance: walletEntityOrData.balance !== undefined ? walletEntityOrData.balance : 0.00,
      currency: walletEntityOrData.currency || 'USD',
    };
    const createdWalletModel = await this.WalletModel.create(walletData);
    return toDomainEntity(createdWalletModel);
  }

  async update(id, updateData, options = {}) {
    // updateData should primarily be { balance: newBalance }
    // Other fields like currency are typically not updated post-creation for a wallet.
    const sanitizedUpdateData = {};
    if (updateData.balance !== undefined) {
      sanitizedUpdateData.balance = parseFloat(updateData.balance);
      if (isNaN(sanitizedUpdateData.balance) || sanitizedUpdateData.balance < 0) {
        throw new Error('Invalid balance amount for update.');
      }
    }
    // if (updateData.currency) { sanitizedUpdateData.currency = updateData.currency; } // If currency updates were allowed

    if (Object.keys(sanitizedUpdateData).length === 0) {
      // No valid fields to update, return current state or null if not found
      return this.findById(id);
    }

    const [numberOfAffectedRows] = await this.WalletModel.update(
      sanitizedUpdateData,
      {
        where: { id },
        transaction: options.transaction, // Pass transaction if provided (for atomic operations)
      }
    );

    if (numberOfAffectedRows > 0) {
      const updatedInstance = await this.WalletModel.findByPk(id);
      return toDomainEntity(updatedInstance);
    }
    return null; // No wallet found or updated
  }

  async delete(id) {
    // Deleting a wallet is a sensitive operation.
    // Ensure associated transactions are handled (e.g., archived, or prevented if active).
    // Also, consider if balance must be zero.
    // For now, a simple delete:
    const walletInstance = await this.WalletModel.findByPk(id);
    if (walletInstance && parseFloat(walletInstance.balance) !== 0.00) {
        // Optional: Prevent deletion if balance is not zero, or implement logic to transfer/archive balance.
        // throw new Error('Cannot delete wallet with non-zero balance.');
    }

    const numberOfDeletedRows = await this.WalletModel.destroy({
      where: { id },
    });
    return numberOfDeletedRows > 0;
  }
}

module.exports = PostgresWalletRepository;

// Note: The WalletModel definition aligns with the 'Wallets' table in the migration.
// The `userId` has a unique constraint, ensuring one wallet per user.
// Balance validation (min: 0) is included at the model level.
// The `update` method specifically handles balance updates and can accept a Sequelize transaction
// for atomicity, which is crucial for financial operations (e.g., ProcessDepositUseCase).
// The `delete` method is basic; real-world scenarios might require more complex logic
// (e.g., preventing deletion of wallets with balance, or archiving).
// The domain entity Wallet's constructor expects balance as a number, so parseFloat is used.
// The `create` method can take a domain entity or a plain object. It ensures ID is provided.
// If ID is auto-generated by DB (not UUIDV4 default in model), `create` would be different.
// Here, defaultValue: DataTypes.UUIDV4 means ID can be pre-generated or DB-generated if not given.
// It's common for application/domain layer to generate UUIDs.
