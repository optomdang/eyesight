/** @type {import('sequelize-cli').Migration} */
/**
 * P4 — Patient.treatmentStatus: BOOLEAN → STRING enum (not_started | active | paused | completed).
 * Convert dữ liệu cũ từ (bool pause + dates):
 *   false → paused; now<activeFrom → not_started; now>activeTo → completed; else → active.
 */
const logger = require('../../config/logger');

module.exports = {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.query('ALTER TABLE "Patients" ALTER COLUMN "treatmentStatus" DROP DEFAULT');
    await sql.query(`
      ALTER TABLE "Patients" ALTER COLUMN "treatmentStatus" TYPE VARCHAR(20)
      USING (
        CASE
          WHEN "treatmentStatus"::text IN ('false', '0', 'paused') THEN 'paused'
          WHEN "treatmentStatus"::text IN ('true', '1', 'active') THEN
            CASE
              WHEN "activeFrom" IS NOT NULL AND "activeFrom" > NOW() THEN 'not_started'
              WHEN "activeTo" IS NOT NULL AND "activeTo" < NOW() THEN 'completed'
              ELSE 'active'
            END
          ELSE "treatmentStatus"::text
        END
      )
    `);
    await sql.query(`ALTER TABLE "Patients" ALTER COLUMN "treatmentStatus" SET DEFAULT 'active'`);
    await sql.query('ALTER TABLE "Patients" ALTER COLUMN "treatmentStatus" SET NOT NULL');
    logger.info('P4: Patient.treatmentStatus converted BOOLEAN → STRING enum');
  },

  async down(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.query('ALTER TABLE "Patients" ALTER COLUMN "treatmentStatus" DROP DEFAULT');
    await sql.query(`
      ALTER TABLE "Patients" ALTER COLUMN "treatmentStatus" TYPE BOOLEAN
      USING (CASE WHEN "treatmentStatus" = 'paused' THEN false ELSE true END)
    `);
    await sql.query('ALTER TABLE "Patients" ALTER COLUMN "treatmentStatus" SET DEFAULT true');
  },
};
