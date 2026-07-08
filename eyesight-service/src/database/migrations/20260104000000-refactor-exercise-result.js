/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Step 1: Add new columns with STRING type (not ENUM for flexibility)
      // Status values: incomplete | passed | failed
      await queryInterface.addColumn(
        'ExerciseResults',
        'status',
        {
          type: Sequelize.STRING(20),
          defaultValue: 'incomplete',
          allowNull: false,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'ExerciseResults',
        'exerciseConfig',
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'ExerciseResults',
        'startedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'ExerciseResults',
        'completedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      // Step 2: Migrate existing data
      // completed=true AND passedLevel=true -> 'passed'
      // completed=true AND passedLevel=false -> 'failed'
      // completed=false -> 'incomplete'
      await queryInterface.sequelize.query(
        `
        UPDATE "ExerciseResults"
        SET 
          status = CASE
            WHEN completed = true AND "passedLevel" = true THEN 'passed'
            WHEN completed = true AND "passedLevel" = false THEN 'failed'
            ELSE 'incomplete'
          END,
          "startedAt" = "createdAt",
          "completedAt" = CASE
            WHEN completed = true THEN "updatedAt"
            ELSE NULL
          END
      `,
        { transaction }
      );

      // Step 3: Add indexes
      await queryInterface.addIndex('ExerciseResults', ['status'], {
        name: 'idx_exerciseresults_status',
        transaction,
      });

      await queryInterface.addIndex('ExerciseResults', ['exerciseSessionId', 'status'], {
        name: 'idx_exerciseresults_session_status',
        transaction,
      });

      // Step 4: Remove old columns
      await queryInterface.removeColumn('ExerciseResults', 'completed', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'passedLevel', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'passConditions', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'exerciseType', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Restore old columns
      await queryInterface.addColumn(
        'ExerciseResults',
        'completed',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'ExerciseResults',
        'passedLevel',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'ExerciseResults',
        'passConditions',
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'ExerciseResults',
        'exerciseType',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Migrate data back
      await queryInterface.sequelize.query(
        `
        UPDATE "ExerciseResults"
        SET 
          completed = CASE WHEN status IN ('passed', 'failed') THEN true ELSE false END,
          "passedLevel" = CASE WHEN status = 'passed' THEN true ELSE false END
      `,
        { transaction }
      );

      // Remove new columns
      await queryInterface.removeColumn('ExerciseResults', 'status', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'exerciseConfig', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'startedAt', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'completedAt', { transaction });

      // Remove indexes
      await queryInterface.removeIndex('ExerciseResults', 'idx_exerciseresults_status', { transaction });
      await queryInterface.removeIndex('ExerciseResults', 'idx_exerciseresults_session_status', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
