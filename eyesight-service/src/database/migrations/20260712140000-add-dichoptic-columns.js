/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const exerciseConfigs = await queryInterface.describeTable('ExerciseConfigs', { transaction });
      if (!exerciseConfigs.dichoptic) {
        await queryInterface.addColumn(
          'ExerciseConfigs',
          'dichoptic',
          {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          { transaction }
        );
      }

      const exerciseSessions = await queryInterface.describeTable('ExerciseSessions', { transaction });
      if (!exerciseSessions.dichopticSnapshot) {
        await queryInterface.addColumn(
          'ExerciseSessions',
          'dichopticSnapshot',
          {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('ExerciseSessions', 'dichopticSnapshot', { transaction });
      await queryInterface.removeColumn('ExerciseConfigs', 'dichoptic', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
