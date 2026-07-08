/** @type {import('sequelize-cli').Migration} */
/**
 * P6 — Backfill Patient.examResults từ bảng ExamResult (nguồn sự thật).
 *
 * Sửa các bệnh nhân có cache examResults rỗng/stale do bug D3 cũ (write-flow bị gate bởi
 * ExamAssignment). Hook đã fix nên dữ liệu MỚI tự cập nhật; migration này vá lịch sử.
 *
 * Logic tái dựng (bảo thủ) nằm ở utils/examResultsBackfill.rebuildExamResults (đã unit-test):
 *  - Chỉ dựng lại loại đo khi currentResult đang RỖNG (không đè dữ liệu/nhập tay).
 *  - Giữ initialResult nếu đã có; nếu chưa, lấy lần đo "full" đầu tiên.
 *  - Idempotent.
 */
const logger = require('../../config/logger');
const { rebuildExamResults } = require('../../utils/examResultsBackfill');

module.exports = {
  async up() {
    const { Patient, ExamResult } = require('../../models');

    const patients = await Patient.findAll({ attributes: ['id', 'examResults'], where: { deleted: false } });
    let updated = 0;

    for (const patient of patients) {
      // eslint-disable-next-line no-await-in-loop
      const exams = await ExamResult.findAll({
        attributes: ['examType', 'leftEyeLevel', 'rightEyeLevel', 'bothEyeLevel', 'completedAt', 'createdAt'],
        where: { patientId: patient.id, status: 'completed', deleted: false },
        order: [['completedAt', 'ASC']],
        raw: true,
      });

      const { examResults, changed } = rebuildExamResults(patient.examResults, exams);
      if (changed) {
        // eslint-disable-next-line no-await-in-loop
        await Patient.update({ examResults }, { where: { id: patient.id } });
        updated += 1;
      }
    }

    logger.info('P6 backfill examResults completed', { patientsUpdated: updated, patientsScanned: patients.length });
  },

  async down() {
    logger.warn('P6 backfill examResults: no-op down (chỉ điền dữ liệu thiếu, không revert)');
  },
};
