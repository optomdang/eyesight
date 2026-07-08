const { sequelize } = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Đồng bộ Patient.treatmentStatus theo mốc thời gian (chạy định kỳ — vd hằng ngày).
 * KHÔNG đụng 'paused' (do bác sĩ chủ động).
 *   not_started → active     khi now ≥ activeFrom (và chưa quá activeTo)
 *   active      → completed  khi now > activeTo
 *   not_started → completed  khi now > activeTo (trường hợp bỏ qua cả kỳ)
 * @returns {Promise<{started:number, completed:number}>}
 */
const syncTreatmentStatuses = async () => {
  const [, startedMeta] = await sequelize.query(`
    UPDATE "Patients"
       SET "treatmentStatus" = 'active'
     WHERE deleted = false
       AND "treatmentStatus" = 'not_started'
       AND ("activeFrom" IS NULL OR "activeFrom" <= NOW())
       AND ("activeTo" IS NULL OR "activeTo" >= NOW())
  `);

  const [, completedMeta] = await sequelize.query(`
    UPDATE "Patients"
       SET "treatmentStatus" = 'completed'
     WHERE deleted = false
       AND "treatmentStatus" IN ('active', 'not_started')
       AND "activeTo" IS NOT NULL
       AND "activeTo" < NOW()
  `);

  const result = { started: startedMeta?.rowCount || 0, completed: completedMeta?.rowCount || 0 };
  logger.info('Treatment status sync done', result);
  return result;
};

module.exports = { syncTreatmentStatuses };
