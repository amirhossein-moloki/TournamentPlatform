// const { sequelize, DataTypes } = require('../postgres.connector'); // No longer needed here
// const { User } = require('../../../domain/user/user.entity'); // No longer needed for toDomainEntity here
const UserRepositoryInterface = require('../../../domain/user/user.repository.interface');
const ApiError = require('../../../utils/ApiError');
const httpStatus = require('http-status');

class PostgresUserRepository extends UserRepositoryInterface {
  /**
   * @param {object} models - An object containing the Sequelize models.
   * @param {import('sequelize').ModelCtor<import('sequelize').Model> & { toDomainEntity: Function }} models.UserModel
   */
  constructor(models) {
    super();
    if (!models || !models.UserModel || typeof models.UserModel.toDomainEntity !== 'function') {
        throw new Error('Required models.UserModel with toDomainEntity method not provided to PostgresUserRepository');
    }
    this.UserModel = models.UserModel;
    this.sequelize = models.UserModel.sequelize;
    this.Op = this.sequelize.Op;
  }

  async findById(id, options = {}) {
    try {
      const userModelInstance = await this.UserModel.findByPk(id, { transaction: options.transaction });
      return this.UserModel.toDomainEntity(userModelInstance);
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding user by ID: ${error.message}`);
    }
  }

  async findByEmail(email, options = {}) {
    try {
      const userModelInstance = await this.UserModel.findOne({ where: { email }, transaction: options.transaction });
      return this.UserModel.toDomainEntity(userModelInstance);
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding user by email: ${error.message}`);
    }
  }

  async findByUsername(username, options = {}) {
    try {
      const userModelInstance = await this.UserModel.findOne({ where: { username }, transaction: options.transaction });
      return this.UserModel.toDomainEntity(userModelInstance);
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding user by username: ${error.message}`);
    }
  }

  async findByVerificationToken(verificationToken, options = {}) {
    try {
      if (!verificationToken) return null;
      const userModelInstance = await this.UserModel.findOne({ where: { verificationToken }, transaction: options.transaction });
      return this.UserModel.toDomainEntity(userModelInstance);
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding user by verification token: ${error.message}`);
    }
  }

  async findByRefreshToken(refreshToken, options = {}) {
    try {
      const userModelInstance = await this.UserModel.findOne({ where: { refreshToken }, transaction: options.transaction });
      return this.UserModel.toDomainEntity(userModelInstance);
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error finding user by refresh token: ${error.message}`);
    }
  }

  async create(userEntity, options = {}) {
    try {
      const userData = {
        id: userEntity.id,
        username: userEntity.username,
        email: userEntity.email,
        passwordHash: userEntity.passwordHash,
        roles: userEntity.roles,
        refreshToken: userEntity.refreshToken,
        isVerified: userEntity.isVerified,
        lastLogin: userEntity.lastLogin,
        verificationToken: userEntity.verificationToken,
        tokenVersion: userEntity.tokenVersion,
      };
      const createdUserModel = await this.UserModel.create(userData, { transaction: options.transaction });
      return this.UserModel.toDomainEntity(createdUserModel);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = Object.keys(error.fields)[0];
        throw new ApiError(httpStatus.CONFLICT, `User with this ${field} already exists.`);
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error creating user: ${error.message}`);
    }
  }

  async update(id, updateData, options = {}) {
    try {
      const [numberOfAffectedRows] = await this.UserModel.update(updateData, {
        where: { id },
        transaction: options.transaction,
      });

      if (numberOfAffectedRows > 0) {
        const updatedInstance = await this.UserModel.findByPk(id, { transaction: options.transaction });
        return this.UserModel.toDomainEntity(updatedInstance);
      }
      // If no rows affected, check if user exists to differentiate between "not found" and "no change needed"
      const exists = await this.UserModel.findByPk(id, { transaction: options.transaction, attributes: ['id'] });
      return exists ? this.UserModel.toDomainEntity(await this.UserModel.findByPk(id, { transaction: options.transaction })) : null;
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') { // e.g. if trying to update email to one that already exists
            const field = Object.keys(error.fields)[0];
            throw new ApiError(httpStatus.CONFLICT, `Cannot update user: ${field} must be unique.`);
        }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error updating user: ${error.message}`);
    }
  }

  async delete(id, options = {}) {
    try {
      const numberOfDeletedRows = await this.UserModel.destroy({
        where: { id },
        transaction: options.transaction,
      });
      return numberOfDeletedRows > 0;
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Database error deleting user: ${error.message}`);
    }
  }

  async findAll({ page = 1, limit = 10, filters = {} } = {}, options = {}) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = {};

    if (filters.roles) {
      whereClause.roles = { [this.Op.contains]: [filters.roles] };
    }
    if (filters.isVerified !== undefined) {
      whereClause.isVerified = filters.isVerified;
    }
    // Add more filters as needed

    const { count, rows } = await this.UserModel.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      order: [['createdAt', 'DESC']],
      transaction: options.transaction,
    });

    return {
      users: rows.map(userModelInstance => this.UserModel.toDomainEntity(userModelInstance)),
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  }
}

module.exports = { PostgresUserRepository }; // Exporting as an object for consistency with other repos

// Removed all comments regarding model definition, sync, and migration discrepancies as they are now handled
// by the centralized model definition and the assumption that migrations are the source of truth for schema.
