import { describe, expect, it } from 'vitest';
import {
  getExamInstructionAudioIds,
  getStereopsisQuestionAudioId,
  getVtInstructionSampleId,
  getVtStageIntroAudioId,
} from '../instructionAudioResolver';

describe('instructionAudioResolver', () => {
  it('maps exam types to full intro clip queue in UI order', () => {
    const far = getExamInstructionAudioIds('far');
    expect(far).toEqual([
      'exam_welcome_far',
      'exam_glasses_cover',
      'exam_choose_direction',
      'exam_no_hints',
      'exam_no_squint',
      'exam_compromised_recheck',
      'exam_cherry_pick',
      'exam_lighting',
    ]);

    const stereo = getExamInstructionAudioIds('stereopsis');
    expect(stereo).toEqual([
      'exam_welcome_stereopsis',
      'exam_stereo_glasses',
      'exam_stereo_supporter',
      'exam_no_hints',
      'exam_no_squint',
      'exam_cherry_pick',
      'exam_lighting',
    ]);
  });

  it('maps stereopsis question kinds', () => {
    expect(getStereopsisQuestionAudioId('digit')).toBe('exam_stereo_q_digit');
  });

  it('maps VT gabor delayed recall phases', () => {
    expect(
      getVtInstructionSampleId('gabor', 'delayed_match', 'alignment_2afc', 'location_2afc', 'shape_id', false)
    ).toBe('vt_gabor_memorize');
    expect(
      getVtInstructionSampleId('gabor', 'delayed_match', 'alignment_2afc', 'location_2afc', 'shape_id', true)
    ).toBe('vt_gabor_recall');
  });

  it('clamps stage intro ids', () => {
    expect(getVtStageIntroAudioId(0)).toBe('vt_stage_1');
    expect(getVtStageIntroAudioId(25)).toBe('vt_stage_20');
  });
});
