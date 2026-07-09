import { getData, getDataTable } from 'src/utils/request';
import { buildUrl } from 'src/utils/query-builder';
import type { PaginatedResponse, TreatmentPackage } from 'src/types/core';

export interface PatientActiveTreatmentPackage {
  assignment: {
    id: number;
    patientId: number;
    treatmentPackageId: number;
    assignedAt: string;
    expiresAt: string;
    status: string;
  };
  treatmentPackage: TreatmentPackage;
  isExpired: boolean;
  expiresAt: string;
  allowedConfigIds: number[];
}

export const getTreatmentPackages = (params?: {
  limit?: number;
  page?: number;
  sortBy?: string;
  order?: string;
}): Promise<PaginatedResponse<TreatmentPackage>> => {
  const url = buildUrl('/treatment-packages', params);
  return getDataTable<TreatmentPackage>(url);
};

export const getPatientActiveTreatmentPackage = (
  patientId: number
): Promise<PatientActiveTreatmentPackage | null> => {
  return getData<PatientActiveTreatmentPackage | null>(
    `/patients/${patientId}/active-treatment-package`
  );
};
