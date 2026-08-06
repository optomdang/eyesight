'use strict';

/**
 * Rename remaining BTL labels → VAC on Exercises + ExerciseConfigs.
 * Covers catalog rows and patient-specific config names created from the old label.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "Exercises"
      SET name = REPLACE(name, 'BTL', 'VAC'),
          "updatedAt" = NOW()
      WHERE name LIKE '%BTL%'
        AND "deleted" = false
    `);

    await queryInterface.sequelize.query(`
      UPDATE "ExerciseConfigs"
      SET name = REPLACE(name, 'BTL', 'VAC'),
          "updatedAt" = NOW()
      WHERE name LIKE '%BTL%'
        AND "deleted" = false
    `);
  },

  down: async (queryInterface) => {
    // Only reverse known VAC catalog phrasing; avoid rewriting unrelated VAC text.
    await queryInterface.sequelize.query(`
      UPDATE "Exercises"
      SET name = REPLACE(name, 'Bài tập với VAC', 'Bài tập với BTL'),
          "updatedAt" = NOW()
      WHERE name LIKE '%Bài tập với VAC%'
        AND code = 'far-acuity'
        AND "deleted" = false
    `);

    await queryInterface.sequelize.query(`
      UPDATE "ExerciseConfigs"
      SET name = REPLACE(name, 'Bài tập với VAC', 'Bài tập với BTL'),
          "updatedAt" = NOW()
      WHERE name LIKE '%Bài tập với VAC%'
        AND "deleted" = false
    `);
  },
};
