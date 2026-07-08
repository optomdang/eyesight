/**
 * Migration: Enable PostgreSQL unaccent extension for accent-insensitive search
 *
 * This enables searching Vietnamese text without diacritics.
 * Example: Searching "Nhu" will match "Như", "Nhứ", "Nhử", etc.
 */

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    // Enable unaccent extension (requires superuser or rds_superuser role)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS unaccent;');

    console.log('Enabled unaccent extension for accent-insensitive search');
  },

  down: async (queryInterface, _Sequelize) => {
    // Drop unaccent extension
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS unaccent;');

    console.log('Disabled unaccent extension');
  },
};
