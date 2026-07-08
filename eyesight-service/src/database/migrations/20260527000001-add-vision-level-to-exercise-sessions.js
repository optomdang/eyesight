module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ExerciseSessions', 'visionLevel', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment:
        'Snapshot độ khó (mức thị lực) của buổi tập, server resolve lúc tạo result đầu tiên. NULL nếu không có exam & không override.',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ExerciseSessions', 'visionLevel');
  },
};
