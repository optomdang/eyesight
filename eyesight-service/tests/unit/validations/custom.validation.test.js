/**
 * Custom Validation Tests
 * Tests for custom Joi validation functions
 */

const Joi = require('joi');
const { password } = require('../../../src/validations/custom.validation');

describe('Custom Validations', () => {
  describe('password', () => {
    const schema = Joi.object({
      password: Joi.string().custom(password),
    });

    test('should accept valid passwords', () => {
      const validPasswords = [
        'password1',
        'Password123',
        'myP@ssw0rd',
        '12345678a',
        'a12345678',
        'abcdefgh1',
        'ABCDEFGH1',
        'Test1234',
      ];

      validPasswords.forEach((pwd) => {
        const { error } = schema.validate({ password: pwd });
        expect(error).toBeUndefined();
      });
    });

    test('should reject passwords shorter than 8 characters', () => {
      const shortPasswords = ['pass1', 'abc123', 'a1', '1234567', 'abcdefg'];

      shortPasswords.forEach((pwd) => {
        const { error } = schema.validate({ password: pwd });
        expect(error).toBeDefined();
        expect(error.message).toContain('at least 8 characters');
      });
    });

    test('should reject passwords without letters', () => {
      const noLetterPasswords = ['12345678', '123456789', '!@#$%^&*1', '00000000'];

      noLetterPasswords.forEach((pwd) => {
        const { error } = schema.validate({ password: pwd });
        expect(error).toBeDefined();
        expect(error.message).toContain('at least 1 letter and 1 number');
      });
    });

    test('should reject passwords without numbers', () => {
      const noNumberPasswords = ['abcdefgh', 'Password', 'ABCDEFGH', 'testtest'];

      noNumberPasswords.forEach((pwd) => {
        const { error } = schema.validate({ password: pwd });
        expect(error).toBeDefined();
        expect(error.message).toContain('at least 1 letter and 1 number');
      });
    });

    test('should accept passwords with special characters', () => {
      const specialCharPasswords = ['P@ssw0rd!', 'Test#123', 'my$ecure1', 'pass_word1'];

      specialCharPasswords.forEach((pwd) => {
        const { error } = schema.validate({ password: pwd });
        expect(error).toBeUndefined();
      });
    });

    test('should accept exactly 8 character password', () => {
      const { error } = schema.validate({ password: 'abcdefg1' });
      expect(error).toBeUndefined();
    });
  });
});
