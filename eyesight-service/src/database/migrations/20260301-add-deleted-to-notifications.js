/**
 * Migration: Add deleted and deletedAt columns to Notifications
 *
 * This fixes potential bugs where code queries for 'deleted' column but it doesn't exist.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add deleted column (default false)
    await queryInterface.addColumn('Notifications', 'deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add deletedAt column (nullable timestamp)
    await queryInterface.addColumn('Notifications', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    // Add index for better query performance
    await queryInterface.addIndex('Notifications', ['deleted'], {
      name: 'idx_notifications_deleted',
    });

    console.log('Added deleted and deletedAt columns to Notifications');
  },

  down: async (queryInterface, _Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('Notifications', 'idx_notifications_deleted');

    // Remove columns
    await queryInterface.removeColumn('Notifications', 'deletedAt');
    await queryInterface.removeColumn('Notifications', 'deleted');

    console.log('Removed deleted and deletedAt columns from Notifications');
  },
};
