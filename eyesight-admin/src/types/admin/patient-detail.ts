/**
 * Admin Patient Types
 * Types specific to admin patient management
 */

/**
 * Exercise result for patient detail table
 */
export interface PatientExerciseResult {
  id: number;
  patientId: number;
  exerciseId: number;
  exerciseName: string;
  exerciseType: string;
  level: number;
  score: number;
  accuracy: number;
  duration: number; // in seconds
  movesCount?: number;
  completed: boolean;
  status: 'incomplete' | 'completed';
  visualSettings: {
    fontSize: number;
    textColor: string;
    backgroundColor: string;
    contrast: number;
  };
  passConditions?: {
    minScore: number;
    maxTime: number;
    minAccuracy: number;
  };
  createdAt: string;
  completedAt?: string;
}

/**
 * Patient for bulk assignment
 */
export interface BulkAssignPatient {
  id: number;
  code: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}
