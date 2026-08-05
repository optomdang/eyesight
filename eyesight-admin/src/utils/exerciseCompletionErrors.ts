/**
 * Detect server responses meaning "this exercise slot is already closed".
 *
 * The backend rejects both complete and pause once a result leaves the
 * 'incomplete' state, so retrying can never succeed. The portal must treat those
 * responses as terminal and let the patient leave instead of retrying forever.
 */

const SLOT_ENDED_MESSAGES = [
  'đã được hoàn thành trước đó',
  'Chỉ có thể tạm dừng bài tập đang thực hiện',
  'Kết quả bài tập không tồn tại',
];

function readErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: unknown } } })?.response;
  const message = response?.data?.message;
  return typeof message === 'string' ? message : '';
}

function readErrorStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  return typeof status === 'number' ? status : null;
}

export function isExerciseSlotEndedError(error: unknown): boolean {
  const status = readErrorStatus(error);
  if (status !== 400 && status !== 404) return false;

  const message = readErrorMessage(error);
  return SLOT_ENDED_MESSAGES.some((known) => message.includes(known));
}
