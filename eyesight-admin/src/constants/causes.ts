/**
 * Diagnosis causes (nguyên nhân) — shared CODE ↔ label map.
 *
 * The backend stores & queries stable codes (language-neutral). The UI uses these codes
 * as checkbox/select values and only renders the Vietnamese `label` for display.
 * Keep the codes in sync with backend `src/config/causes.js`.
 */
export interface CauseOption {
  code: string;
  label: string;
}

export const CAUSES: CauseOption[] = [
  { code: 'refractive_error', label: 'Tật khúc xạ' },
  { code: 'strabismus', label: 'Lác/Lé' },
  { code: 'ptosis', label: 'Sụp mi' },
  { code: 'cataract', label: 'Đục thuỷ tinh thể' },
  { code: 'corneal_disease', label: 'Bệnh lý giác mạc' },
  { code: 'fundus_disease', label: 'Bệnh lý đáy mắt' },
];

export const CAUSE_CODES: string[] = CAUSES.map((c) => c.code);

const CAUSE_LABELS: Record<string, string> = Object.fromEntries(
  CAUSES.map((c) => [c.code, c.label]),
);

/** Map a stored cause code to its display label (falls back to the code itself). */
export const getCauseLabel = (code: string): string => CAUSE_LABELS[code] ?? code;
