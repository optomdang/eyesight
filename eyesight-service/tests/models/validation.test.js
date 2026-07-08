/**
 * Model Validation Methods Test
 * Tests the standardized validation methods across all models
 */

const { User, Patient, Doctor, Exercise, ExerciseConfig, Center, Clinic, Role } = require('../../src/models');

describe('Model Validation Methods', () => {
  describe('User Model Validations', () => {
    test('should have isEmailTaken method', () => {
      expect(typeof User.isEmailTaken).toBe('function');
    });

    test('should have isPhoneNumberTaken method', () => {
      expect(typeof User.isPhoneNumberTaken).toBe('function');
    });

    test('should have checkEmailAndPhone method', () => {
      expect(typeof User.checkEmailAndPhone).toBe('function');
    });

    test('should have isPasswordMatch instance method', () => {
      const user = new User();
      expect(typeof user.isPasswordMatch).toBe('function');
    });
  });

  describe('Patient Model Validations', () => {
    test('should have standardized code validation method', () => {
      expect(typeof Patient.isDuplicateCode).toBe('function');
    });

    test('should have isUserAssigned method', () => {
      expect(typeof Patient.isUserAssigned).toBe('function');
    });
  });

  describe('Doctor Model Validations', () => {
    test('should have standardized code validation method', () => {
      expect(typeof Doctor.isDuplicateCode).toBe('function');
    });

    test('should have isUserAssigned method', () => {
      expect(typeof Doctor.isUserAssigned).toBe('function');
    });
  });

  describe('Exercise Model Validations', () => {
    test('should have standardized code validation method', () => {
      expect(typeof Exercise.isDuplicateCode).toBe('function');
    });
  });

  describe('ExerciseConfig Model Validations', () => {
    test('should have standardized name validation method', () => {
      expect(typeof ExerciseConfig.isDuplicateName).toBe('function');
    });
  });

  describe('Center Model Validations', () => {
    test('should have standardized code validation method', () => {
      expect(typeof Center.isDuplicateCode).toBe('function');
    });
  });

  describe('Clinic Model Validations', () => {
    test('should have standardized code validation method', () => {
      expect(typeof Clinic.isDuplicateCode).toBe('function');
    });
  });

  describe('Role Model Validations', () => {
    test('should have standardized code validation method', () => {
      expect(typeof Role.isDuplicateCode).toBe('function');
    });
  });

  describe('Method Consistency', () => {
    test('all models with codes should have consistent validation methods', () => {
      const modelsWithCodes = [Patient, Doctor, Exercise, Center, Clinic, Role];

      modelsWithCodes.forEach((Model) => {
        expect(typeof Model.isDuplicateCode).toBe('function');
      });
    });

    test('user-linked models should have isUserAssigned method', () => {
      const userLinkedModels = [Patient, Doctor];

      userLinkedModels.forEach((Model) => {
        expect(typeof Model.isUserAssigned).toBe('function');
      });
    });
  });

  describe('Model Indexes', () => {
    test('User model should have proper indexes defined', () => {
      const indexes = User.options.indexes || [];
      const indexNames = indexes.map((idx) => idx.name);

      expect(indexNames).toContain('idx_users_email');
      expect(indexNames).toContain('idx_users_phone');
      expect(indexNames).toContain('idx_users_center_type');
      expect(indexNames).toContain('idx_users_center_deleted');
    });

    test('Patient model should have proper indexes defined', () => {
      const indexes = Patient.options.indexes || [];
      const indexNames = indexes.map((idx) => idx.name);

      expect(indexNames).toContain('idx_patients_center_treatment');
      expect(indexNames).toContain('idx_patients_doctor');
      expect(indexNames).toContain('idx_patients_user');
      expect(indexNames).toContain('idx_patients_center_deleted');
    });

    test('Exercise model should have proper indexes defined', () => {
      const indexes = Exercise.options.indexes || [];
      const indexNames = indexes.map((idx) => idx.name);

      expect(indexNames).toContain('idx_exercises_center_code');
      expect(indexNames).toContain('idx_exercises_center_deleted');
      expect(indexNames).toContain('idx_exercises_type');
    });
  });
});
