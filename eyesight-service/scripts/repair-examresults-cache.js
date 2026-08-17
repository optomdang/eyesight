/**
 * Rebuild Patient.examResults using the product baseline priority:
 * warranty phase-1 initial > first completed full ExamResult.
 * currentResult always comes from the latest completed full ExamResult.
 *
 * Fixes BXH "CẢI THIỆN" when a stale/partial cache disagrees with source data.
 *
 * Usage:
 *   node scripts/repair-examresults-cache.js                 # all patients (dry-run)
 *   node scripts/repair-examresults-cache.js --apply         # write changes
 *   node scripts/repair-examresults-cache.js --name "Linh"   # filter by patient name
 *   node scripts/repair-examresults-cache.js --code P001 --apply
 */
require('dotenv').config();

const { Op } = require('sequelize');
const {
  Patient,
  User,
  ExamResult,
  WarrantyAgreement,
  WarrantyAgreementPhase,
} = require('../src/models');
const {
  forceRebuildExamResultsFromHistory,
  hasData,
} = require('../src/utils/examResultsBackfill');
const { farLineDeltaBestEye } = require('../src/services/dashboard/visionImprovement');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const nameIdx = args.indexOf('--name');
const codeIdx = args.indexOf('--code');
const nameFilter = nameIdx >= 0 ? args[nameIdx + 1] : null;
const codeFilter = codeIdx >= 0 ? args[codeIdx + 1] : null;

const stableJson = (v) => JSON.stringify(v ?? null);
const VISION_TYPES = ['far', 'near', 'contrast', 'stereopsis'];

const getWarrantySources = async (patientId) => {
  const agreement = await WarrantyAgreement.findOne({
    where: { patientId, deleted: false },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    attributes: ['id'],
  });
  if (!agreement) return { initial: {}, current: {} };

  const phases = await WarrantyAgreementPhase.findAll({
    where: { agreementId: agreement.id },
    order: [['phaseNumber', 'ASC'], ['id', 'ASC']],
    attributes: ['phaseNumber', 'clinicalData'],
    raw: true,
  });
  const initial = {};
  const current = {};
  for (const phase of phases) {
    for (const type of VISION_TYPES) {
      const clinical = phase.clinicalData?.examResults?.[type];
      if (!initial[type] && hasData(clinical?.initial)) {
        initial[type] = { ...clinical.initial };
      }
      if (hasData(clinical?.current)) {
        current[type] = { ...clinical.current };
      }
    }
  }
  return { initial, current };
};

(async () => {
  const where = { deleted: false };
  if (codeFilter) where.code = codeFilter;

  const patients = await Patient.findAll({
    where,
    attributes: ['id', 'code', 'examResults'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['name'],
        ...(nameFilter
          ? { where: { name: { [Op.iLike]: `%${nameFilter}%` } }, required: true }
          : { required: false }),
      },
    ],
    order: [['id', 'ASC']],
  });

  let changedCount = 0;
  for (const patient of patients) {
    const exams = await ExamResult.findAll({
      where: {
        patientId: patient.id,
        status: 'completed',
        deleted: false,
      },
      order: [
        ['completedAt', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
    const next = forceRebuildExamResultsFromHistory(exams.map((e) => e.get({ plain: true })));
    const warranty = await getWarrantySources(patient.id);
    // Preserve non-vision keys. Replace each bucket only when source data exists.
    const merged = { ...(patient.examResults || {}) };
    for (const type of VISION_TYPES) {
      const history = next[type];
      const warrantyInitial = warranty.initial[type];
      if (history) {
        merged[type] = {
          ...history,
          initialResult: warrantyInitial || history.initialResult,
        };
      } else if (warrantyInitial) {
        merged[type] = {
          ...(merged[type] || {}),
          initialResult: warrantyInitial,
          currentResult:
            warranty.current[type] ||
            (hasData(merged[type]?.currentResult)
              ? merged[type].currentResult
              : warrantyInitial),
        };
      }
    }

    if (stableJson(patient.examResults) === stableJson(merged)) continue;

    const before = farLineDeltaBestEye(patient.examResults);
    const after = farLineDeltaBestEye(merged);
    changedCount += 1;
    console.log(
      `${patient.code || patient.id} | ${patient.user?.name || '—'} | CẢI THIỆN ${before} → ${after}`
    );
    console.log('  before.far', JSON.stringify(patient.examResults?.far || null));
    console.log('  after.far ', JSON.stringify(merged.far || null));

    if (apply) {
      await patient.update({ examResults: merged });
    }
  }

  console.log(
    apply
      ? `Applied repairs for ${changedCount} patient(s).`
      : `Dry-run: ${changedCount} patient(s) would change. Re-run with --apply to write.`
  );
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
