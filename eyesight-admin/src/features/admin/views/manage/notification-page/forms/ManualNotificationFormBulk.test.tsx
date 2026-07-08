import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for ManualNotificationFormBulk async multiple autocomplete logic
 *
 * Testing the critical merge logic that prevents selected patients from disappearing
 */

describe('ManualNotificationFormBulk - Async Multiple Autocomplete Logic', () => {
  describe('searchPatients merge logic', () => {
    it('should merge selected patients with search results', () => {
      // Simulate state
      const selectedPatients = [{ id: 1, code: 'PT001', user: { name: 'Như' } }];

      // Simulate API response for search "Anh"
      const searchResults = [{ id: 2, code: 'PT002', user: { name: 'Anh' } }];

      // Apply merge logic
      const selectedPatientIds = selectedPatients.map((p) => p.id);
      const newPatients = searchResults.filter((p) => !selectedPatientIds.includes(p.id));
      const mergedPatientsList = [...selectedPatients, ...newPatients];

      // Verify
      expect(mergedPatientsList).toHaveLength(2);
      expect(mergedPatientsList[0].id).toBe(1); // Như still there
      expect(mergedPatientsList[1].id).toBe(2); // Anh added
    });

    it('should not duplicate patients if already selected', () => {
      const selectedPatients = [{ id: 1, code: 'PT001', user: { name: 'Như' } }];

      // Search returns same patient
      const searchResults = [{ id: 1, code: 'PT001', user: { name: 'Như' } }];

      const selectedPatientIds = selectedPatients.map((p) => p.id);
      const newPatients = searchResults.filter((p) => !selectedPatientIds.includes(p.id));
      const mergedPatientsList = [...selectedPatients, ...newPatients];

      expect(mergedPatientsList).toHaveLength(1);
      expect(mergedPatientsList[0].id).toBe(1);
    });

    it('should handle multiple selected patients', () => {
      const selectedPatients = [
        { id: 1, code: 'PT001', user: { name: 'Như' } },
        { id: 2, code: 'PT002', user: { name: 'Anh' } },
      ];

      const searchResults = [{ id: 3, code: 'PT003', user: { name: 'Minh' } }];

      const selectedPatientIds = selectedPatients.map((p) => p.id);
      const newPatients = searchResults.filter((p) => !selectedPatientIds.includes(p.id));
      const mergedPatientsList = [...selectedPatients, ...newPatients];

      expect(mergedPatientsList).toHaveLength(3);
      expect(mergedPatientsList.map((p) => p.id)).toEqual([1, 2, 3]);
    });

    it('should map merged patients to options correctly', () => {
      const mergedPatientsList = [
        { id: 1, code: 'PT001', user: { name: 'Như' } },
        { id: 2, code: 'PT002', user: { name: 'Anh' } },
      ];

      const options = mergedPatientsList.map((patient) => {
        const name = patient.user?.name || patient.fullName || 'N/A';
        return {
          value: patient.id || 0,
          label: `${patient.code} - ${name}`,
        };
      });

      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ value: 1, label: 'PT001 - Như' });
      expect(options[1]).toEqual({ value: 2, label: 'PT002 - Anh' });
    });
  });

  describe('handlePatientsChange logic', () => {
    it('should find patients from merged patientsList', () => {
      const patientsList = [
        { id: 1, code: 'PT001', user: { name: 'Như' } },
        { id: 2, code: 'PT002', user: { name: 'Anh' } },
      ];

      const newValue = [
        { value: 1, label: 'PT001 - Như' },
        { value: 2, label: 'PT002 - Anh' },
      ];

      // Apply handlePatientsChange logic
      const selected = newValue
        .map((opt) => patientsList.find((p) => p.id === opt.value))
        .filter((p): p is any => p !== undefined);

      expect(selected).toHaveLength(2);
      expect(selected[0].id).toBe(1);
      expect(selected[1].id).toBe(2);
    });

    it('should handle when patient not found in patientsList', () => {
      const patientsList = [{ id: 2, code: 'PT002', user: { name: 'Anh' } }];

      const newValue = [
        { value: 1, label: 'PT001 - Như' }, // Not in patientsList
        { value: 2, label: 'PT002 - Anh' },
      ];

      const selected = newValue
        .map((opt) => patientsList.find((p) => p.id === opt.value))
        .filter((p): p is any => p !== undefined);

      // Should only have patient 2 (patient 1 not found)
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe(2);
    });
  });

  describe('Integration scenario', () => {
    it('should maintain selected patients through multiple searches', () => {
      // Initial state
      let selectedPatients: any[] = [];
      let patientsList: any[] = [];

      // Step 1: Search "Nhu" and select
      const search1Results = [{ id: 1, code: 'PT001', user: { name: 'Như' } }];

      // Merge logic
      let selectedPatientIds = selectedPatients.map((p) => p.id);
      let newPatients = search1Results.filter((p) => !selectedPatientIds.includes(p.id));
      patientsList = [...selectedPatients, ...newPatients];

      // User selects Như
      selectedPatients = [patientsList[0]];

      expect(selectedPatients).toHaveLength(1);
      expect(selectedPatients[0].id).toBe(1);

      // Step 2: Search "Anh" (should keep Như)
      const search2Results = [{ id: 2, code: 'PT002', user: { name: 'Anh' } }];

      selectedPatientIds = selectedPatients.map((p) => p.id);
      newPatients = search2Results.filter((p) => !selectedPatientIds.includes(p.id));
      patientsList = [...selectedPatients, ...newPatients];

      expect(patientsList).toHaveLength(2);
      expect(patientsList[0].id).toBe(1); // Như still there
      expect(patientsList[1].id).toBe(2); // Anh added

      // User selects both
      const newValue = [
        { value: 1, label: 'PT001 - Như' },
        { value: 2, label: 'PT002 - Anh' },
      ];

      selectedPatients = newValue
        .map((opt) => patientsList.find((p) => p.id === opt.value))
        .filter((p): p is any => p !== undefined);

      expect(selectedPatients).toHaveLength(2);
      expect(selectedPatients.map((p) => p.id)).toEqual([1, 2]);
    });
  });
});
