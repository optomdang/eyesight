import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import guideBoard from 'src/assets/far-acuity-guide/guide-board.png';
import anaglyphGlasses from 'src/assets/exercise-guide/anaglyph-glasses.png';

interface FarAcuityInstructionStepProps {
  trainingEye: 'left' | 'right' | 'both' | null;
  requiresAnaglyphGlasses: boolean;
  onStart: () => void;
}

/** The guide artwork is authored at this size; overlay coordinates use artwork pixels. */
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;

const NAVY = '#12356e';
const BODY = '#33456b';
const BADGE_COLORS = [
  'linear-gradient(145deg, #1aa2ff, #087de9)',
  'linear-gradient(145deg, #ffa529, #f47b08)',
  'linear-gradient(145deg, #16d78d, #05aa65)',
  'linear-gradient(145deg, #9363f5, #6738d8)',
  'linear-gradient(145deg, #28d4de, #08aebf)',
  'linear-gradient(145deg, #ff619a, #e83276)',
  'linear-gradient(145deg, #3294ff, #0b67e8)',
  'linear-gradient(145deg, #ffa323, #f27606)',
];
const TITLE_SIZES = [16.5, 16, 16.5, 16, 16, 16.5, 11, 16];

const HEADLINE =
  'Bài tập này giúp bạn rèn luyện thị lực để quan sát rõ hơn, tăng khả năng nhận biết và đọc chính xác các ký tự.';
const SUBTITLE = 'LUYỆN THỊ LỰC - TĂNG KHẢ NĂNG NHẬN BIẾT - PHẢN ỨNG CHÍNH XÁC';
const DISTANCE_LABEL = ['Giữ khoảng cách', 'từ 50cm'];
const IMPORTANT_TITLE = 'LƯU Ý QUAN TRỌNG';
const IMPORTANT_LINES = [
  'Cần thực hiện chính xác, nếu không bài tập sẽ nâng mức khó quá nhanh, ảnh hưởng hiệu quả và không phù hợp với khả năng của bạn.',
  'Cần duy trì tập trung trong suốt quá trình tập luyện.',
];
const TIPS_TITLE = 'MẸO ĐỂ ĐẠT HIỆU QUẢ TỐT NHẤT';
const TIPS = [
  'Tập trung cao độ',
  'Luyện tập đều đặn mỗi ngày',
  'Theo dõi tiến bộ qua từng buổi tập',
  'Kiên trì và tin tưởng vào quá trình tập luyện',
];
const CTA_LABEL = 'BẮT ĐẦU LUYỆN TẬP';
const BRAND_TEXT = 'D-VisUp luôn đồng hành cùng bạn trên hành trình cải thiện thị lực!';
const REST_TIP = 'Mẹo nhỏ: Hãy nghỉ ngơi 5 phút sau mỗi 20 – 30 phút luyện tập để mắt được thư giãn tốt nhất.';
const TIP_CENTERS = [596, 716, 848, 980];

const CARD_BOXES = [
  { x: 36, y: 255, w: 334, h: 271 },
  { x: 377, y: 255, w: 368, h: 271 },
  { x: 752, y: 255, w: 267, h: 271 },
  { x: 1027, y: 255, w: 473, h: 271 },
  { x: 36, y: 536, w: 334, h: 255 },
  { x: 377, y: 536, w: 368, h: 255 },
  { x: 752, y: 536, w: 357, h: 255 },
  { x: 1117, y: 536, w: 383, h: 255 },
];

const STATIC_STEPS = [
  {
    title: 'ĐEO KÍNH TRƯỚC KHI CHƠI',
    description:
      'Nếu đang đeo kính, hãy đeo kính vào trước khi chơi. Hãy đeo cả kính xanh đỏ đồng thời cùng với kính của bé nếu bài tập có yêu cầu.',
  },
  {
    title: 'NGỒI ĐÚNG KHOẢNG CÁCH',
    description:
      'Ngồi đúng khoảng cách đã thiết lập trên màn hình. Giữ tư thế ổn định, không rướn người lại gần màn hình.',
  },
  null,
  {
    title: 'CÁCH TẬP – QUAN TRỌNG',
    description:
      'Quan sát các chữ hiển thị trên màn hình và yêu cầu trẻ đọc, phụ huynh sẽ hỗ trợ nhập các chữ vào ô bên dưới tương ứng, sau đó bấm xác nhận/Enter.\n\nVới các ký tự đặc biệt như chữ E/C hay hình LEA, hãy bấm chọn các ký tự tương ứng ở dưới cùng theo thứ tự các hình ở giữa màn hình.',
  },
  {
    title: 'MỤC TIÊU LUYỆN TẬP',
    description:
      'Cố gắng đạt kết quả tốt nhất ở mỗi bài tập. Bài tập sẽ tự động tăng độ khó theo tiến trình của bạn.',
  },
  {
    title: 'TIẾP TỤC CHƠI',
    description:
      'Khi bạn đã quen, hãy tiếp tục luyện tập để cải thiện thị lực và khả năng nhận biết chính xác hơn.',
  },
  {
    title: 'KHÔNG NHEO MẮT, KHÔNG TI HÍ CHE MẮT',
    description:
      'Được phép suy nghĩ chậm, nhưng không nheo mắt, không ti hí che mắt, hoặc mở mắt quá mức trong lúc chơi.',
  },
  {
    title: 'ÁNH SÁNG & MÔI TRƯỜNG',
    description:
      'Không cần chỉnh đèn phòng quá sáng; giữ ánh sáng ổn định để độ tương phản trên màn hình đúng như thiết kế bài tập.',
  },
];

function getEyeStep(
  trainingEye: FarAcuityInstructionStepProps['trainingEye'],
  requiresAnaglyphGlasses: boolean,
) {
  if (requiresAnaglyphGlasses || trainingEye === 'both' || trainingEye === null) {
    return {
      title: 'MỞ CẢ HAI MẮT',
      description: requiresAnaglyphGlasses
        ? 'Mở cả hai mắt và đeo kính lọc màu theo hướng dẫn trong suốt bài tập.'
        : 'Mở cả hai mắt trong suốt bài tập và giữ tư thế thoải mái.',
    };
  }
  return trainingEye === 'right'
    ? {
        title: 'CHE MẮT TRÁI',
        description: 'Hãy che mắt trái trong suốt bài tập để luyện mắt phải.',
      }
    : {
        title: 'CHE MẮT PHẢI',
        description: 'Hãy che mắt phải trong suốt bài tập để luyện mắt trái.',
      };
}

const FarAcuityInstructionStep: React.FC<FarAcuityInstructionStepProps> = ({
  trainingEye,
  requiresAnaglyphGlasses,
  onStart,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const steps = [...STATIC_STEPS];
  steps[2] = getEyeStep(trainingEye, requiresAnaglyphGlasses);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const fit = () => {
      setScale(
        Math.min(viewport.clientWidth / DESIGN_WIDTH, viewport.clientHeight / DESIGN_HEIGHT, 1),
      );
    };
    fit();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fit);
      return () => window.removeEventListener('resize', fit);
    }

    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={viewportRef}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        bgcolor: '#f5fbff',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          flex: '0 0 auto',
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          backgroundImage: `url(${guideBoard})`,
          backgroundSize: '100% 100%',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <Box component="h1" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Hướng dẫn bài tập VAC
        </Box>

        <Box sx={{ position: 'absolute', left: 236, top: 87, width: 180, fontSize: 15.5, lineHeight: '21px', color: BODY }}>
          {HEADLINE}
        </Box>
        <Box sx={{ position: 'absolute', left: 500, top: 22, width: 540, textAlign: 'center', fontSize: 38, lineHeight: 1.05, whiteSpace: 'nowrap', fontWeight: 800, letterSpacing: 1.5, color: NAVY }}>
          HƯỚNG DẪN BÀI TẬP
        </Box>
        <Box sx={{ position: 'absolute', left: 612, top: 75, width: 300, textAlign: 'center', fontSize: 95, lineHeight: 1, fontWeight: 900, letterSpacing: 2, color: '#1685f5', textShadow: '0 4px 0 #0948b9, 0 5px 8px rgba(0, 68, 178, .32)' }}>
          VAC
        </Box>
        <Box sx={{ position: 'absolute', left: 477, top: 202, width: 534, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 13.5, fontWeight: 800, letterSpacing: '.1px', whiteSpace: 'nowrap', color: '#fff' }}>
          {SUBTITLE}
        </Box>

        {steps.map((step, index) => {
          if (!step) return null;
          const card = CARD_BOXES[index];
          const descriptionTop =
            index === 0
              ? card.y + 189
              : index === 2
                ? card.y + 217
                : index === 3
                  ? card.y + 66
                  : card.y + card.h - 72;
          return (
            <React.Fragment key={step.title}>
              <Box
                sx={{
                  position: 'absolute',
                  left: card.x + 16,
                  top: card.y + 10,
                  width: card.w - 30,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: BADGE_COLORS[index],
                    boxShadow: '0 2px 4px rgba(0, 70, 150, .2)',
                    color: '#fff',
                    fontSize: 21,
                    fontWeight: 800,
                  }}
                >
                  {index + 1}
                </Box>
                <Box
                  sx={{
                    minWidth: 0,
                    fontSize: TITLE_SIZES[index],
                    lineHeight: 1.12,
                    whiteSpace: 'nowrap',
                    fontWeight: 800,
                    letterSpacing: '.1px',
                    color: NAVY,
                  }}
                >
                  {step.title}
                </Box>
              </Box>
              {index === 1 && (
                <Box sx={{ position: 'absolute', left: card.x + 146, top: card.y + 69, width: 112, textAlign: 'center', fontSize: 14, lineHeight: '17px', fontWeight: 700, color: NAVY }}>
                  {DISTANCE_LABEL.map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}
                </Box>
              )}
              {index === 0 && (
                <Box
                  component="img"
                  src={anaglyphGlasses}
                  alt="Kính lọc màu xanh đỏ"
                  sx={{
                    position: 'absolute',
                    left: card.x + 204,
                    top: card.y + 132,
                    width: 125,
                    height: 'auto',
                    objectFit: 'contain',
                  }}
                />
              )}
              <Box sx={{ position: 'absolute', left: card.x + 22, top: descriptionTop, width: index === 3 ? 166 : card.w - 44, textAlign: index === 3 ? 'left' : 'center', whiteSpace: index === 3 ? 'pre-line' : 'normal', fontSize: index === 0 ? 11.5 : index === 3 ? 11 : index === 6 ? 13.5 : 14.5, lineHeight: index === 0 ? '14px' : index === 3 ? '12.7px' : '19px', color: BODY }}>
                {step.description}
              </Box>
            </React.Fragment>
          );
        })}

        <Box sx={{ position: 'absolute', left: 104, top: 825, width: 157, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, letterSpacing: '.1px', whiteSpace: 'nowrap', fontWeight: 800, color: '#fff' }}>
          {IMPORTANT_TITLE}
        </Box>
        <Box sx={{ position: 'absolute', left: 145, top: 870, width: 342, fontSize: 11.5, lineHeight: '15px', color: BODY }}>
          {IMPORTANT_LINES.map((line) => (
            <Box key={line} sx={{ position: 'relative', pl: '13px', mb: '5px' }}>
              <Box component="span" sx={{ position: 'absolute', left: 0, color: '#ee3e43', fontWeight: 900 }}>•</Box>
              {line}
            </Box>
          ))}
        </Box>
        <Box sx={{ position: 'absolute', left: 645, top: 824, width: 340, textAlign: 'center', fontSize: 15.5, fontWeight: 800, color: '#1571d6' }}>
          {TIPS_TITLE}
        </Box>
        {TIPS.map((tip, index) => (
          <Box key={tip} sx={{ position: 'absolute', left: TIP_CENTERS[index] - 62, top: 925, width: 124, textAlign: 'center', fontSize: 9.5, lineHeight: '12px', fontWeight: 600, color: BODY }}>
            {tip}
          </Box>
        ))}

        <ButtonBase
          onClick={onStart}
          sx={{
            position: 'absolute',
            left: 1092,
            top: 816,
            width: 394,
            height: 72,
            borderRadius: '36px',
            pl: '65px',
            pt: '8px',
            display: 'flex',
            justifyContent: 'center',
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: '.4px',
            whiteSpace: 'nowrap',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, .12)' },
          }}
        >
          {CTA_LABEL}
        </ButtonBase>
        <Box sx={{ position: 'absolute', left: 1194, top: 925, width: 270, fontSize: 14.5, lineHeight: '18px', color: '#2268c6' }}>
          {BRAND_TEXT}
        </Box>
        <Box sx={{ position: 'absolute', left: 430, top: 990, width: 680, textAlign: 'center', fontSize: 13.5, color: BODY }}>
          {REST_TIP}
        </Box>
      </Box>
    </Box>
  );
};

export default FarAcuityInstructionStep;
