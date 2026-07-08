import { describe, it, expect } from 'vitest';
import { exerciseConfigSchema } from '../schemas/exercise';

const basePayload = {
  name: 'Cấu hình test',
  exerciseId: 1,
  configType: 'doctor',
  eye: 'left',
  distance: 3,
  duration: 30,
  frequency: 'daily',
  executionCount: 1,
  visionType: 'far',
};

describe('exerciseConfigSchema - eye + visionType', () => {
  it("chấp nhận eye='both' cho far/near/contrast", async () => {
    for (const visionType of ['far', 'near', 'contrast']) {
      await expect(
        exerciseConfigSchema.validate({ ...basePayload, eye: 'both', visionType })
      ).resolves.toBeTruthy();
    }
  });

  it("vẫn chấp nhận eye='left' và 'right'", async () => {
    await expect(
      exerciseConfigSchema.validate({ ...basePayload, eye: 'left' })
    ).resolves.toBeTruthy();
    await expect(
      exerciseConfigSchema.validate({ ...basePayload, eye: 'right' })
    ).resolves.toBeTruthy();
  });

  it('từ chối eye không hợp lệ', async () => {
    await expect(
      exerciseConfigSchema.validate({ ...basePayload, eye: 'middle' })
    ).rejects.toThrow();
  });

  it('eye là bắt buộc', async () => {
    const { eye: _omit, ...withoutEye } = basePayload;
    await expect(exerciseConfigSchema.validate(withoutEye)).rejects.toThrow();
  });

  it('yêu cầu visionLevel khi bật levelOverride', async () => {
    await expect(
      exerciseConfigSchema.validate({ ...basePayload, levelOverride: true, visionLevel: null })
    ).rejects.toThrow(/bắt buộc khi bật ghi đè/i);

    await expect(
      exerciseConfigSchema.validate({ ...basePayload, levelOverride: true, visionLevel: 14 })
    ).resolves.toBeTruthy();
  });

  it('từ chối visionLevel khi tắt levelOverride', async () => {
    await expect(
      exerciseConfigSchema.validate({ ...basePayload, levelOverride: false, visionLevel: 14 })
    ).rejects.toThrow(/không bật ghi đè/i);
  });
});
