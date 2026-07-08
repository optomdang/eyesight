const userValidation = require('../../../src/validations/authentication/user.validation');

describe('User Validation', () => {
  const validCreatePayload = {
    email: 'doctor@example.com',
    password: 'Password123',
    name: 'Nguyen Minh Thu',
    phoneNumber: '0969851610',
    userType: 'doctor',
    centerId: 1,
    doctor: {
      code: 'DT260316WG9',
      specialization: 'Bac si chuyen khoa mat',
      licenseNumber: '2321',
      clinicId: 1,
    },
  };

  describe('createUser', () => {
    test('should allow active when creating a doctor user', () => {
      const payload = {
        ...validCreatePayload,
        active: false,
      };

      const { error, value } = userValidation.createUser.body.validate(payload);

      expect(error).toBeUndefined();
      expect(value.active).toBe(false);
    });

    test('should still reject unknown top-level fields', () => {
      const payload = {
        ...validCreatePayload,
        unexpectedFlag: true,
      };

      const { error } = userValidation.createUser.body.validate(payload);

      expect(error).toBeDefined();
      expect(error.message).toContain('unexpectedFlag');
    });
  });

  describe('updateUser', () => {
    test('should allow active when updating a user', () => {
      const payload = {
        id: 99,
        name: 'Updated Doctor',
        roleId: 3,
        centerId: 1,
        userType: 'doctor',
        active: false,
      };

      const { error, value } = userValidation.updateUser.body.validate(payload);

      expect(error).toBeUndefined();
      expect(value.active).toBe(false);
    });
  });
});
