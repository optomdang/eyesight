import {
  resolveExerciseAssignmentVisionLevel,
  type ExerciseAssignmentVisionParams,
  type ExerciseExamResults,
} from 'src/utils/visionUtils';
import { getMyPatientInfo } from 'src/services/patient.service';

export const EXERCISE_VISION_LEVEL_REQUIRED_MESSAGE =
  'Không thể xác định kích thước bài tập vì chưa có kết quả kiểm tra thị lực phù hợp với loại bài tập này.';

export const EXERCISE_VISION_LEVEL_REQUIRED_GUIDANCE =
  'Vui lòng hoàn thành bài kiểm tra thị lực tương ứng trước (mục Kiểm tra thị lực), hoặc yêu cầu bác sĩ bật "Chỉ định cấp độ thực hiện" và chọn mức thị lực trong thiết lập bài tập.';

export const hasExerciseVisionLevel = (params: ExerciseAssignmentVisionParams): boolean =>
  resolveExerciseAssignmentVisionLevel(params) !== null;

/** Luôn đọc examResults mới nhất từ API — tránh state auth cũ sau khi hoàn thành bài test. */
export const fetchFreshPatientExamResults = async (): Promise<ExerciseExamResults | null | undefined> => {
  const info = await getMyPatientInfo();
  return info?.examResults;
};
