'use strict';

/**
 * Seed `far-acuity` base exercise row for every center that already has any
 * registered exercise (so the new exercise type is available to assign).
 * Pattern mirrors 20260704090000-split-vt-quest-exercises.js.
 */
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Find all distinct centerIds that have at least one exercise
    const [centers] = await queryInterface.sequelize.query(`
      SELECT DISTINCT "centerId"
      FROM "Exercises"
      WHERE "deleted" = false
    `);

    for (const row of centers) {
      const centerId = row.centerId;

      // Skip if already seeded
      const [existing] = await queryInterface.sequelize.query(
        `
        SELECT id FROM "Exercises"
        WHERE "centerId" = :centerId
          AND code = 'far-acuity'
          AND "deleted" = false
        LIMIT 1
      `,
        { replacements: { centerId } }
      );

      if (existing.length > 0) continue;

      await queryInterface.bulkInsert('Exercises', [
        {
          name: 'Bài tập thị lực xa',
          code: 'far-acuity',
          description: 'Luyện thị lực xa kết hợp độ tương phản thích ứng (5 chữ optotype)',
          exerciseType: 'far-acuity',
          status: 'active',
          centerId,
          createdBy: null,
          updatedBy: null,
          deleted: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM "Exercises"
      WHERE "exerciseType" = 'far-acuity'
    `);
  },
};
