export interface TreatmentPackage {
  id: number;
  centerId: number;
  name: string;
  code: string;
  durationDays: number;
  exerciseConfigIds: number[];
  packageType?: 'system' | 'custom';
  exerciseCount?: number;
  userCount?: number;
  improvementPercent?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTreatmentPackageData {
  name: string;
  code: string;
  durationDays: number;
  exerciseConfigIds: number[];
}

export interface UpdateTreatmentPackageData {
  name?: string;
  code?: string;
  durationDays?: number;
  exerciseConfigIds?: number[];
}
