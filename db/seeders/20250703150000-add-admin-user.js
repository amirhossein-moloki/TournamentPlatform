'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
// Ensure config is loaded to get admin credentials from environment variables
// Note: Accessing appConfig directly like this in a seeder is a bit unconventional.
// Seeders usually get simple values or use a simplified config loader.
// However, for consistency with the blueprint's secret management policy,
// we'll attempt to use the configured values.
// This assumes that when `sequelize-cli db:seed` is run, `process.env` is populated correctly (e.g., via .env).
const { appConfig } = require('../../config/config'); // Adjust path if necessary

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const adminEmail = appConfig.admin.email || process.env.ADMIN_EMAIL;
    const adminPassword = appConfig.admin.password || process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn(
        'Admin email or password not found in environment variables (ADMIN_EMAIL, ADMIN_PASSWORD). Skipping admin user seed.'
      );
      return;
    }

    const saltRounds = 10; // Standard salt rounds for bcrypt
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    const adminUserId = uuidv4();
    const walletId = uuidv4();

    try {
      // Check if admin user already exists
      const existingAdmin = await queryInterface.rawSelect(
        'Users',
        {
          where: { email: adminEmail },
        },
        ['id'] // Select only 'id' or any column to check existence
      );

      if (existingAdmin) {
        console.log(`Admin user with email ${adminEmail} already exists. Skipping seed.`);
        return;
      }

      // Create Admin User
      await queryInterface.bulkInsert(
        'Users',
        [
          {
            id: adminUserId,
            username: 'admin', // Or derive from email, or make configurable
            email: adminEmail,
            passwordHash: passwordHash,
            role: 'Admin', // Ensure this matches ENUM in migration
            isVerified: true, // Admin user is pre-verified
            lastLogin: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );

      // Create Wallet for Admin User
      await queryInterface.bulkInsert(
        'Wallets',
        [
          {
            id: walletId,
            userId: adminUserId,
            balance: 0.00, // Or some initial test balance
            currency: 'USD', // Default currency
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {}
      );

      console.log(`Admin user ${adminEmail} and associated wallet seeded successfully.`);
    } catch (error)
 {
      console.error(`Error seeding admin user: ${error.message}`);
      // If transaction support is needed and configured for seeders, use it.
      // Otherwise, manual cleanup might be required on failure.
      // For simplicity, not using transactions here unless essential.
      // Consider that if User insert succeeds but Wallet fails, you have an orphaned user.
      // Sequelize CLI seeders don't inherently support transactions across multiple `bulkInsert` calls
      // without manual transaction management using `sequelize.transaction()`.
    }
  },

  async down(queryInterface, Sequelize) {
    const adminEmail = appConfig.admin.email || process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.warn('Admin email not found in environment variables. Cannot selectively delete admin user.');
      // Fallback to a more general delete if needed, or skip.
      // For safety, we'll only attempt to delete if email is known.
      return;
    }

    try {
      // Find the admin user to get their ID for deleting associated wallet
      const users = await queryInterface.sequelize.query(
        `SELECT id FROM "Users" WHERE email = :email`,
        {
          replacements: { email: adminEmail },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (users && users.length > 0) {
        const adminUserId = users[0].id;
        // Delete wallet associated with the admin user first
        await queryInterface.bulkDelete('Wallets', { userId: adminUserId }, {});
        // Then delete the admin user
        await queryInterface.bulkDelete('Users', { email: adminEmail }, {});
        console.log(`Admin user ${adminEmail} and associated wallet removed successfully.`);
      } else {
        console.log(`Admin user with email ${adminEmail} not found. Nothing to remove.`);
      }
    } catch (error) {
      console.error(`Error removing admin user: ${error.message}`);
    }
  },
};
