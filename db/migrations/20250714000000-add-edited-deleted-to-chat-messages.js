'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ChatMessages', 'edited_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('ChatMessages', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ChatMessages', 'edited_at');
    await queryInterface.removeColumn('ChatMessages', 'is_deleted');
  },
};
