'use strict';

/**
 * Rename far-acuity base exercise display name: BTL → VAC.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "Exercises"
      SET name = 'Bài tập với VAC',
          "updatedAt" = NOW()
      WHERE name = 'Bài tập với BTL'
        AND "deleted" = false
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "Exercises"
      SET name = 'Bài tập với BTL',
          "updatedAt" = NOW()
      WHERE name = 'Bài tập với VAC'
        AND code = 'far-acuity'
        AND "deleted" = false
    `);
  },
};
