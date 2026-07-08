import { describe, it, expect } from 'vitest';
import { patientAssignmentFormSchema } from '../schemas/patientAssignment';

const basePayload = {
  exerciseId: 1,
  exerciseConfigId: 10,
  configReferentId: null,
  notes: '',
  createCustomConfig: false,
  name: '',
  eye: 'left',
  distance: 3,
  duration: 30,
  frequency: 'daily',
  executionCount: 1,
  colorScheme: {
    preset: 'whiteBlack',
    textColor: '#000000',
    backgroundColor: '#ffffff',
  },
  notificationSettings: {
    enabled: false,
    templateId: null,
    methods: [],
    reminderFrequency: 'daily',
    reminderTime: '08:00',
    reminderDaysInterval: 1,
    maxReminders: 3,
  },
};

describe('patientAssignmentFormSchema - vision override consistency', () => {
  it('allows null visionLevel when levelOverride is false', async () => {
    const data = {
      ...basePayload,
      visionType: 'far',
      levelOverride: false,
      visionLevel: null,
    };

    await expect(patientAssignmentFormSchema.validate(data)).resolves.toBeDefined();
  });

  it('rejects visionLevel when levelOverride is false', async () => {
    const data = {
      ...basePayload,
      visionType: 'far',
      levelOverride: false,
      visionLevel: 10,
    };

    await expect(patientAssignmentFormSchema.validate(data)).rejects.toThrow(
      /Vision level phải để trống khi không bật ghi đè/i
    );
  });

  it('requires visionLevel when levelOverride is true', async () => {
    const data = {
      ...basePayload,
      visionType: 'far',
      levelOverride: true,
      visionLevel: null,
    };

    await expect(patientAssignmentFormSchema.validate(data)).rejects.toThrow(
      /Cấp độ thị lực là bắt buộc khi bật ghi đè/i
    );
  });

  it('enforces max level by visionType (near <= 6)', async () => {
    const invalidNear = {
      ...basePayload,
      visionType: 'near',
      levelOverride: true,
      visionLevel: 8,
    };

    await expect(patientAssignmentFormSchema.validate(invalidNear)).rejects.toThrow(
      /between 1 and 6/i
    );

    const validNear = {
      ...basePayload,
      visionType: 'near',
      levelOverride: true,
      visionLevel: 6,
    };

    await expect(patientAssignmentFormSchema.validate(validNear)).resolves.toBeDefined();
  });

    // BUG-07: The original bug silently ignored visionLevel when levelOverride was false,
    // letting a stale visionLevel value pass validation and override exam-derived levels.
    // These tests ensure the schema actively rejects such payloads so the UI must clear
    // the field before submitting (enforced by PatientAssignmentForm's onChange handler).
    it('BUG-07: rejects visionLevel=14 (typical exam level) when levelOverride is false', async () => {
      const data = {
        ...basePayload,
        visionType: 'far',
        levelOverride: false,
        visionLevel: 14, // matches default exam level - must still be rejected
      };

      await expect(patientAssignmentFormSchema.validate(data)).rejects.toThrow(
        /Vision level phải để trống khi không bật ghi đè/i
      );
    });

    it('BUG-07: allows levelOverride=true with any in-range far level (1-20)', async () => {
      for (const level of [1, 7, 14, 20]) {
        const data = {
          ...basePayload,
          visionType: 'far',
          levelOverride: true,
          visionLevel: level,
        };

        await expect(patientAssignmentFormSchema.validate(data)).resolves.toBeDefined();
      }
    });

  it('allows createCustomConfig without exerciseConfigId', async () => {
    const data = {
      ...basePayload,
      createCustomConfig: true,
      exerciseConfigId: null,
      name: 'Cấu hình riêng',
      visionType: 'far',
      levelOverride: false,
      visionLevel: null,
      inactivityThreshold: 10,
    };

    await expect(patientAssignmentFormSchema.validate(data)).resolves.toBeDefined();
  });

  it('rejects createCustomConfig without name', async () => {
    const data = {
      ...basePayload,
      createCustomConfig: true,
      exerciseConfigId: null,
      name: '',
      visionType: 'far',
      levelOverride: false,
      visionLevel: null,
    };

    await expect(patientAssignmentFormSchema.validate(data)).rejects.toThrow(/Tên cấu hình là bắt buộc/);
  });
});
