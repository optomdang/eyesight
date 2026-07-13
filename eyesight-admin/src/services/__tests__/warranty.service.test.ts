/**
 * Warranty Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('src/utils/request', () => ({
  getData: vi.fn(),
  postData: vi.fn(),
  patchData: vi.fn(),
  getBlob: vi.fn(),
}));

import {
  getPatientWarrantyAgreement,
  getMyWarrantyAgreement,
  createPatientWarrantyAgreement,
  createWarrantyPhase,
  updateWarrantyPhaseClinicalData,
  signWarrantyPhase,
  downloadWarrantyPhasePdf,
  downloadWarrantyAggregatePdf,
} from '../warranty.service';
import { getData, postData, patchData, getBlob } from 'src/utils/request';

describe('Warranty Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPatientWarrantyAgreement', () => {
    it('calls GET warranty-agreements/patients/:patientId', async () => {
      vi.mocked(getData).mockResolvedValue({ id: 1 });
      await getPatientWarrantyAgreement(42);
      expect(getData).toHaveBeenCalledWith('warranty-agreements/patients/42');
    });
  });

  describe('getMyWarrantyAgreement', () => {
    it('calls GET warranty-agreements/me', async () => {
      vi.mocked(getData).mockResolvedValue(null);
      await getMyWarrantyAgreement();
      expect(getData).toHaveBeenCalledWith('warranty-agreements/me');
    });
  });

  describe('createPatientWarrantyAgreement', () => {
    it('calls POST warranty-agreements/patients/:patientId', async () => {
      vi.mocked(postData).mockResolvedValue({ id: 1 });
      await createPatientWarrantyAgreement(7);
      expect(postData).toHaveBeenCalledWith('warranty-agreements/patients/7', {});
    });
  });

  describe('createWarrantyPhase', () => {
    it('calls POST phases with payload', async () => {
      const payload = { phaseType: 'reexam' as const, clinicalData: {} };
      vi.mocked(postData).mockResolvedValue({ id: 1 });
      await createWarrantyPhase(3, payload);
      expect(postData).toHaveBeenCalledWith('warranty-agreements/3/phases', payload);
    });
  });

  describe('updateWarrantyPhaseClinicalData', () => {
    it('calls PATCH clinical-data endpoint', async () => {
      const payload = { clinicalData: { clinicalNotes: 'note' } };
      vi.mocked(patchData).mockResolvedValue({ id: 1 });
      await updateWarrantyPhaseClinicalData(3, 9, payload);
      expect(patchData).toHaveBeenCalledWith(
        'warranty-agreements/3/phases/9/clinical-data',
        payload
      );
    });
  });

  describe('signWarrantyPhase', () => {
    it('calls POST sign with consentAccepted true', async () => {
      const payload = {
        signatureDataUrl: 'data:image/png;base64,abc',
        signerName: 'Nguyen Van A',
        consentAccepted: true as const,
      };
      vi.mocked(postData).mockResolvedValue({ id: 1 });
      await signWarrantyPhase(3, 9, payload);
      expect(postData).toHaveBeenCalledWith('warranty-agreements/3/phases/9/sign', payload);
    });
  });

  describe('PDF downloads', () => {
    it('downloads phase PDF', async () => {
      vi.mocked(getBlob).mockResolvedValue(new Blob());
      await downloadWarrantyPhasePdf(1, 2);
      expect(getBlob).toHaveBeenCalledWith('warranty-agreements/1/phases/2/download', {
        timeoutMs: 60000,
      });
    });

    it('downloads aggregate PDF', async () => {
      vi.mocked(getBlob).mockResolvedValue(new Blob());
      await downloadWarrantyAggregatePdf(5);
      expect(getBlob).toHaveBeenCalledWith('warranty-agreements/5/download', { timeoutMs: 60000 });
    });
  });
});
