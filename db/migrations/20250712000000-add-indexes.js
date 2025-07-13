'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('Transactions', ['idempotencyKey'], {
      unique: true,
      where: {
        idempotencyKey: {
          [Sequelize.Op.ne]: null,
        },
      },
    });
    await queryInterface.addIndex('Tournaments', ['organizerId']);
    await queryInterface.addIndex('Matches', ['participant1Id']);
    await queryInterface.addIndex('Matches', ['participant2Id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Transactions', ['idempotencyKey']);
    await queryInterface.removeIndex('Tournaments', ['organizerId']);
    await queryInterface.removeIndex('Matches', ['participant1Id']);
    await queryInterface.removeIndex('Matches', ['participant2Id']);
  },
};
