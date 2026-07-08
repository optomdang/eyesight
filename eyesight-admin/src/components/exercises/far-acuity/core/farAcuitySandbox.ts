/**
 * Build a sandbox Assignment for Far Acuity admin test (no API, no patient).
 */

import type { Assignment } from 'src/types';

export interface FarAcuitySandboxParams {
  /** Simulated patient vision level (1-based); applied via levelOverride. */
  visionLevel?: number;
  /** far | near — controls acuity table and letter sizing. */
  visionType?: 'far' | 'near' | 'contrast';
  distance?: number;
  eye?: 'left' | 'right' | 'both';
  duration?: number;
  exerciseName?: string;
}

export function buildFarAcuitySandboxAssignment(params: FarAcuitySandboxParams = {}): Assignment {
  return {
    id: 0,
    patientId: 0,
    configId: 0,
    status: 'active',
    sessionsCompleted: 0,
    levelOverride: true,
    visionLevel: params.visionLevel ?? 10,
    createdAt: '',
    updatedAt: '',
    exercise: {
      id: 0,
      name: params.exerciseName ?? 'Bài tập thị lực xa',
      code: 'far-acuity',
      exerciseType: 'far-acuity',
    },
    exerciseConfig: {
      id: 0,
      exerciseId: 0,
      configType: 'admin',
      name: 'Bài tập thị lực xa — Chơi thử',
      eye: params.eye ?? 'both',
      distance: params.distance ?? 3,
      duration: params.duration ?? 30,
      visionType: params.visionType ?? 'far',
      fontSize: 55,
      contrast: 100,
      inactivityThreshold: 30,
    } as Assignment['exerciseConfig'],
  };
}
