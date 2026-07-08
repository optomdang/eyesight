/**
 * VT Quest — Vietnamese narrative copy for child-facing UI.
 * All text shown to patients; keeps clinical jargon out of the game.
 */

export const COPY = {
  // Onboarding
  title: 'Phi hành gia thị giác',
  subtitle: 'Chinh phục vũ trụ bằng đôi mắt!',
  startButton: 'Bắt đầu hành trình!',

  // World map
  chooseWorld: 'Chọn hành tinh để chinh phục',
  worldLocked: 'Hoàn thành thêm nhiệm vụ để mở khoá!',

  // Stage intro
  getReady: 'Sẵn sàng chưa?',
  stageIntro: (stageNum: number) => `Nhiệm vụ ${stageNum}`,
  bossStageWarning: '⚡ Nhiệm vụ đặc biệt! Chuẩn bị tốt nhé!',

  // Trial instructions
  instructGabor: 'Nhìn vào màn hình — ánh sáng xuất hiện bên nào?',
  instructVernierDefault: 'Đường thẳng nào bị lệch?',
  instructVernierDirection: 'Hai đoạn thẳng lệch theo hướng nào?',
  instructVernierGreater: 'Bên nào lệch nhiều hơn?',
  instructVernierOdd: 'Cặp nào có hướng lệch khác với các cặp còn lại?',
  instructVernierMemorize: 'Ghi nhớ hướng lệch nhé…',
  instructVernierRecall: 'Hình vừa rồi lệch theo hướng nào?',
  vernierOffsetLeft: 'Lệch trái',
  vernierOffsetRight: 'Lệch phải',
  instructCrowding: 'Chữ đặc biệt đang ẩn ở đâu?',
  instructCrowdingCentral: 'Chữ nào ở giữa nhóm chữ?',
  instructCrowdingMatch: 'Bên nào có chữ giữa giống chữ mẫu phía trên?',
  instructCrowdingOdd: 'Cụm nào có chữ giữa khác với các cụm còn lại?',
  instructCrowdingMemorize: 'Ghi nhớ chữ ở giữa nhé…',
  instructCrowdingRecall: 'Chữ ở giữa vừa rồi là chữ nào?',
  instructCrowdingSameDifferent: 'Chữ giữa có giống hai chữ bên cạnh không?',
  instructStereopsisShape: 'Hình nổi bạn nhìn thấy là hình gì?',
  instructStereopsisFloat: 'Ô nào có hình nổi ra phía trước?',
  instructStereopsisDigit: 'Chữ số nổi bạn nhìn thấy là số mấy?',
  stereopsisGlassesNote: 'Đeo kính đỏ/xanh (anaglyph) trước khi bắt đầu.',
  crowdingSameLabel: 'Giống nhau',
  crowdingDifferentLabel: 'Khác nhau',
  instructGaborOrientation: 'Các sọc trong hình nghiêng theo hướng nào?',
  instructGaborMatch: 'Chọn 2 thẻ có sọc cùng hướng!',
  instructGaborOdd: 'Thẻ nào có sọc khác hướng với các thẻ còn lại?',
  instructGaborSf: 'Bên nào có sọc to (dày) hơn?',
  instructGaborMemorize: 'Ghi nhớ hướng sọc này nhé…',
  instructGaborRecall: 'Hình vừa rồi có sọc theo hướng nào?',
  confirmSelection: 'Xác nhận',
  tapLeft: 'Bên trái',
  tapRight: 'Bên phải',

  // Feedback (not shown per clinical rules — used only for animation label)
  comboLabel: (n: number) => `Siêu năng lượng x${n}!`,
  streakBonusLabel: (n: number, bonus: number) => `Chuỗi ${n}! +${bonus} thưởng`,
  streakMilestoneHud: (n: number) => `Chuỗi ${n} liên tiếp! 🔥`,
  pointsPopup: (n: number) => `+${n}`,
  encourageAfterWrong: 'Thử lại nào! 💪',
  encourageCorrect: 'Chính xác! ✨',
  trialEasedHint: 'Đã đổi câu hỏi dễ hơn',

  // Stage result
  stageComplete: 'Nhiệm vụ hoàn thành!',
  starsEarned: (n: number) => `${n} ⭐`,
  coinsEarned: (n: number) => `+${n} 🪙`,
  powerLabel: 'Năng lượng kính phi hành',

  // Session complete
  sessionComplete: 'Vũ trụ cảm ơn phi hành gia!',
  totalStars: (n: number) => `${n} ngôi sao đã thu thập`,
  totalCoins: (n: number) => `${n} xu chiến thắng`,
  keepGoing: 'Tiếp tục tập luyện để cải thiện thị lực!',
  exitToExercises: 'Về danh sách bài tập',

  // Pause / exit
  pauseTitle: 'Tạm nghỉ',
  pauseMessage: 'Nhiệm vụ sẽ được lưu lại. Tiếp tục sau nhé!',
  exitConfirm: 'Thoát và lưu tiến trình',
  continueButton: 'Tiếp tục',
  stopTrainingButton: 'Dừng tập',

  // Errors
  visionRequiredTitle: 'Cần đo thị lực trước',
  visionRequiredMessage: 'Bạn cần đo thị lực trước khi thực hiện bài tập này.',
  screenTooSmallTitle: 'Màn hình không đủ lớn',
  screenTooSmallMessage:
    'Không thể hiển thị đầy đủ nội dung bài tập trên màn hình hiện tại. Vui lòng dùng màn hình lớn hơn, xoay ngang thiết bị, hoặc bật chế độ toàn màn hình (F11).',
  screenTooSmallHint: (w: number, h: number) =>
    `Cần tối thiểu khoảng ${w}×${h} px cho vùng hiển thị nhiệm vụ.`,
};

export type CopyKey = keyof typeof COPY;
