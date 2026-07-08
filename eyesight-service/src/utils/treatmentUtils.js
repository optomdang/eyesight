const { Op } = require('sequelize');

/**
 * Treatment status (P4) — `Patient.treatmentStatus` is now a STRING enum, authoritative:
 *   not_started | active | paused | completed
 *
 * - not_started: hồ sơ đã tạo nhưng now < activeFrom (chưa tới ngày bắt đầu)
 * - active:      activeFrom ≤ now ≤ activeTo và không bị tạm dừng  → "đang điều trị"
 * - paused:      bác sĩ tạm dừng
 * - completed:   now > activeTo (hết liệu trình) — được job đồng bộ set
 *
 * "Đã + đang điều trị" (đã bắt đầu) = active | paused | completed (loại not_started).
 */
const TREATMENT_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
});

const STARTED_STATUSES = [TREATMENT_STATUS.ACTIVE, TREATMENT_STATUS.PAUSED, TREATMENT_STATUS.COMPLETED];

/** Status is stored & authoritative — just return it. */
const getTreatmentPhase = (patient) => patient?.treatmentStatus || 'unknown';

/** Đang điều trị = status 'active'. */
const isInTreatmentWindow = (patient) => patient?.treatmentStatus === TREATMENT_STATUS.ACTIVE;

const buildInTreatmentWhereClause = () => ({ treatmentStatus: TREATMENT_STATUS.ACTIVE });
const buildCompletedWhereClause = () => ({ treatmentStatus: TREATMENT_STATUS.COMPLETED });
const buildNotStartedWhereClause = () => ({ treatmentStatus: TREATMENT_STATUS.NOT_STARTED });
/** Mẫu số #3/#4/#5: đã bắt đầu điều trị (gồm cả đã dừng / hoàn thành). */
const buildEverTreatedWhereClause = () => ({ treatmentStatus: { [Op.in]: STARTED_STATUSES } });

/**
 * Derive the correct status from the boolean-pause intent + dates.
 * Dùng cho job đồng bộ và lúc tạo/kích hoạt bệnh nhân.
 * @param {boolean} paused - bác sĩ có đang tạm dừng không
 */
const computeTreatmentStatus = ({ paused, activeFrom, activeTo }, now = new Date()) => {
  if (paused) return TREATMENT_STATUS.PAUSED;
  if (activeFrom && now < new Date(activeFrom)) return TREATMENT_STATUS.NOT_STARTED;
  if (activeTo && now > new Date(activeTo)) return TREATMENT_STATUS.COMPLETED;
  return TREATMENT_STATUS.ACTIVE;
};

module.exports = {
  TREATMENT_STATUS,
  STARTED_STATUSES,
  getTreatmentPhase,
  isInTreatmentWindow,
  buildInTreatmentWhereClause,
  buildCompletedWhereClause,
  buildNotStartedWhereClause,
  buildEverTreatedWhereClause,
  computeTreatmentStatus,
};
