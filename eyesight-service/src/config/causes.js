/**
 * Diagnosis causes (nguyên nhân) — canonical CODE list (single source of truth).
 *
 * Stored & queried as stable English codes (NOT Vietnamese labels) so the data is
 * language-neutral and index/query-friendly. The Vietnamese labels are a DISPLAY concern
 * owned by the frontend (code → label map). Labels here are reference-only.
 *
 * `Patient.causes` is ARRAY(STRING) of these codes; dashboard #9 filters by `Op.overlap`.
 */
const CAUSES = Object.freeze([
  { code: 'refractive_error', label: 'Tật khúc xạ' },
  { code: 'strabismus', label: 'Lác/Lé' },
  { code: 'ptosis', label: 'Sụp mi' },
  { code: 'cataract', label: 'Đục thuỷ tinh thể' },
  { code: 'corneal_disease', label: 'Bệnh lý giác mạc' },
  { code: 'fundus_disease', label: 'Bệnh lý đáy mắt' },
]);

const CAUSE_CODES = Object.freeze(CAUSES.map((c) => c.code));

module.exports = { CAUSES, CAUSE_CODES };
