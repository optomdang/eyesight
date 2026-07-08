/**
 * User Profile Avatar Update Tests
 * Extended tests for avatar field in user profile
 */

// Mock dependencies first
jest.mock('../../../src/config/db', () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/models', () => ({
  User: {
    findByPk: jest.fn(),
    isEmailTaken: jest.fn(),
    isPhoneNumberTaken: jest.fn(),
  },
  Center: {},
  Role: {},
  Clinic: {},
  Doctor: {},
  Patient: {},
}));

const { User } = require('../../../src/models');
const userService = require('../../../src/services/authentication/user.service');

describe('User Service - Avatar Update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserById - avatar field', () => {
    const mockExistingUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      centerId: 1,
      userType: 'patient',
      avatar: null,
      save: jest.fn(),
    };

    test('should update user with base64 avatar successfully', async () => {
      const avatarBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      User.findByPk.mockResolvedValue(mockExistingUser);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);

      await userService.updateUserById(1, { avatar: avatarBase64 });

      expect(mockExistingUser.avatar).toBe(avatarBase64);
      expect(mockExistingUser.save).toHaveBeenCalled();
    });

    test('should update user with avatar URL successfully', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';

      User.findByPk.mockResolvedValue(mockExistingUser);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);

      await userService.updateUserById(1, { avatar: avatarUrl });

      expect(mockExistingUser.avatar).toBe(avatarUrl);
      expect(mockExistingUser.save).toHaveBeenCalled();
    });

    test('should remove avatar when set to null', async () => {
      const userWithAvatar = {
        ...mockExistingUser,
        avatar: 'existing-avatar-data',
      };

      User.findByPk.mockResolvedValue(userWithAvatar);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);

      await userService.updateUserById(1, { avatar: null });

      expect(userWithAvatar.avatar).toBeNull();
      expect(userWithAvatar.save).toHaveBeenCalled();
    });

    test('should remove avatar when set to empty string', async () => {
      const userWithAvatar = {
        ...mockExistingUser,
        avatar: 'existing-avatar-data',
      };

      User.findByPk.mockResolvedValue(userWithAvatar);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);

      await userService.updateUserById(1, { avatar: '' });

      expect(userWithAvatar.avatar).toBe('');
      expect(userWithAvatar.save).toHaveBeenCalled();
    });

    test('should update avatar along with other fields', async () => {
      const avatarBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const updateData = {
        name: 'Updated Name',
        phoneNumber: '0987654321',
        avatar: avatarBase64,
      };

      User.findByPk.mockResolvedValue(mockExistingUser);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);

      await userService.updateUserById(1, updateData);

      expect(mockExistingUser.name).toBe('Updated Name');
      expect(mockExistingUser.phoneNumber).toBe('0987654321');
      expect(mockExistingUser.avatar).toBe(avatarBase64);
      expect(mockExistingUser.save).toHaveBeenCalled();
    });

    test('should update avatar along with address object', async () => {
      const avatarBase64 = 'data:image/png;base64,test123';
      const address = {
        country: 'Vietnam',
        province: 'Hanoi',
        district: 'Cau Giay',
        ward: 'Dich Vong',
        specificAddress: '123 Test St',
      };
      const updateData = {
        address,
        avatar: avatarBase64,
      };

      User.findByPk.mockResolvedValue(mockExistingUser);
      User.isEmailTaken.mockResolvedValue(false);
      User.isPhoneNumberTaken.mockResolvedValue(false);

      await userService.updateUserById(1, updateData);

      expect(mockExistingUser.address).toEqual(address);
      expect(mockExistingUser.avatar).toBe(avatarBase64);
      expect(mockExistingUser.save).toHaveBeenCalled();
    });
  });
});
