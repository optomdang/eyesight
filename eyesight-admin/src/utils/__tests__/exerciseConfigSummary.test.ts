import { describe, it, expect } from 'vitest';
import { buildExerciseConfigSummary } from '../exerciseConfigSummary';

describe('buildExerciseConfigSummary', () => {
  it('builds far-vision anaglyph summary matching the requested phrasing', () => {
    const summary = buildExerciseConfigSummary({
      visionType: 'far',
      distance: 3,
      frequency: 'daily',
      executionCount: 2,
      duration: 5,
      colorScheme: { preset: 'redBlue' },
    });

    expect(summary).toContain('Nhìn xa');
    expect(summary).toContain('khoảng cách tập 3m');
    expect(summary).toContain('hằng ngày');
    expect(summary).toContain('2 lần tập');
    expect(summary).toContain('mỗi lần 5 phút');
    expect(summary).toContain('thị lực nhìn xa');
    expect(summary).toContain('kính đỏ - xanh dương');
    expect(summary).toContain('cần sử dụng');
  });

  it('includes exercise name when provided', () => {
    const summary = buildExerciseConfigSummary({
      visionType: 'near',
      distance: 0.4,
      frequency: 'weekly',
      executionCount: 1,
      duration: 10,
      colorScheme: 'whiteBlack',
      exerciseName: 'Phi hành gia thị giác',
    });
    expect(summary).toContain('Phi hành gia thị giác');
    expect(summary).toContain('Nhìn gần');
    expect(summary).toContain('hằng tuần');
    expect(summary).toContain('bảng màu trắng - đen tiêu chuẩn');
  });

  it('does not say glasses are needed for whiteBlack scheme', () => {
    const summary = buildExerciseConfigSummary({
      visionType: 'far',
      distance: 3,
      frequency: 'daily',
      executionCount: 1,
      duration: 5,
      colorScheme: { preset: 'whiteBlack' },
    });
    expect(summary).not.toContain('cần sử dụng kính');
    expect(summary).toContain('sử dụng bảng màu trắng - đen');
  });

  it('handles redGreen preset', () => {
    const summary = buildExerciseConfigSummary({
      visionType: 'contrast',
      distance: 1,
      frequency: 'monthly',
      executionCount: 3,
      duration: 8,
      colorScheme: { preset: 'redGreen' },
    });
    expect(summary).toContain('độ nhạy tương phản');
    expect(summary).toContain('kính đỏ - xanh lá');
  });

  it('omits missing schedule parts gracefully', () => {
    const summary = buildExerciseConfigSummary({
      visionType: 'far',
      distance: null,
      frequency: null,
      executionCount: null,
      duration: null,
      colorScheme: null,
    });
    expect(summary).toContain('Chế độ tập luyện "Nhìn xa"');
    expect(summary).not.toContain('khoảng cách');
    expect(summary).not.toContain('Bạn cần tập');
  });

  it('includes difficulty baseline phrasing for current_exam', () => {
    const summary = buildExerciseConfigSummary({
      visionType: 'far',
      distance: 3,
      frequency: 'daily',
      executionCount: 1,
      duration: 5,
      colorScheme: { preset: 'whiteBlack' },
      difficultyBaselineSource: 'current_exam',
    });
    expect(summary).toContain('mức thị lực hiện tại');
  });

  it('includes difficulty baseline phrasing for latest_achieved', () => {
    const summary = buildExerciseConfigSummary({
      visionType: 'near',
      distance: 0.4,
      frequency: 'daily',
      executionCount: 2,
      duration: 10,
      colorScheme: { preset: 'whiteBlack' },
      difficultyBaselineSource: 'latest_achieved',
    });
    expect(summary).toContain('cấp độ cao nhất đã đạt');
  });
});
