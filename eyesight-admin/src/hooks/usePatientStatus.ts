/**
 * usePatientStatus Hook
 *
 * Custom hook to check patient treatment status for access control.
 * Fetches patient info on mount and returns active status, loading state, and error.
 *
 * Used by:
 * - PortalGuard component to redirect inactive patients
 * - InactivePage component to display doctor contact information
 *
 * @returns {UsePatientStatusReturn} Patient status data
 *
 * @example
 * ```typescript
 * const { isActive, loading, error, patientInfo } = usePatientStatus();
 *
 * if (loading) return <LoadingSpinner />;
 * if (isActive === false) return <Navigate to="/portal/inactive" />;
 * ```
 */

import { useState, useEffect } from 'react';
import { getMyPatientInfo } from 'src/services/patient.service';
import { isActiveTreatment } from 'src/utils/treatmentStatus';
import type { PatientInfo } from 'src/types/core';

interface UsePatientStatusReturn {
  isActive: boolean | null;
  loading: boolean;
  error: string | null;
  patientInfo: PatientInfo | null;
}

export const usePatientStatus = (): UsePatientStatusReturn => {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const info = await getMyPatientInfo();
        setPatientInfo(info);
        setIsActive(isActiveTreatment(info.treatmentStatus));
      } catch (err: any) {
        setError(err.message || 'Không thể tải thông tin bệnh nhân');
        setIsActive(null);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return { isActive, loading, error, patientInfo };
};

export default usePatientStatus;
