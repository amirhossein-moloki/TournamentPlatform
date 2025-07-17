'use strict';

const { GameImageType } = require('../../src/domain/game/gameImage.entity');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create GameImages table
    await queryInterface.createTable('GameImages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      gameId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Games',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(...Object.values(GameImageType)),
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Remove iconUrl and bannerUrl from Games table
    await queryInterface.removeColumn('Games', 'iconUrl');
    await queryInterface.removeColumn('Games', 'bannerUrl');
  },

  async down(queryInterface, Sequelize) {
    // Drop GameImages table
    await queryInterface.dropTable('GameImages');

    // Add iconUrl and bannerUrl back to Games table
    await queryInterface.addColumn('Games', 'iconUrl', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Games', 'bannerUrl', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
