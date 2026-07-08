'use strict';

/**
 * Migration: add difficultyBaselineSource to ExerciseConfigs and
 * lastAchievedVisionLevel to ExerciseAssignments.
 *
 * difficultyBaselineSource determines whether exercise start level is taken
 * from the patient's latest exam result ('current_exam') or from the
 * highest level previously reached in this assignment ('latest_achieved').
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExerciseConfigs', 'difficultyBaselineSource', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'current_exam',
      comment: "How starting difficulty is determined: 'current_exam' | 'latest_achieved'",
    });

    await queryInterface.addColumn('ExerciseAssignments', 'lastAchievedVisionLevel', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment:
        'Highest vision level (1-based, same scale as visionType of the config) the patient has reached in this assignment. Null = not yet played.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ExerciseConfigs', 'difficultyBaselineSource');
    await queryInterface.removeColumn('ExerciseAssignments', 'lastAchievedVisionLevel');
  },
};
