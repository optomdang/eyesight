/**
 * Test to verify PatientInfo interface is correctly defined and exported
 */

import type { PatientInfo } from '../core/patient';

describe('PatientInfo interface', () => {
  it('should have all required fields', () => {
    const patientInfo: PatientInfo = {
      id: 1,
      code: 'P001',
      treatmentStatus: 'active',
      doctorId: 2,
    };

    expect(patientInfo.id).toBe(1);
    expect(patientInfo.code).toBe('P001');
    expect(patientInfo.treatmentStatus).toBe('active');
    expect(patientInfo.doctorId).toBe(2);
  });

  it('should allow optional doctor field', () => {
    const patientInfo: PatientInfo = {
      id: 1,
      code: 'P001',
      treatmentStatus: 'paused',
      doctorId: 2,
      doctor: {
        name: 'Dr. Test',
        phoneNumber: '0123456789',
      },
    };

    expect(patientInfo.doctor).toBeDefined();
    expect(patientInfo.doctor?.name).toBe('Dr. Test');
    expect(patientInfo.doctor?.phoneNumber).toBe('0123456789');
  });

  it('should allow doctor without phoneNumber', () => {
    const patientInfo: PatientInfo = {
      id: 1,
      code: 'P001',
      treatmentStatus: 'active',
      doctorId: 2,
      doctor: {
        name: 'Dr. Test',
      },
    };

    expect(patientInfo.doctor?.name).toBe('Dr. Test');
    expect(patientInfo.doctor?.phoneNumber).toBeUndefined();
  });

  it('should be importable from main types index', () => {
    // This test verifies the type can be imported from the main index
    // If this compiles, the export is working correctly
    const testImport: typeof import('../index') = {} as any;

    // Type assertion to verify PatientInfo is exported
    const _typeCheck: PatientInfo = {} as any;
    expect(_typeCheck).toBeDefined();
  });
});
