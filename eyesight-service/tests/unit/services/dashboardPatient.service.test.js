const { sequelize } = require('../../../src/config/db');
const { getPatientCorrelation } = require('../../../src/services/dashboard/dashboardPatient.service');

describe('Dashboard Patient Correlation Service', () => {
  let queryMock;

  beforeEach(() => {
    queryMock = jest.spyOn(sequelize, 'query');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPatientCorrelation', () => {
    it("should filter status = 'completed' in training query", async () => {
      const mockData = [
        {
          date: '2026-01-01',
          trainingTime: 2.5,
          visionLevel: 14,
        },
        {
          date: '2026-01-02',
          trainingTime: 3.0,
          visionLevel: 14.5,
        },
      ];

      queryMock.mockResolvedValue(mockData);

      await getPatientCorrelation(1, 'far', 30);

      // Verify query
      const query = queryMock.mock.calls[0][0];
      const { replacements } = queryMock.mock.calls[0][1];

      // Critical: Should filter completed executions (no pass/fail anymore)
      expect(query).toContain('status');
      expect(query).toContain("status\" = 'completed'");
      expect(query).not.toContain("'passed'");

      // Verify replacements
      expect(replacements).toHaveProperty('centerId', 1);
      expect(replacements).toHaveProperty('visionType', 'far');
    });

    it('should return correlation data with statistics', async () => {
      const mockData = [
        { date: '2026-01-01', trainingTime: '2.5', visionLevel: '14' },
        { date: '2026-01-02', trainingTime: '3.0', visionLevel: '15' },
      ];

      queryMock.mockResolvedValue(mockData);

      const result = await getPatientCorrelation(1, 'far', 7);

      // Check structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('statistics');

      // Check data array
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('date');
      expect(result.data[0]).toHaveProperty('trainingTime');
      expect(result.data[0]).toHaveProperty('visionLevel');

      // Check statistics
      expect(result.statistics).toHaveProperty('totalTrainingHours');
      expect(result.statistics).toHaveProperty('avgDailyTrainingTime');
      expect(result.statistics).toHaveProperty('avgVisionLevel');
      expect(result.statistics).toHaveProperty('visionImprovement');
      expect(result.statistics).toHaveProperty('correlationScore');
    });

    it('should generate date series using recursive CTE', async () => {
      queryMock.mockResolvedValue([]);

      await getPatientCorrelation(1, 'far', 30);

      const query = queryMock.mock.calls[0][0];

      // Check for recursive CTE
      expect(query).toContain('WITH RECURSIVE date_series');
      expect(query).toContain('UNION ALL');
      expect(query).toContain("INTERVAL '1 day'");
    });

    it('should forward-fill vision level data', async () => {
      queryMock.mockResolvedValue([]);

      await getPatientCorrelation(1, 'far', 30);

      const query = queryMock.mock.calls[0][0];

      // Check for forward fill logic
      expect(query).toContain('vision_forward_fill');
      expect(query).toContain('SELECT vbd2.avg_vision_level');
      expect(query).toContain('ORDER BY vbd2.date DESC');
    });

    it('should calculate Pearson correlation coefficient', async () => {
      const mockData = [
        { date: '2026-01-01', trainingTime: '2.5', visionLevel: '14' },
        { date: '2026-01-02', trainingTime: '3.0', visionLevel: '15' },
        { date: '2026-01-03', trainingTime: '2.0', visionLevel: '14.5' },
      ];

      queryMock.mockResolvedValue(mockData);

      const result = await getPatientCorrelation(1, 'far', 3);

      // Correlation score should be between -1 and 1
      expect(result.statistics.correlationScore).toBeGreaterThanOrEqual(-1);
      expect(result.statistics.correlationScore).toBeLessThanOrEqual(1);
    });

    it('should filter by centerId for multi-tenant security', async () => {
      queryMock.mockResolvedValue([]);

      await getPatientCorrelation(456, 'near', 30);

      const query = queryMock.mock.calls[0][0];
      const { replacements } = queryMock.mock.calls[0][1];

      // Verify both ExerciseResults and ExamResults have centerId filter
      const centerIdMatches = query.match(/centerId/g);
      expect(centerIdMatches.length).toBeGreaterThanOrEqual(2); // At least 2 occurrences

      expect(replacements.centerId).toBe(456);
    });

    it('should support different vision types', async () => {
      queryMock.mockResolvedValue([]);

      const visionTypes = ['far', 'near', 'contrast', 'stereopsis'];

      for (const visionType of visionTypes) {
        queryMock.mockClear();

        // eslint-disable-next-line no-await-in-loop
        await getPatientCorrelation(1, visionType, 30);

        const query = queryMock.mock.calls[0][0];
        const { replacements } = queryMock.mock.calls[0][1];

        expect(query).toContain('examType');
        expect(replacements.visionType).toBe(visionType);
      }
    });

    it('should support different time ranges', async () => {
      queryMock.mockResolvedValue([]);

      const timeRanges = [7, 30, 90, 365];

      for (const days of timeRanges) {
        queryMock.mockClear();

        // eslint-disable-next-line no-await-in-loop
        await getPatientCorrelation(1, 'far', days);

        const { replacements } = queryMock.mock.calls[0][1];

        // Verify date range calculation
        expect(replacements).toHaveProperty('startDate');
        expect(replacements).toHaveProperty('endDate');

        const startDate = new Date(replacements.startDate);
        const endDate = new Date(replacements.endDate);
        const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

        expect(daysDiff).toBeCloseTo(days, 1); // Allow 1 day tolerance
      }
    });

    it('should handle null vision levels gracefully', async () => {
      const mockData = [
        { date: '2026-01-01', trainingTime: '2.5', visionLevel: null },
        { date: '2026-01-02', trainingTime: '3.0', visionLevel: '14' },
      ];

      queryMock.mockResolvedValue(mockData);

      const result = await getPatientCorrelation(1, 'far', 2);

      expect(result.data[0].visionLevel).toBeNull();
      expect(result.data[1].visionLevel).toBe(14);
    });

    it('should calculate vision improvement correctly', async () => {
      const mockData = [
        { date: '2026-01-01', trainingTime: '2.5', visionLevel: '10' },
        { date: '2026-01-07', trainingTime: '3.0', visionLevel: '15' },
      ];

      queryMock.mockResolvedValue(mockData);

      const result = await getPatientCorrelation(1, 'far', 7);

      // Vision improvement = last - first
      expect(result.statistics.visionImprovement).toBe(5);
    });
  });
});
