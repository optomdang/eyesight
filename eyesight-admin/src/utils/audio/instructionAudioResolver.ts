import type {
  VtCrowdingTaskMode,
  VtGaborTaskMode,
  VtStereopsisTaskMode,
  VtVernierTaskMode,
  VtWorld,
} from 'src/types/core/vtQuest';
import type { AudioSampleLang } from './instructionAudioSamples';

/** Map i18n language codes to instruction-audio folder names. */
export function normalizeInstructionLang(lang: string | undefined): AudioSampleLang {
  if (!lang || lang.startsWith('en')) return 'en';
  return 'vi';
}

export type ExamAudioType = 'far' | 'near' | 'contrast' | 'stereopsis';

export type StereopsisQuestionKind = 'shape-single' | 'shape-row' | 'digit';

const EXAM_WELCOME_IDS: Record<ExamAudioType, string> = {
  far: 'exam_welcome_far',
  near: 'exam_welcome_near',
  contrast: 'exam_welcome_contrast',
  stereopsis: 'exam_welcome_stereopsis',
};

/** Items 4–8 on InstructionStep (all exam types). */
const EXAM_RULES_TAIL = [
  'exam_no_hints',
  'exam_no_squint',
  'exam_cherry_pick',
  'exam_lighting',
] as const;

/**
 * Audio queue for exam instruction step — same order as the numbered list in InstructionStep.
 *
 * Standard (far/near/contrast): welcome → 1–2 glasses/cover → 3 direction → 4–8 rules.
 * Stereopsis: welcome → 1 glasses → 3 supporter → 4–5,7–8 rules (no item 2 or 6).
 */
export function getExamInstructionAudioIds(examType: ExamAudioType): string[] {
  const welcomeId = EXAM_WELCOME_IDS[examType] ?? EXAM_WELCOME_IDS.far;
  if (examType === 'stereopsis') {
    return [welcomeId, 'exam_stereo_glasses', 'exam_stereo_supporter', ...EXAM_RULES_TAIL];
  }
  return [
    welcomeId,
    'exam_glasses_cover',
    'exam_choose_direction',
    ...EXAM_RULES_TAIL.slice(0, 2),
    'exam_compromised_recheck',
    ...EXAM_RULES_TAIL.slice(2),
  ];
}

export function getStereopsisQuestionAudioId(kind: StereopsisQuestionKind): string {
  switch (kind) {
    case 'shape-row':
      return 'exam_stereo_q_row';
    case 'digit':
      return 'exam_stereo_q_digit';
    default:
      return 'exam_stereo_q_shape';
  }
}

export function getVtStageIntroAudioId(stageNum: number): string {
  const clamped = Math.min(20, Math.max(1, Math.round(stageNum)));
  return `vt_stage_${clamped}`;
}

/** Map VT trial context → pre-generated sample id (mirrors TrialScreen.getInstruction). */
export function getVtInstructionSampleId(
  world: VtWorld,
  gaborMode: VtGaborTaskMode,
  vernierMode: VtVernierTaskMode,
  crowdingMode: VtCrowdingTaskMode,
  stereopsisMode: VtStereopsisTaskMode,
  recallPhase: boolean
): string {
  if (world === 'stereopsis') {
    switch (stereopsisMode) {
      case 'float_position':
        return 'vt_stereo_float';
      case 'digit_id':
        return 'vt_stereo_digit';
      default:
        return 'vt_stereo_shape';
    }
  }
  if (world === 'vernier') {
    switch (vernierMode) {
      case 'offset_direction_mcq':
        return 'vt_vernier_direction';
      case 'greater_offset_2afc':
        return 'vt_vernier_greater';
      case 'odd_line_out':
        return 'vt_vernier_odd';
      case 'delayed_direction':
        return recallPhase ? 'vt_vernier_recall' : 'vt_vernier_memorize';
      default:
        return 'vt_vernier_default';
    }
  }
  if (world === 'crowding') {
    switch (crowdingMode) {
      case 'central_letter_id':
        return 'vt_crowding_central';
      case 'letter_match_2afc':
        return 'vt_crowding_match';
      case 'odd_letter_out':
        return 'vt_crowding_odd';
      case 'delayed_letter':
        return recallPhase ? 'vt_crowding_recall' : 'vt_crowding_memorize';
      case 'flanker_same_different':
        return 'vt_crowding_same_diff';
      default:
        return 'vt_crowding_default';
    }
  }
  switch (gaborMode) {
    case 'orientation_id':
      return 'vt_gabor_orientation';
    case 'orientation_match':
      return 'vt_gabor_match';
    case 'odd_one_out':
      return 'vt_gabor_odd';
    case 'sf_discrimination':
      return 'vt_gabor_sf';
    case 'delayed_match':
      return recallPhase ? 'vt_gabor_recall' : 'vt_gabor_memorize';
    default:
      return 'vt_gabor_default';
  }
}

export function resolveInstructionAudioUrl(lang: AudioSampleLang, sampleId: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}audio/instructions/${lang}/${sampleId}.mp3`;
}
