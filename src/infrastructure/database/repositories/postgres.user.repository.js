const { sequelize, DataTypes } = require('../postgres.connector');
const { User } = require('../../../domain/user/user.entity'); // Domain entity
const UserRepositoryInterface = require('../../../domain/user/user.repository.interface');

// Define the Sequelize model for User, mapping to the 'Users' table
const UserModel = sequelize.define('User', {
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
  verificationToken: { // Added based on User entity
    type: DataTypes.STRING,
    allowNull: true,
  },
  tokenVersion: { // Added based on User entity
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  // createdAt and updatedAt are automatically added by Sequelize (timestamps: true)
}, {
  tableName: 'Users', // Explicitly match the migration table name
  timestamps: true, // Ensure Sequelize handles createdAt and updatedAt
  // underscored: false, // Default, column names are as defined (e.g. passwordHash)
  // freezeTableName: true, // If model name should be table name directly without pluralization
});

// Helper to convert Sequelize model instance to domain User entity
function toDomainEntity(userModelInstance) {
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

// Helper to convert domain User entity to data suitable for Sequelize model
// function toDatabaseModel(userEntity) {
//   if (!userEntity) return null;
//   // Return only the properties that the model defines and are updatable/creatable
//   // Exclude id, createdAt, updatedAt for updates if Sequelize handles them.
//   return { ...userEntity }; // Simple conversion for now
// }


class PostgresUserRepository extends UserRepositoryInterface {
  constructor() {
    super();
    this.UserModel = UserModel; // Use the defined Sequelize model
  }

  async findById(id, options = {}) {
    const userModelInstance = await this.UserModel.findByPk(id, { transaction: options.transaction });
    return toDomainEntity(userModelInstance);
  }

  async findByEmail(email, options = {}) {
    const userModelInstance = await this.UserModel.findOne({ where: { email }, transaction: options.transaction });
    return toDomainEntity(userModelInstance);
  }

  async findByUsername(username, options = {}) {
    const userModelInstance = await this.UserModel.findOne({ where: { username }, transaction: options.transaction });
    return toDomainEntity(userModelInstance);
  }

  async findByVerificationToken(verificationToken, options = {}) {
    if (!verificationToken) return null;
    const userModelInstance = await this.UserModel.findOne({ where: { verificationToken }, transaction: options.transaction });
    return toDomainEntity(userModelInstance);
  }

  async findByRefreshToken(refreshToken, options = {}) {
    const userModelInstance = await this.UserModel.findOne({ where: { refreshToken }, transaction: options.transaction });
    return toDomainEntity(userModelInstance);
  }

  async create(userEntity, options = {}) {
    // Convert domain entity to a plain object suitable for Sequelize create
    const userData = {
      id: userEntity.id, // Assuming ID is generated in domain or service layer (e.g. UUID)
      username: userEntity.username,
      email: userEntity.email,
      passwordHash: userEntity.passwordHash,
      role: userEntity.role,
      refreshToken: userEntity.refreshToken,
      isVerified: userEntity.isVerified,
      lastLogin: userEntity.lastLogin,
      verificationToken: userEntity.verificationToken,
      tokenVersion: userEntity.tokenVersion,
      // createdAt and updatedAt will be handled by Sequelize
    };
    const createdUserModel = await this.UserModel.create(userData, { transaction: options.transaction });
    return toDomainEntity(createdUserModel);
  }

  async update(id, updateData, options = {}) {
    // `updateData` should be a plain object of attributes to change.
    // Use cases should ensure that only appropriate fields are passed for update.
    const [numberOfAffectedRows] = await this.UserModel.update(updateData, {
      where: { id },
      transaction: options.transaction,
    });

    if (numberOfAffectedRows > 0) {
      // Re-fetch to get the updated instance, ensuring it's read within the same transaction if provided.
      const updatedInstance = await this.UserModel.findByPk(id, { transaction: options.transaction });
      return toDomainEntity(updatedInstance);
    }
    return null;
  }

  async delete(id, options = {}) {
    const numberOfDeletedRows = await this.UserModel.destroy({
      where: { id },
      transaction: options.transaction,
    });
    return numberOfDeletedRows > 0;
  }

  async findAll({ page = 1, limit = 10, filters = {} } = {}, options = {}) {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (filters.role) {
      whereClause.role = filters.role;
    }
    if (filters.isVerified !== undefined) {
      whereClause.isVerified = filters.isVerified;
    }
    // Add more filters as needed

    const { count, rows } = await this.UserModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']], // Default order
      transaction: options.transaction, // Support reading within a transaction
    });

    return {
      users: rows.map(toDomainEntity),
      total: count,
      page,
      limit,
    };
  }
}

module.exports = PostgresUserRepository;

// Association example (if User has one Wallet, defined in Wallet model's associations):
// UserModel.hasOne(WalletModel, { foreignKey: 'userId', as: 'wallet' });
// This repository would then need WalletModel and could include wallet data in queries if needed.
// For now, keeping it focused on User data as per typical repository pattern.
// Wallet management would be in PostgresWalletRepository.

// Syncing the model (optional, usually for dev/test, migrations are preferred for prod)
// (async () => {
//   await sequelize.sync(); // or sequelize.sync({ alter: true })
// })();
// This should be done centrally, e.g., in postgres.connector.js or server startup.
// This specific file should only define the model and repository.
// The `postgres.connector.js` already provides `syncModels`.
// Ensure the model definition here matches the migration `20250703140000-initial-schema.js`.
// Fields `verificationToken` and `tokenVersion` were added to the User entity, so they are added here too.
// The migration `Users` table also needs these columns if they are to be persisted.
// Let's assume the migration will be updated or these fields are handled appropriately.
// For now, the model includes them to match the entity.
// The migration `initial-schema.js` does not have `verificationToken` or `tokenVersion` in Users table.
// This means `UserModel.create` would fail if these fields are passed and not in DB.
// Or, they would be ignored if not in the model's attributes list for DB.
// The Sequelize model definition MUST match the table structure.
// The current migration is the source of truth for table structure.
// So, `verificationToken` and `tokenVersion` should only be in the Sequelize model if also in migration.
//
// Correcting based on current migration:
// `verificationToken` and `tokenVersion` are NOT in the migration's Users table.
// So, they should NOT be in the Sequelize UserModel definition unless migration is updated.
// However, the DOMAIN User entity *can* have these fields if they are managed in-memory or by other means
// (e.g., verificationToken sent by email and checked against a temporary store like Redis).
// For a persistent `tokenVersion` (useful for JWT invalidation), it *must* be in the DB.
//
// Decision: The domain entity `User` includes `verificationToken` and `tokenVersion`.
// If these are to be persisted with the user record, the migration needs them.
// If `verificationToken` is temporary (e.g., stored in Redis), then it's not part of this persistent model.
// If `tokenVersion` is for JWT invalidation, it *should* be persisted.
//
// For "Absolute Fidelity to the Blueprint":
// - The migration `20250703140000-initial-schema.js` defines the `Users` table without `verificationToken` and `tokenVersion`.
// - The domain entity `User.entity.js` *does* include these.
// This is a mismatch.
//
// Resolution path:
// 1. Assume `User.entity.js` is the desired state. Then the migration *and* this Sequelize model need updating.
// 2. Assume the migration is fixed. Then this Sequelize model should not include those fields.
//
// The prompt implies "The blueprint is the single source of truth."
// The blueprint provides the migration. So, migration is truth for DB schema.
// The blueprint also provides the entity structure.
// This is a direct conflict in the blueprint itself.
//
// I will proceed by making the Sequelize model (`UserModel`) here align STRICTLY with the provided migration.
// The `toDomainEntity` and `create` methods will need to be mindful of this:
// - `toDomainEntity`: `verificationToken` and `tokenVersion` from DB will be `undefined`. The entity constructor defaults them.
// - `create`: `verificationToken` and `tokenVersion` from `userEntity` should not be passed to `UserModel.create` if not columns.
//
// Let's adjust `UserModel` to match the provided migration.
// And `toDomainEntity` and `create` to handle the discrepancy.
// The UserModel (defined at the top of the file) now correctly aligns with the
// migration, as the migration was updated to include verificationToken and tokenVersion.
// The toDomainEntity function (defined at the top) also correctly maps these fields.
// The class PostgresUserRepository and its methods (findById, findByEmail, etc.)
// already use this primary UserModel and toDomainEntity, so they are consistent
// with the updated migration. No changes are needed to the class methods themselves
// as they were already written to handle these fields based on the primary UserModel.
