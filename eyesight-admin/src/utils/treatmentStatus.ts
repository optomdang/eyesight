/**
 * Treatment status helpers — front-end mirror of the backend SOT.
 * Source of truth: eye-sight-service/src/utils/treatmentUtils.js
 *
 * The patient form models the doctor's intent as a boolean toggle ("tạm dừng"),
 * but the API contract (read + write) uses the string enum. These helpers
 * bridge the two and keep the derivation identical to the backend.
 */
import dayjs from 'dayjs';
import type { TreatmentStatus } from 'src/types/core/patient';

export const TREATMENT_STATUS = {
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const;

/** Patient is currently "đang điều trị" only when status === 'active'. */
export const isActiveTreatment = (status?: TreatmentStatus | null): boolean =>
  status === TREATMENT_STATUS.ACTIVE;

/**
 * Derive the enum from the doctor's pause intent + the license dates.
 * Mirrors backend `computeTreatmentStatus`. `now` is injectable for tests.
 */
export const computeTreatmentStatus = (
  {
    paused,
    activeFrom,
    activeTo,
  }: { paused: boolean; activeFrom?: string | null; activeTo?: string | null },
  now: dayjs.Dayjs = dayjs()
): TreatmentStatus => {
  if (paused) return TREATMENT_STATUS.PAUSED;
  if (activeFrom && now.isBefore(dayjs(activeFrom), 'day')) return TREATMENT_STATUS.NOT_STARTED;
  if (activeTo && now.isAfter(dayjs(activeTo), 'day')) return TREATMENT_STATUS.COMPLETED;
  return TREATMENT_STATUS.ACTIVE;
};
