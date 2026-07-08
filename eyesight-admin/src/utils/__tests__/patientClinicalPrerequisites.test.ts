import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchPatientWithCausesCheck,
  PATIENT_CAUSES_REQUIRED_MESSAGE,
  patientHasCauses,
} from '../patientClinicalPrerequisites';
import * as PatientService from 'src/services/patient.service';

vi.mock('src/services/patient.service', () => ({
  getPatient: vi.fn(),
}));

describe('patientClinicalPrerequisites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('patientHasCauses returns false when empty', () => {
    expect(patientHasCauses({ causes: [] })).toBe(false);
    expect(patientHasCauses({ causes: undefined })).toBe(false);
  });

  it('fetchPatientWithCausesCheck reads fresh API data', async () => {
    vi.mocked(PatientService.getPatient).mockResolvedValue({
      id: 22,
      causes: ['refractive_error'],
    });

    const result = await fetchPatientWithCausesCheck(22);
    expect(result.ok).toBe(true);
    expect(PatientService.getPatient).toHaveBeenCalledWith(22);
  });

  it('fetchPatientWithCausesCheck fails when API has no causes', async () => {
    vi.mocked(PatientService.getPatient).mockResolvedValue({ id: 22, causes: [] });

    const result = await fetchPatientWithCausesCheck(22);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(PATIENT_CAUSES_REQUIRED_MESSAGE);
    }
  });
});
