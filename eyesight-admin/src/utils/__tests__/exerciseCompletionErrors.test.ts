import { describe, it, expect } from 'vitest';
import { isExerciseSlotEndedError } from '../exerciseCompletionErrors';

function apiError(status: number, message: string) {
  return { response: { status, data: { message } } };
}

describe('isExerciseSlotEndedError', () => {
  it('detects a result that the server already completed', () => {
    expect(isExerciseSlotEndedError(apiError(400, 'Bài tập đã được hoàn thành trước đó'))).toBe(
      true
    );
  });

  it('detects a result that can no longer be paused', () => {
    expect(
      isExerciseSlotEndedError(apiError(400, 'Chỉ có thể tạm dừng bài tập đang thực hiện'))
    ).toBe(true);
  });

  it('detects a missing result', () => {
    expect(isExerciseSlotEndedError(apiError(404, 'Kết quả bài tập không tồn tại'))).toBe(true);
  });

  it('ignores transient failures so they stay retryable', () => {
    expect(isExerciseSlotEndedError(apiError(500, 'Internal error'))).toBe(false);
    expect(isExerciseSlotEndedError(apiError(400, 'Dữ liệu không hợp lệ'))).toBe(false);
    expect(isExerciseSlotEndedError(new Error('Network Error'))).toBe(false);
    expect(isExerciseSlotEndedError(undefined)).toBe(false);
  });
});
