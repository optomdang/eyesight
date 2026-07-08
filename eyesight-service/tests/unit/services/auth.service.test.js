/**
 * Auth Service Unit Tests
 * Tests for authentication operations (login, logout, token refresh)
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
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Token: {
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../../../src/services/authentication/token.service', () => ({
  verifyToken: jest.fn(),
  generateAuthTokens: jest.fn(),
}));

jest.mock('../../../src/services/authentication/user.service', () => ({
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
  updateUserById: jest.fn(),
}));

jest.mock('../../../src/services/system/auditLog.service', () => ({
  logAuthEvent: jest.fn().mockResolvedValue(undefined),
  logEntityAuditEvent: jest.fn().mockResolvedValue(undefined),
  buildRequestContext: jest.fn().mockReturnValue({}),
}));

const { Token } = require('../../../src/models');
const tokenService = require('../../../src/services/authentication/token.service');
const userService = require('../../../src/services/authentication/user.service');
const authService = require('../../../src/services/authentication/auth.service');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUserWithEmailAndPassword', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      active: true,
      password: 'hashedPassword',
      isPasswordMatch: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    test('should login successfully with correct credentials', async () => {
      userService.getUserByEmail.mockResolvedValue(mockUser);
      mockUser.isPasswordMatch.mockResolvedValue(true);

      const result = await authService.loginUserWithEmailAndPassword('test@example.com', 'correctPassword');

      expect(userService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.isPasswordMatch).toHaveBeenCalledWith('correctPassword');
      expect(result).toEqual(mockUser);
    });

    test('should throw error for non-existent user', async () => {
      userService.getUserByEmail.mockResolvedValue(null);

      await expect(authService.loginUserWithEmailAndPassword('nonexistent@example.com', 'password')).rejects.toThrow(
        'Email hoặc mật khẩu không đúng'
      );
    });

    test('should throw error for incorrect password', async () => {
      userService.getUserByEmail.mockResolvedValue(mockUser);
      mockUser.isPasswordMatch.mockResolvedValue(false);

      await expect(authService.loginUserWithEmailAndPassword('test@example.com', 'wrongPassword')).rejects.toThrow(
        'Email hoặc mật khẩu không đúng'
      );
    });

    test('should throw error for suspended user', async () => {
      userService.getUserByEmail.mockResolvedValue({
        ...mockUser,
        active: false,
      });
      mockUser.isPasswordMatch.mockResolvedValue(true);

      await expect(authService.loginUserWithEmailAndPassword('test@example.com', 'correctPassword')).rejects.toThrow(
        /khóa|không hoạt động/i
      );
    });

    test('should update lastLoginAt on successful login', async () => {
      userService.getUserByEmail.mockResolvedValue(mockUser);
      mockUser.isPasswordMatch.mockResolvedValue(true);

      await authService.loginUserWithEmailAndPassword('test@example.com', 'correctPassword');

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        })
      );
    });
  });

  describe('logout', () => {
    test('should logout successfully with valid refresh token', async () => {
      const mockToken = {
        id: 1,
        token: 'valid-refresh-token',
        type: 'refresh',
        blacklisted: false,
        destroy: jest.fn(),
      };

      Token.findOne.mockResolvedValue(mockToken);

      await authService.logout('valid-refresh-token');

      expect(Token.findOne).toHaveBeenCalled();
      expect(mockToken.destroy).toHaveBeenCalled();
    });

    test('should throw error for invalid refresh token', async () => {
      Token.findOne.mockRejectedValue(new Error('Token not found'));

      await expect(authService.logout('invalid-token')).rejects.toThrow();
    });
  });

  describe('refreshAuth', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      active: true,
    };

    const mockTokenDoc = {
      id: 1,
      token: 'valid-refresh-token',
      user: 1,
      userId: 1,
      type: 'refresh',
      destroy: jest.fn(),
    };

    const mockNewTokens = {
      access: { token: 'new-access-token', expires: new Date() },
      refresh: { token: 'new-refresh-token', expires: new Date() },
    };

    test('should refresh tokens successfully', async () => {
      tokenService.verifyToken.mockResolvedValue(mockTokenDoc);
      userService.getUserById.mockResolvedValue(mockUser);
      tokenService.generateAuthTokens.mockResolvedValue(mockNewTokens);

      const result = await authService.refreshAuth('valid-refresh-token');

      expect(tokenService.verifyToken).toHaveBeenCalledWith('valid-refresh-token', 'refresh');
      expect(mockTokenDoc.destroy).toHaveBeenCalled();
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockNewTokens);
    });

    test('should throw error for invalid refresh token', async () => {
      tokenService.verifyToken.mockRejectedValue(new Error('Token invalid'));

      await expect(authService.refreshAuth('invalid-token')).rejects.toThrow();
    });

    test('should throw error if user not found', async () => {
      const mockTokenDocNoUser = {
        ...mockTokenDoc,
        destroy: jest.fn(),
      };
      tokenService.verifyToken.mockResolvedValue(mockTokenDocNoUser);
      userService.getUserById.mockResolvedValue(null);

      await expect(authService.refreshAuth('valid-refresh-token')).rejects.toThrow(/phiên đăng nhập không hợp lệ/i);
      expect(tokenService.generateAuthTokens).not.toHaveBeenCalled();
    });

    test('should throw error if user is suspended', async () => {
      tokenService.verifyToken.mockResolvedValue(mockTokenDoc);
      userService.getUserById.mockResolvedValue({
        ...mockUser,
        active: false,
      });

      await expect(authService.refreshAuth('valid-refresh-token')).rejects.toThrow(/khóa|không hoạt động/i);
      expect(tokenService.generateAuthTokens).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
    };

    const mockTokenDoc = {
      id: 1,
      token: 'valid-reset-token',
      user: 1,
      userId: 1,
      type: 'resetPassword',
    };

    test('should reset password successfully', async () => {
      tokenService.verifyToken.mockResolvedValue(mockTokenDoc);
      userService.getUserById.mockResolvedValue(mockUser);
      userService.updateUserById.mockResolvedValue(mockUser);
      Token.destroy.mockResolvedValue(1);

      await authService.resetPassword('valid-reset-token', 'newPassword123');

      expect(tokenService.verifyToken).toHaveBeenCalledWith('valid-reset-token', 'resetPassword');
      expect(userService.updateUserById).toHaveBeenCalledWith(mockUser.id, {
        password: 'newPassword123',
      });
      expect(Token.destroy).toHaveBeenCalledWith({
        where: { userId: mockUser.id, type: 'resetPassword' },
      });
    });

    test('should throw error for invalid reset token', async () => {
      tokenService.verifyToken.mockRejectedValue(new Error('Token invalid'));

      await expect(authService.resetPassword('invalid-token', 'newPassword')).rejects.toThrow();
    });

    test('should throw error if user not found', async () => {
      tokenService.verifyToken.mockResolvedValue(mockTokenDoc);
      userService.getUserById.mockResolvedValue(null);

      await expect(authService.resetPassword('valid-reset-token', 'newPassword')).rejects.toThrow();
    });
  });

  describe('verifyEmail', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      isEmailVerified: false,
    };

    const mockTokenDoc = {
      id: 1,
      token: 'valid-verify-token',
      user: 1,
      userId: 1,
      type: 'verifyEmail',
    };

    test('should verify email successfully', async () => {
      tokenService.verifyToken.mockResolvedValue(mockTokenDoc);
      userService.getUserById.mockResolvedValue(mockUser);
      userService.updateUserById.mockResolvedValue({ ...mockUser, isEmailVerified: true });
      Token.destroy.mockResolvedValue(1);

      await authService.verifyEmail('valid-verify-token');

      expect(tokenService.verifyToken).toHaveBeenCalledWith('valid-verify-token', 'verifyEmail');
      expect(userService.updateUserById).toHaveBeenCalledWith(mockUser.id, {
        isEmailVerified: true,
      });
      expect(Token.destroy).toHaveBeenCalledWith({
        where: { userId: mockUser.id, type: 'verifyEmail' },
      });
    });

    test('should throw error for invalid verify token', async () => {
      tokenService.verifyToken.mockRejectedValue(new Error('Token invalid'));

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow();
    });
  });

  // changePassword function is not implemented in auth.service.js
  // If you need this functionality, implement it in the service first
  describe('changePassword (not implemented)', () => {
    test('should be implemented in auth.service.js', () => {
      // This is a placeholder test
      // When changePassword is implemented, add proper tests
      expect(typeof authService.changePassword).toBe('undefined');
    });
  });
});
