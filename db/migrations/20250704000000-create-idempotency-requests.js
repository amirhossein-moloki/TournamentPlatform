'use strict';

const { DataTypes } = require('sequelize'); // Import DataTypes

// Define Enum for status to be used in migration
const IdempotencyStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) { // Sequelize is also passed, use it or DataTypes
    await queryInterface.createTable('IdempotencyRequests', {
      idempotencyKey: {
        type: Sequelize.STRING, // Use Sequelize.STRING or DataTypes.STRING
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users', // Name of the Users table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or 'SET NULL' if user deletion shouldn't delete these records
      },
      requestPath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(...Object.values(IdempotencyStatus)),
        allowNull: false,
        defaultValue: IdempotencyStatus.PENDING,
      },
      responseStatusCode: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      responseBody: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });

    await queryInterface.addIndex('IdempotencyRequests', ['userId']);
    await queryInterface.addIndex('IdempotencyRequests', ['status']);
    // idempotencyKey is already primary key, so it's indexed and unique.
  },

  async down(queryInterface, Sequelize) { // Sequelize is passed here
    await queryInterface.dropTable('IdempotencyRequests');
    // If using ENUM type directly in Postgres, you might need to drop the ENUM type itself:
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_IdempotencyRequests_status";');
    // However, Sequelize handles ENUMs as strings with checks by default for PG unless a custom type is made.
  }
};
