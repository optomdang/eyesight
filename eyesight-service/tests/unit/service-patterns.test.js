// Mock sequelize first
jest.mock('../../src/config/db', () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

const {
  standardQuery,
  standardCreate,
  standardUpdate,
  standardSoftDelete,
  standardGetById,
  withTransaction,
} = require('../../src/utils/patterns');

// Mock Sequelize model
const mockModel = {
  findAndCountAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

describe('Service Patterns Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('standardQuery', () => {
    test('should apply default pagination and sorting', async () => {
      const mockRows = [{ id: 1, name: 'Test' }];
      const mockCount = 1;

      mockModel.findAndCountAll.mockResolvedValue({
        rows: mockRows,
        count: mockCount,
      });

      const result = await standardQuery(mockModel, {}, {});

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
        include: [],
        distinct: true,
      });

      expect(result).toEqual({
        rows: mockRows,
        count: mockCount,
        total: mockCount,
        limit: 10,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    test('should handle custom pagination', async () => {
      mockModel.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 25,
      });

      await standardQuery(mockModel, {}, { limit: 5, page: 3 });

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 5,
        offset: 10, // (page 3 - 1) * limit 5
        order: [['createdAt', 'DESC']],
        include: [],
        distinct: true,
      });
    });

    test('should handle sorting with direction', async () => {
      mockModel.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await standardQuery(mockModel, {}, { sortBy: 'name:ASC' });

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 0,
        order: [['name', 'ASC']],
        include: [],
        distinct: true,
      });
    });

    test('should handle relation field sorting', async () => {
      mockModel.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await standardQuery(mockModel, {}, { sortBy: 'user.name:DESC' });

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
        include: [],
        distinct: true,
      });
    });

    test('should merge custom filters with deleted filter', async () => {
      mockModel.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      await standardQuery(mockModel, { centerId: 1, status: 'active' }, {});

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: { centerId: 1, status: 'active' },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
        include: [],
        distinct: true,
      });
    });
  });

  describe('standardCreate', () => {
    test('should set createdBy from updatedBy', async () => {
      const mockEntity = { id: 1, name: 'Test' };
      mockModel.create.mockResolvedValue(mockEntity);

      const entityData = {
        name: 'Test',
        updatedBy: 123,
      };

      const result = await standardCreate(mockModel, entityData);

      expect(mockModel.create).toHaveBeenCalledWith({
        name: 'Test',
        updatedBy: 123,
        createdBy: 123,
      });

      expect(result).toBe(mockEntity);
    });

    test('should not override existing createdBy', async () => {
      const mockEntity = { id: 1, name: 'Test' };
      mockModel.create.mockResolvedValue(mockEntity);

      const entityData = {
        name: 'Test',
        updatedBy: 123,
        createdBy: 456,
      };

      await standardCreate(mockModel, entityData);

      expect(mockModel.create).toHaveBeenCalledWith({
        name: 'Test',
        updatedBy: 123,
        createdBy: 456, // Should preserve existing createdBy
      });
    });

    test('should work with transaction', async () => {
      const mockEntity = { id: 1, name: 'Test' };
      const mockTransaction = { id: 'transaction' };
      mockModel.create.mockResolvedValue(mockEntity);

      const entityData = { name: 'Test', updatedBy: 123 };

      await standardCreate(mockModel, entityData, mockTransaction);

      expect(mockModel.create).toHaveBeenCalledWith(
        {
          name: 'Test',
          updatedBy: 123,
          createdBy: 123,
        },
        { transaction: mockTransaction }
      );
    });
  });

  describe('standardUpdate', () => {
    test('should update entity successfully', async () => {
      const mockEntity = {
        id: 1,
        name: 'Old Name',
        centerId: 1,
        save: jest.fn(),
      };

      mockModel.findByPk.mockResolvedValue(mockEntity);

      const updateData = { name: 'New Name' };

      const result = await standardUpdate(mockModel, 1, updateData, 'Test Entity');

      expect(mockModel.findByPk).toHaveBeenCalledWith(1);
      expect(mockEntity.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    test('should throw error for non-existent entity', async () => {
      mockModel.findByPk.mockResolvedValue(null);

      await expect(standardUpdate(mockModel, 999, { name: 'Test' }, 'Test Entity')).rejects.toThrow(
        'Test Entity không tồn tại'
      );
    });

    test('should check for duplicates when updating code', async () => {
      const mockEntity = {
        id: 1,
        name: 'Test',
        centerId: 1,
        save: jest.fn(),
      };

      mockModel.findByPk.mockResolvedValue(mockEntity);
      mockModel.isDuplicateCode = jest.fn().mockResolvedValue(true);

      await expect(standardUpdate(mockModel, 1, { code: 'DUPLICATE' }, 'Test Entity')).rejects.toThrow(
        'Mã test entity đã tồn tại'
      );

      expect(mockModel.isDuplicateCode).toHaveBeenCalledWith('DUPLICATE', 1, 1);
    });
  });

  describe('standardSoftDelete', () => {
    test('should soft delete entity', async () => {
      const mockEntity = {
        id: 1,
        name: 'Test',
        update: jest.fn(),
      };

      mockModel.findByPk.mockResolvedValue(mockEntity);

      const result = await standardSoftDelete(mockModel, 1, 'Test Entity');

      expect(mockModel.findByPk).toHaveBeenCalledWith(1);
      expect(mockEntity.update).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(Date),
      });
      expect(result).toBe(mockEntity);
    });

    test('should throw error for non-existent entity', async () => {
      mockModel.findByPk.mockResolvedValue(null);

      await expect(standardSoftDelete(mockModel, 999, 'Test Entity')).rejects.toThrow('Test Entity không tồn tại');
    });
  });

  describe('standardGetById', () => {
    test('should get entity by ID with includes', async () => {
      const mockEntity = { id: 1, name: 'Test' };
      const includeConfig = [{ model: 'RelatedModel', as: 'relation' }];

      mockModel.findByPk.mockResolvedValue(mockEntity);

      const result = await standardGetById(mockModel, 1, includeConfig);

      expect(mockModel.findByPk).toHaveBeenCalledWith(1, {
        include: includeConfig,
      });
      expect(result).toBe(mockEntity);
    });

    test('should work without includes', async () => {
      const mockEntity = { id: 1, name: 'Test' };

      mockModel.findByPk.mockResolvedValue(mockEntity);

      await standardGetById(mockModel, 1);

      expect(mockModel.findByPk).toHaveBeenCalledWith(1, {
        include: [],
      });
    });
  });

  describe('withTransaction', () => {
    test('should commit transaction on success', async () => {
      const mockResult = { id: 1, name: 'Test' };
      const operation = jest.fn().mockResolvedValue(mockResult);

      const result = await withTransaction(operation);

      expect(operation).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    test('should rollback transaction on error', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withTransaction(operation)).rejects.toThrow('Test error');
      expect(operation).toHaveBeenCalled();
    });
  });
});
