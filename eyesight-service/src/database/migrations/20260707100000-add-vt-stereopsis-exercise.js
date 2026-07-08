'use strict';

/** Seed vt-stereopsis base exercise per center that already has VT Quest family exercises. */
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [centersWithVt] = await queryInterface.sequelize.query(`
      SELECT DISTINCT "centerId"
      FROM "Exercises"
      WHERE "deleted" = false
        AND "exerciseType" IN ('vt-quest', 'vt-gabor', 'vt-vernier', 'vt-crowding', 'vt-stereopsis')
    `);

    for (const row of centersWithVt) {
      const centerId = row.centerId;

      const [existing] = await queryInterface.sequelize.query(
        `
          SELECT id FROM "Exercises"
          WHERE "centerId" = :centerId
            AND code = 'vt-stereopsis'
            AND "deleted" = false
          LIMIT 1
        `,
        { replacements: { centerId } }
      );

      if (existing.length > 0) continue;

      await queryInterface.bulkInsert('Exercises', [
        {
          centerId,
          code: 'vt-stereopsis',
          name: 'Phi hành gia — Chiều sâu',
          exerciseType: 'vt-stereopsis',
          description: 'Luyện nhìn chiều sâu bằng random-dot stereogram (RDS)',
          deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "Exercises"
      SET "deleted" = true, "updatedAt" = NOW()
      WHERE code = 'vt-stereopsis' AND "deleted" = false
    `);
  },
};
