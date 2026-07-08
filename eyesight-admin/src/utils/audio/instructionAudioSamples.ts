/**
 * Representative instruction texts from exam + VT Quest for voice preview.
 * Sources: copy.vi.ts, vi.json / en.json (exam.*), StereopsisStep fallbacks.
 */

export type AudioSampleLang = 'vi' | 'en';

export interface InstructionAudioSample {
  id: string;
  categoryId: string;
  label: Record<AudioSampleLang, string>;
  text: Record<AudioSampleLang, string>;
  /** Where this string lives in the product (for reviewers). */
  source: string;
}

export interface InstructionAudioCategory {
  id: string;
  label: Record<AudioSampleLang, string>;
}

export const INSTRUCTION_AUDIO_CATEGORIES: InstructionAudioCategory[] = [
  { id: 'exam_intro', label: { vi: 'Kiểm tra — Hướng dẫn', en: 'Exam — Instructions' } },
  { id: 'exam_stereopsis', label: { vi: 'Kiểm tra — Lập thể', en: 'Exam — Stereopsis' } },
  { id: 'exam_flow', label: { vi: 'Kiểm tra — Luồng làm bài', en: 'Exam — Flow' } },
  { id: 'vt_onboarding', label: { vi: 'VT Quest — Mở đầu', en: 'VT Quest — Onboarding' } },
  { id: 'vt_gabor', label: { vi: 'VT Quest — Gabor', en: 'VT Quest — Gabor' } },
  { id: 'vt_vernier', label: { vi: 'VT Quest — Vernier', en: 'VT Quest — Vernier' } },
  { id: 'vt_crowding', label: { vi: 'VT Quest — Crowding', en: 'VT Quest — Crowding' } },
  { id: 'vt_stereopsis', label: { vi: 'VT Quest — Chiều sâu', en: 'VT Quest — Stereopsis' } },
];

const VT_STAGE_INTRO_SAMPLES: InstructionAudioSample[] = Array.from({ length: 20 }, (_, index) => {
  const stageNum = index + 1;
  return {
    id: `vt_stage_${stageNum}`,
    categoryId: 'vt_onboarding',
    label: { vi: `Nhiệm vụ ${stageNum}`, en: `Mission ${stageNum}` },
    text: { vi: `Nhiệm vụ ${stageNum}`, en: `Mission ${stageNum}` },
    source: 'copy.vi.ts → stageIntro',
  };
});

const INSTRUCTION_AUDIO_SAMPLE_ENTRIES: InstructionAudioSample[] = [
  // --- Exam intro (far / near style) ---
  {
    id: 'exam_welcome_far',
    categoryId: 'exam_intro',
    label: { vi: 'Chào mừng (nhìn xa)', en: 'Welcome (far vision)' },
    text: {
      vi: 'Chào mừng Bạn đến với bài kiểm tra Nhìn xa. Bài kiểm tra này nhằm đánh giá và theo dõi tiến triển khả năng Nhìn xa của mắt trong quá trình điều trị.',
      en: 'Welcome You to the Far Vision test. This test evaluates and tracks the progress of Far Vision of the eyes over the treatment.',
    },
    source: 'InstructionStep.tsx + exam.* i18n',
  },
  {
    id: 'exam_welcome_near',
    categoryId: 'exam_intro',
    label: { vi: 'Chào mừng (nhìn gần)', en: 'Welcome (near vision)' },
    text: {
      vi: 'Chào mừng Bạn đến với bài kiểm tra Nhìn gần. Bài kiểm tra này nhằm đánh giá và theo dõi tiến triển khả năng Nhìn gần của mắt trong quá trình điều trị.',
      en: 'Welcome You to the Near Vision test. This test evaluates and tracks the progress of Near Vision of the eyes over the treatment.',
    },
    source: 'InstructionStep.tsx + exam.* i18n',
  },
  {
    id: 'exam_welcome_contrast',
    categoryId: 'exam_intro',
    label: { vi: 'Chào mừng (tương phản)', en: 'Welcome (contrast)' },
    text: {
      vi: 'Chào mừng Bạn đến với bài kiểm tra Tương phản. Bài kiểm tra này nhằm đánh giá và theo dõi tiến triển khả năng Tương phản của mắt trong quá trình điều trị.',
      en: 'Welcome You to the Contrast test. This test evaluates and tracks the progress of Contrast sensitivity of the eyes over the treatment.',
    },
    source: 'InstructionStep.tsx + exam.* i18n',
  },
  {
    id: 'exam_welcome_stereopsis',
    categoryId: 'exam_intro',
    label: { vi: 'Chào mừng (lập thể)', en: 'Welcome (stereopsis)' },
    text: {
      vi: 'Chào mừng Bạn đến với bài kiểm tra Lập thể. Bài kiểm tra này nhằm đánh giá và theo dõi tiến triển khả năng Lập thể của mắt trong quá trình điều trị.',
      en: 'Welcome You to the Stereopsis test. This test evaluates and tracks stereopsis progress of the eyes over the treatment.',
    },
    source: 'InstructionStep.tsx + exam.* i18n',
  },
  {
    id: 'exam_glasses_cover',
    categoryId: 'exam_intro',
    label: { vi: 'Đeo kính & che mắt', en: 'Glasses & eye cover' },
    text: {
      vi: 'Nếu Bạn có đeo kính, hãy đeo kính vào nhé. Chúng ta luôn luôn kiểm tra mắt phải trước, hãy che mắt trái lại.',
      en: 'If You wear glasses, please put them on. We always test the right eye first — please cover the left eye.',
    },
    source: 'InstructionStep.tsx',
  },
  {
    id: 'exam_choose_direction',
    categoryId: 'exam_intro',
    label: { vi: 'Chọn hướng / điền ký tự', en: 'Direction / fill characters' },
    text: {
      vi: 'Người hỗ trợ chọn hướng Lên, Xuống, Trái, Phải tương ứng với hướng bị khuyết của chữ E và C, hoặc điền chữ cái hoặc số vào các ô trống tương ứng.',
      en: 'The supporter chooses direction Up, Down, Left, Right corresponding to the gap in E and C letters, or fills letters or numbers into the matching blanks.',
    },
    source: 'InstructionStep.tsx',
  },
  {
    id: 'exam_no_hints',
    categoryId: 'exam_intro',
    label: { vi: 'Không gợi ý', en: 'No hints' },
    text: {
      vi: 'Không nhắc/gợi ý; nếu không đoán được, bỏ qua và nhấn xác nhận. Không nhắc/gợi ý bằng bất cứ hình thức nào (ví dụ: "Chữ gì mẹ mới nói nhỉ?", "Chữ gì hình tròn nhỉ?", ...).',
      en: 'No hints; if you cannot guess, skip and press confirm. No hints in any form (e.g., "What letter did mom just say?", "Which one is round?", ...).',
    },
    source: 'InstructionStep.tsx → exam.noHints, noHintsAny',
  },
  {
    id: 'exam_no_squint',
    categoryId: 'exam_intro',
    label: { vi: 'Không nheo mắt', en: 'No squinting' },
    text: {
      vi: 'Được phép cố gắng đoán nhưng không được nheo mắt, người hỗ trợ cần quan sát trẻ để đảm bảo tính chính xác.',
      en: 'Guessing is allowed but do not squint; the supporter should observe the child to ensure accuracy.',
    },
    source: 'InstructionStep.tsx → exam.allowGuess, doNotSquint, observer',
  },
  {
    id: 'exam_compromised_recheck',
    categoryId: 'exam_intro',
    label: { vi: 'Kiểm tra lại cấp độ', en: 'Recheck compromised level' },
    text: {
      vi: 'Nếu dòng thị lực đã bị lộ do trẻ không trung thực (ví dụ: mở che mắt, nheo mắt, rướn người lên phía trước ...) hoặc bạn cảm thấy không tin tưởng về tính chính xác thì hãy kiểm tra lại cấp độ đó. Chỉ nên xáo trộn ký tự và kiểm tra lại khi thực sự thấy kết quả không đáng tin cậy.',
      en: 'If an acuity line was exposed due to dishonesty (e.g., opening the cover, squinting, leaning forward) or you doubt accuracy, recheck that level. Only shuffle characters and recheck when the result seems unreliable.',
    },
    source: 'InstructionStep.tsx → exam.ifCompromised, recheckLevel, shuffleIfNeeded',
  },
  {
    id: 'exam_cherry_pick',
    categoryId: 'exam_intro',
    label: { vi: 'Không chọn lọc ký tự', en: 'No cherry-picking' },
    text: {
      vi: 'Đừng cố gắng lựa chọn các ký tự bạn cho là tốt và cố gắng thử nhiều lần để đạt kết quả cao. Hãy để phần mềm lựa chọn ngẫu nhiên để đảm bảo khách quan vì chúng tôi đã có tính toán và phân tích, sự lựa chọn hay cố gắng can thiệp sẽ ảnh hưởng tới kết quả phân tích dẫn tới sụt giảm hiệu quả điều trị.',
      en: "Don't cherry-pick characters you think are easy and retry many times for a high score. Let the software pick randomly for objectivity — interfering affects analysis and reduces treatment effectiveness.",
    },
    source: 'InstructionStep.tsx → exam.doNotCherryPick, randomPick, affectResult',
  },
  {
    id: 'exam_lighting',
    categoryId: 'exam_intro',
    label: { vi: 'Ánh sáng phòng', en: 'Room lighting' },
    text: {
      vi: 'Không cần bật đèn phòng quá sáng hay mở cửa để tăng độ sáng. Màn hình điện tử đã có độ tương phản tốt, việc tăng thêm độ sáng có thể làm giảm tính chính xác của kết quả.',
      en: 'No need to brighten the room or open curtains for extra light. The screen already has good contrast; extra brightness may reduce accuracy.',
    },
    source: 'InstructionStep.tsx → exam.noExtraLight, screensHaveContrast, moreLightLessAccurate',
  },
  {
    id: 'exam_start',
    categoryId: 'exam_intro',
    label: { vi: 'Bắt đầu kiểm tra', en: 'Start test' },
    text: {
      vi: 'Bắt đầu kiểm tra',
      en: 'Start the test',
    },
    source: 'exam.start',
  },

  // --- Exam stereopsis ---
  {
    id: 'exam_stereo_glasses',
    categoryId: 'exam_stereopsis',
    label: { vi: 'Đeo kính (lập thể)', en: 'Glasses (stereopsis)' },
    text: {
      vi: 'Nếu Bạn có đeo kính, hãy đeo kính vào nhé. Với bài kiểm tra lập thể, hãy mở cả hai mắt và đeo kính đỏ-xanh (anaglyph) chồng lên kính đang sử dụng nếu có.',
      en: 'If You wear glasses, please put them on. For the stereopsis test, keep both eyes open and wear red-cyan anaglyph glasses over your current glasses if needed.',
    },
    source: 'InstructionStep.tsx → exam.putOnGlasses, stereopsisGlassesNote',
  },
  {
    id: 'exam_stereo_supporter',
    categoryId: 'exam_stereopsis',
    label: { vi: 'Hướng dẫn người hỗ trợ', en: 'Supporter guidance' },
    text: {
      vi: 'Người hỗ trợ hỏi bạn hình hoặc số nào nổi lên khỏi nền, chọn hình hoặc điền số ở thanh dưới rồi bấm Xác nhận. Đúng sẽ tự sang bước tiếp; sai thì bài dừng.',
      en: 'The supporter asks which shape or digit pops out from the background; select the shape or enter the digit below and press Confirm. Correct answers advance automatically; a wrong answer ends the test.',
    },
    source: 'InstructionStep.tsx → exam.stereopsisDirectionNote',
  },
  {
    id: 'exam_stereo_q_shape',
    categoryId: 'exam_stereopsis',
    label: { vi: 'Câu hỏi — hình đơn', en: 'Question — single shape' },
    text: {
      vi: 'Hình nào nổi lên khỏi nền?',
      en: 'Which shape pops out from the background?',
    },
    source: 'StereopsisStep.tsx → exam.stereopsisQShape',
  },
  {
    id: 'exam_stereo_q_row',
    categoryId: 'exam_stereopsis',
    label: { vi: 'Câu hỏi — hàng 5 ô', en: 'Question — 5 panels' },
    text: {
      vi: 'Trong 5 ô, hình nào nổi lên? Chọn hình bạn thấy.',
      en: 'Among 5 panels, which shape pops out? Choose the shape you see.',
    },
    source: 'StereopsisStep.tsx → exam.stereopsisQRow',
  },
  {
    id: 'exam_stereo_q_digit',
    categoryId: 'exam_stereopsis',
    label: { vi: 'Câu hỏi — chữ số', en: 'Question — digit' },
    text: {
      vi: 'Số nào nổi lên bên trong vòng tròn?',
      en: 'Which digit pops out inside the circle?',
    },
    source: 'StereopsisStep.tsx → exam.stereopsisQDigit',
  },

  // --- Exam flow ---
  {
    id: 'exam_switch_eye',
    categoryId: 'exam_flow',
    label: { vi: 'Chuyển sang mắt trái', en: 'Switch to left eye' },
    text: {
      vi: 'Chuẩn bị chuyển sang kiểm tra mắt trái. Bạn đã hoàn tất bài kiểm tra mắt phải. Hãy đổi che mắt sang bên mắt phải để thực hiện kiểm tra với mắt trái.',
      en: 'Get ready to switch to the left eye test. You have completed the right eye test. Please switch the cover to the right eye to proceed with the left eye test.',
    },
    source: 'exam.switchEye',
  },

  // --- VT onboarding ---
  {
    id: 'vt_choose_world',
    categoryId: 'vt_onboarding',
    label: { vi: 'Chọn hành tinh', en: 'Choose world' },
    text: {
      vi: 'Chọn hành tinh để chinh phục',
      en: 'Choose a planet to conquer',
    },
    source: 'copy.vi.ts → chooseWorld',
  },
  {
    id: 'vt_start',
    categoryId: 'vt_onboarding',
    label: { vi: 'Nút bắt đầu', en: 'Start button' },
    text: {
      vi: 'Bắt đầu hành trình!',
      en: 'Start the journey!',
    },
    source: 'copy.vi.ts → startButton',
  },
  {
    id: 'vt_boss',
    categoryId: 'vt_onboarding',
    label: { vi: 'Nhiệm vụ boss', en: 'Boss stage' },
    text: {
      vi: 'Nhiệm vụ đặc biệt! Chuẩn bị tốt nhé!',
      en: 'Special mission! Get ready!',
    },
    source: 'copy.vi.ts → bossStageWarning',
  },

  // --- VT Gabor ---
  {
    id: 'vt_gabor_default',
    categoryId: 'vt_gabor',
    label: { vi: 'Gabor — mặc định', en: 'Gabor — default' },
    text: {
      vi: 'Nhìn vào màn hình — ánh sáng xuất hiện bên nào?',
      en: 'Look at the screen — which side does the light appear on?',
    },
    source: 'copy.vi.ts → instructGabor',
  },
  {
    id: 'vt_gabor_orientation',
    categoryId: 'vt_gabor',
    label: { vi: 'Gabor — hướng sọc', en: 'Gabor — stripe orientation' },
    text: {
      vi: 'Các sọc trong hình nghiêng theo hướng nào?',
      en: 'Which direction do the stripes tilt?',
    },
    source: 'copy.vi.ts → instructGaborOrientation',
  },
  {
    id: 'vt_gabor_match',
    categoryId: 'vt_gabor',
    label: { vi: 'Gabor — ghép cặp', en: 'Gabor — match pair' },
    text: {
      vi: 'Chọn 2 thẻ có sọc cùng hướng!',
      en: 'Pick 2 cards with stripes in the same direction!',
    },
    source: 'copy.vi.ts → instructGaborMatch',
  },
  {
    id: 'vt_gabor_odd',
    categoryId: 'vt_gabor',
    label: { vi: 'Gabor — khác hướng', en: 'Gabor — odd orientation' },
    text: {
      vi: 'Thẻ nào có sọc khác hướng với các thẻ còn lại?',
      en: 'Which card has stripes in a different direction from the others?',
    },
    source: 'copy.vi.ts → instructGaborOdd',
  },
  {
    id: 'vt_gabor_sf',
    categoryId: 'vt_gabor',
    label: { vi: 'Gabor — độ dày sọc', en: 'Gabor — stripe thickness' },
    text: {
      vi: 'Bên nào có sọc to (dày) hơn?',
      en: 'Which side has thicker stripes?',
    },
    source: 'copy.vi.ts → instructGaborSf',
  },
  {
    id: 'vt_gabor_memorize',
    categoryId: 'vt_gabor',
    label: { vi: 'Gabor — ghi nhớ', en: 'Gabor — memorize' },
    text: {
      vi: 'Ghi nhớ hướng sọc này nhé…',
      en: 'Remember this stripe direction…',
    },
    source: 'copy.vi.ts → instructGaborMemorize',
  },
  {
    id: 'vt_gabor_recall',
    categoryId: 'vt_gabor',
    label: { vi: 'Gabor — nhớ lại', en: 'Gabor — recall' },
    text: {
      vi: 'Hình vừa rồi có sọc theo hướng nào?',
      en: 'Which direction were the stripes in the last image?',
    },
    source: 'copy.vi.ts → instructGaborRecall',
  },

  // --- VT Vernier ---
  {
    id: 'vt_vernier_default',
    categoryId: 'vt_vernier',
    label: { vi: 'Vernier — mặc định', en: 'Vernier — default' },
    text: {
      vi: 'Đường thẳng nào bị lệch?',
      en: 'Which line is misaligned?',
    },
    source: 'copy.vi.ts → instructVernierDefault',
  },
  {
    id: 'vt_vernier_direction',
    categoryId: 'vt_vernier',
    label: { vi: 'Vernier — hướng lệch', en: 'Vernier — offset direction' },
    text: {
      vi: 'Hai đoạn thẳng lệch theo hướng nào?',
      en: 'In which direction are the two segments offset?',
    },
    source: 'copy.vi.ts → instructVernierDirection',
  },
  {
    id: 'vt_vernier_greater',
    categoryId: 'vt_vernier',
    label: { vi: 'Vernier — lệch nhiều hơn', en: 'Vernier — greater offset' },
    text: {
      vi: 'Bên nào lệch nhiều hơn?',
      en: 'Which side is offset more?',
    },
    source: 'copy.vi.ts → instructVernierGreater',
  },
  {
    id: 'vt_vernier_odd',
    categoryId: 'vt_vernier',
    label: { vi: 'Vernier — cặp khác', en: 'Vernier — odd pair' },
    text: {
      vi: 'Cặp nào có hướng lệch khác với các cặp còn lại?',
      en: 'Which pair has a different offset direction from the others?',
    },
    source: 'copy.vi.ts → instructVernierOdd',
  },
  {
    id: 'vt_vernier_memorize',
    categoryId: 'vt_vernier',
    label: { vi: 'Vernier — ghi nhớ', en: 'Vernier — memorize' },
    text: {
      vi: 'Ghi nhớ hướng lệch nhé…',
      en: 'Remember the offset direction…',
    },
    source: 'copy.vi.ts → instructVernierMemorize',
  },
  {
    id: 'vt_vernier_recall',
    categoryId: 'vt_vernier',
    label: { vi: 'Vernier — nhớ lại', en: 'Vernier — recall' },
    text: {
      vi: 'Hình vừa rồi lệch theo hướng nào?',
      en: 'Which direction was the last image offset?',
    },
    source: 'copy.vi.ts → instructVernierRecall',
  },

  // --- VT Crowding ---
  {
    id: 'vt_crowding_default',
    categoryId: 'vt_crowding',
    label: { vi: 'Crowding — mặc định', en: 'Crowding — default' },
    text: {
      vi: 'Chữ đặc biệt đang ẩn ở đâu?',
      en: 'Where is the special letter hidden?',
    },
    source: 'copy.vi.ts → instructCrowding',
  },
  {
    id: 'vt_crowding_central',
    categoryId: 'vt_crowding',
    label: { vi: 'Crowding — chữ giữa', en: 'Crowding — central letter' },
    text: {
      vi: 'Chữ nào ở giữa nhóm chữ?',
      en: 'Which letter is in the middle of the group?',
    },
    source: 'copy.vi.ts → instructCrowdingCentral',
  },
  {
    id: 'vt_crowding_same_diff',
    categoryId: 'vt_crowding',
    label: { vi: 'Crowding — giống/khác', en: 'Crowding — same/different' },
    text: {
      vi: 'Chữ giữa có giống hai chữ bên cạnh không?',
      en: 'Is the middle letter the same as the two beside it?',
    },
    source: 'copy.vi.ts → instructCrowdingSameDifferent',
  },
  {
    id: 'vt_crowding_match',
    categoryId: 'vt_crowding',
    label: { vi: 'Crowding — ghép mẫu', en: 'Crowding — match sample' },
    text: {
      vi: 'Bên nào có chữ giữa giống chữ mẫu phía trên?',
      en: 'Which side has a middle letter matching the sample above?',
    },
    source: 'copy.vi.ts → instructCrowdingMatch',
  },
  {
    id: 'vt_crowding_odd',
    categoryId: 'vt_crowding',
    label: { vi: 'Crowding — cụm khác', en: 'Crowding — odd cluster' },
    text: {
      vi: 'Cụm nào có chữ giữa khác với các cụm còn lại?',
      en: 'Which cluster has a different middle letter from the others?',
    },
    source: 'copy.vi.ts → instructCrowdingOdd',
  },
  {
    id: 'vt_crowding_memorize',
    categoryId: 'vt_crowding',
    label: { vi: 'Crowding — ghi nhớ', en: 'Crowding — memorize' },
    text: {
      vi: 'Ghi nhớ chữ ở giữa nhé…',
      en: 'Remember the middle letter…',
    },
    source: 'copy.vi.ts → instructCrowdingMemorize',
  },
  {
    id: 'vt_crowding_recall',
    categoryId: 'vt_crowding',
    label: { vi: 'Crowding — nhớ lại', en: 'Crowding — recall' },
    text: {
      vi: 'Chữ ở giữa vừa rồi là chữ nào?',
      en: 'What was the middle letter just now?',
    },
    source: 'copy.vi.ts → instructCrowdingRecall',
  },

  // --- VT Stereopsis ---
  {
    id: 'vt_stereo_glasses',
    categoryId: 'vt_stereopsis',
    label: { vi: 'Lưu ý kính', en: 'Glasses note' },
    text: {
      vi: 'Đeo kính đỏ/xanh (anaglyph) trước khi bắt đầu.',
      en: 'Wear red/blue anaglyph glasses before starting.',
    },
    source: 'copy.vi.ts → stereopsisGlassesNote',
  },
  {
    id: 'vt_stereo_shape',
    categoryId: 'vt_stereopsis',
    label: { vi: 'Nhận diện hình', en: 'Shape identification' },
    text: {
      vi: 'Hình nổi bạn nhìn thấy là hình gì?',
      en: 'What shape do you see popping out?',
    },
    source: 'copy.vi.ts → instructStereopsisShape',
  },
  {
    id: 'vt_stereo_float',
    categoryId: 'vt_stereopsis',
    label: { vi: 'Vị trí hình nổi', en: 'Float position' },
    text: {
      vi: 'Ô nào có hình nổi ra phía trước?',
      en: 'Which panel has a shape popping toward you?',
    },
    source: 'copy.vi.ts → instructStereopsisFloat',
  },
  {
    id: 'vt_stereo_digit',
    categoryId: 'vt_stereopsis',
    label: { vi: 'Chữ số nổi', en: 'Floating digit' },
    text: {
      vi: 'Chữ số nổi bạn nhìn thấy là số mấy?',
      en: 'What floating digit do you see?',
    },
    source: 'copy.vi.ts → instructStereopsisDigit',
  },
];

export const INSTRUCTION_AUDIO_SAMPLES: InstructionAudioSample[] = [
  ...INSTRUCTION_AUDIO_SAMPLE_ENTRIES,
  ...VT_STAGE_INTRO_SAMPLES,
];

export function getSamplesByCategory(categoryId: string): InstructionAudioSample[] {
  return INSTRUCTION_AUDIO_SAMPLES.filter((s) => s.categoryId === categoryId);
}
