/**
 * @interface UserRepositoryInterface
 * Defines the contract for user data persistence operations.
 * Implementations of this interface will handle the actual database interactions.
 */
class UserRepositoryInterface {
  /**
   * Finds a user by their ID.
   * @param {string} id - The UUID of the user.
   * @returns {Promise<User|null>} The User entity if found, otherwise null.
   */
  async findById(id) {
    throw new Error('Method "findById" not implemented.');
  }

  /**
   * Finds a user by their email address.
   * @param {string} email - The email address of the user.
   * @returns {Promise<User|null>} The User entity if found, otherwise null.
   */
  async findByEmail(email) {
    throw new Error('Method "findByEmail" not implemented.');
  }

  /**
   * Finds a user by their username.
   * @param {string} username - The username of the user.
   * @returns {Promise<User|null>} The User entity if found, otherwise null.
   */
  async findByUsername(username) {
    throw new Error('Method "findByUsername" not implemented.');
  }

  /**
   * Finds a user by their refresh token.
   * This is useful for validating refresh tokens during token refresh process.
   * @param {string} refreshToken - The refresh token.
   * @returns {Promise<User|null>} The User entity if found, otherwise null.
   */
  async findByRefreshToken(refreshToken) {
    throw new Error('Method "findByRefreshToken" not implemented.');
  }

  /**
   * Creates a new user.
   * @param {User} userEntity - The User entity instance to persist.
   * @returns {Promise<User>} The created User entity (potentially with DB-generated fields like createdAt).
   */
  async create(userEntity) {
    throw new Error('Method "create" not implemented.');
  }

  /**
   * Updates an existing user.
   * @param {string} id - The ID of the user to update.
   * @param {object} updateData - An object containing fields to update.
   *                              Example: { username, passwordHash, role, refreshToken, isVerified, lastLogin, verificationToken, tokenVersion }
   *                              The implementation should only update provided fields.
   * @returns {Promise<User|null>} The updated User entity, or null if not found.
   */
  async update(id, updateData) {
    throw new Error('Method "update" not implemented.');
  }

  /**
   * Deletes a user by their ID.
   * @param {string} id - The ID of the user to delete.
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
   */
  async delete(id) {
    throw new Error('Method "delete" not implemented.');
  }

  /**
   * Lists all users with pagination.
   * @param {object} options - Pagination options.
   * @param {number} [options.page=1] - The page number.
   * @param {number} [options.limit=10] - The number of users per page.
   * @param {object} [options.filters] - Optional filters (e.g., { role: 'Admin' }).
   * @returns {Promise<{users: User[], total: number, page: number, limit: number}>} Paginated list of users.
   */
  async findAll({ page = 1, limit = 10, filters = {} } = {}) {
    throw new Error('Method "findAll" not implemented.');
  }

  /**
   * Finds a user by their verification token.
   * @param {string} verificationToken - The verification token.
   * @returns {Promise<User|null>} The User entity if found, otherwise null.
   */
  async findByVerificationToken(verificationToken) {
    throw new Error('Method "findByVerificationToken" not implemented.');
  }
}

module.exports = UserRepositoryInterface;

// Note:
// This is an interface defined as a class with methods that throw errors.
// This is a common way to define interfaces in JavaScript when not using TypeScript.
// Concrete repository implementations (e.g., PostgresUserRepository) will extend or implement this "interface".
// The methods are async, reflecting that data operations are typically I/O bound.
// The User type referred to in return types is the domain entity `User` from `user.entity.js`.
// All methods throw errors to strictly enforce implementation.
