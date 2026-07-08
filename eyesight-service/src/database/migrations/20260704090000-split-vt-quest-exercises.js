'use strict';

/** Split VT Quest into three single-modality base exercises per center that already has vt-quest. */
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [centersWithVtQuest] = await queryInterface.sequelize.query(`
      SELECT DISTINCT "centerId"
      FROM "Exercises"
      WHERE "deleted" = false
        AND "exerciseType" IN ('vt-quest', 'vt-gabor', 'vt-vernier', 'vt-crowding')
    `);

    const newExercises = [
      {
        code: 'vt-gabor',
        name: 'Phi hành gia — Ánh sáng',
        exerciseType: 'vt-gabor',
        description: 'Luyện nhận biết ánh sáng mờ (Gabor patch)',
      },
      {
        code: 'vt-vernier',
        name: 'Phi hành gia — Chính xác',
        exerciseType: 'vt-vernier',
        description: 'Luyện nhận biết lệch thẳng hàng (Vernier)',
      },
      {
        code: 'vt-crowding',
        name: 'Phi hành gia — Đám đông',
        exerciseType: 'vt-crowding',
        description: 'Luyện nhận biết chữ trong đám đông (Crowding)',
      },
    ];

    for (const row of centersWithVtQuest) {
      const centerId = row.centerId;

      for (const exercise of newExercises) {
        const [existing] = await queryInterface.sequelize.query(
          `
          SELECT id FROM "Exercises"
          WHERE "centerId" = :centerId
            AND code = :code
            AND "deleted" = false
          LIMIT 1
        `,
          { replacements: { centerId, code: exercise.code } }
        );

        if (existing.length > 0) continue;

        await queryInterface.bulkInsert('Exercises', [
          {
            name: exercise.name,
            code: exercise.code,
            description: exercise.description,
            exerciseType: exercise.exerciseType,
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
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM "Exercises"
      WHERE "exerciseType" IN ('vt-gabor', 'vt-vernier', 'vt-crowding')
    `);
  },
};
