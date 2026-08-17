import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import guideBoard from 'src/assets/game2048-guide/guide-board.png';
import anaglyphGlasses from 'src/assets/exercise-guide/anaglyph-glasses.png';

interface Game2048InstructionStepProps {
  trainingEye: 'left' | 'right' | 'both' | null;
  requiresAnaglyphGlasses: boolean;
  onStart: () => void;
}

/** The artwork is authored at this size; every coordinate below is in artwork pixels. */
const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;

const NAVY = '#12356e';
const BODY = '#33456b';

type CardBox = { x: number; y: number; w: number; h: number };

const CARD_BOXES: CardBox[] = [
  { x: 33, y: 286, w: 338, h: 283 },
  { x: 380, y: 286, w: 356, h: 283 },
  { x: 745, y: 286, w: 323, h: 283 },
  { x: 1076, y: 286, w: 430, h: 283 },
  { x: 33, y: 577, w: 338, h: 268 },
  { x: 380, y: 577, w: 356, h: 268 },
  { x: 745, y: 577, w: 323, h: 268 },
  { x: 1076, y: 577, w: 430, h: 268 },
];

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

/** Per-card title sizes, tuned so long titles stay on one line like the artwork. */
const TITLE_SIZES = [17, 17, 18, 18, 17, 17, 11.5, 16];

const HEADLINE = 'Bài tập này giúp bạn rèn luyện thị lực để quan sát rõ hơn, tăng khả năng tập trung và phản ứng nhanh.';
const SUBTITLE = 'LUYỆN NHÌN RÕ Ô SỐ, TẬP TRUNG VÀ PHẢN ỨNG HIỆU QUẢ';
const DISTANCE_LABEL = ['Giữ khoảng cách', 'từ 50cm'];
const IMPORTANT_TITLE = 'QUAN TRỌNG';
const IMPORTANT_TEXT = 'Sự kiên trì mỗi ngày sẽ giúp cải thiện thị lực rõ rệt. Hãy luyện tập đều đặn theo hướng dẫn và theo dõi sự tiến bộ của bạn!';
const TIPS_TITLE = 'GỢI Ý LUYỆN TẬP HIỆU QUẢ';
const TIPS = [
  'Luyện tập đều đặn mỗi ngày',
  'Tuân thủ thời gian luyện tập khuyến nghị',
  'Theo dõi tiến bộ qua từng buổi tập',
  'Kiên trì là chìa khóa để đạt kết quả tốt nhất',
];
const TIP_CENTERS = [525, 671, 833, 983];
const CTA_LABEL = 'BẮT ĐẦU LUYỆN TẬP';
const BRAND_TEXT = ' luôn đồng hành cùng bạn trên hành trình cải thiện thị lực!';

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
  null, // slot 3 depends on the training eye
  {
    title: 'CÁCH CHƠI',
    description:
      'Dùng phím mũi tên ( ↑ ↓ ← → ) trên bàn phím để di chuyển các ô số. Hai ô cùng số chạm nhau sẽ gộp lại thành ô có giá trị lớn hơn.',
  },
  {
    title: 'MỤC TIÊU LUYỆN TẬP',
    description:
      'Cố gắng tạo ô số 2048 (hoặc lớn hơn) trong suốt thời gian bài tập. Không nhất thiết phải đạt đúng 2048 mới được tính.',
  },
  {
    title: 'TIẾP TỤC CHƠI',
    description:
      'Khi bàn cờ đầy hoặc không còn nước đi, bàn cờ sẽ làm mới để tiếp tục chơi. Điểm và thời gian luyện tập vẫn được giữ.',
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

const getEyeStep = (
  trainingEye: Game2048InstructionStepProps['trainingEye'],
  requiresAnaglyphGlasses: boolean,
) => {
  if (requiresAnaglyphGlasses || trainingEye === 'both' || trainingEye === null) {
    return {
      title: 'MỞ CẢ HAI MẮT',
      description: 'Mở cả hai mắt và đeo kính lọc màu theo hướng dẫn trong suốt bài tập.',
    };
  }
  return trainingEye === 'left'
    ? {
        title: 'CHE MẮT PHẢI',
        description: 'Hãy che mắt phải trong suốt bài tập để luyện mắt trái.',
      }
    : {
        title: 'CHE MẮT TRÁI',
        description: 'Hãy che mắt trái trong suốt bài tập để luyện mắt phải.',
      };
};

const Game2048InstructionStep: React.FC<Game2048InstructionStepProps> = ({
  trainingEye,
  requiresAnaglyphGlasses,
  onStart,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const fit = () => {
      const { width, height } = frame.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT));
    };

    fit();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fit);
      return () => window.removeEventListener('resize', fit);
    }

    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const eyeStep = getEyeStep(trainingEye, requiresAnaglyphGlasses);
  const steps = STATIC_STEPS.map((step) => step ?? eyeStep);

  return (
    <Box
      ref={frameRef}
      sx={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        bgcolor: '#eaf6ff',
      }}
    >
      <Box
        component="h1"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          m: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          clipPath: 'inset(50%)',
        }}
      >
        Hướng dẫn luyện tập 2048
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          backgroundImage: `url(${guideBoard})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          color: BODY,
          fontWeight: 500,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 228,
            top: 108,
            width: 172,
            fontSize: 15.5,
            lineHeight: '23.3px',
            color: '#46536b',
          }}
        >
          {HEADLINE}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 458,
            top: 227,
            width: 572,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16.5,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            color: '#fff',
          }}
        >
          {SUBTITLE}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 498,
            top: 352,
            width: 150,
            textAlign: 'center',
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 600,
          }}
        >
          {DISTANCE_LABEL.map((line) => (
            <Box key={line}>{line}</Box>
          ))}
        </Box>

        {steps.map((step, index) => {
          const card = CARD_BOXES[index];
          return (
            <React.Fragment key={step.title}>
              <Box
                sx={{
                  position: 'absolute',
                  left: card.x + 20,
                  top: card.y + 9,
                  width: card.w - 34,
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: BADGE_COLORS[index],
                    boxShadow: '0 2px 4px rgba(0, 70, 150, .2)',
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  {index + 1}
                </Box>
                <Box
                  sx={{
                    fontSize: TITLE_SIZES[index],
                    whiteSpace: 'nowrap',
                    fontWeight: 800,
                    letterSpacing: '.2px',
                    lineHeight: 1.15,
                    color: NAVY,
                  }}
                >
                  {step.title}
                </Box>
              </Box>

              {index === 0 && (
                <Box
                  component="img"
                  src={anaglyphGlasses}
                  alt="Kính lọc màu xanh đỏ"
                  sx={{
                    position: 'absolute',
                    left: card.x + 215,
                    top: card.y + 125,
                    width: 115,
                    height: 'auto',
                    objectFit: 'contain',
                  }}
                />
              )}

              <Box
                sx={{
                  position: 'absolute',
                  left: card.x + 28,
                  bottom: DESIGN_HEIGHT - (card.y + card.h) + 22,
                  width: card.w - 56,
                  textAlign: 'center',
                  fontSize: index === 0 ? 11.5 : 14.5,
                  lineHeight: index === 0 ? '14px' : '20.5px',
                }}
              >
                {step.description}
              </Box>
            </React.Fragment>
          );
        })}

        <Box
          sx={{
            position: 'absolute',
            left: 79,
            top: 886,
            width: 108,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13.5,
            whiteSpace: 'nowrap',
            fontWeight: 800,
            letterSpacing: '.2px',
            color: '#fff',
          }}
        >
          {IMPORTANT_TITLE}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 56,
            top: 920,
            width: 374,
            fontSize: 15,
            lineHeight: '20.5px',
            color: '#2f4a7a',
          }}
        >
          {IMPORTANT_TEXT}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 600,
            top: 861,
            width: 330,
            textAlign: 'center',
            fontSize: 15.5,
            fontWeight: 800,
            color: '#1560c4',
          }}
        >
          {TIPS_TITLE}
        </Box>

        {TIPS.map((tip, index) => (
          <Box
            key={tip}
            sx={{
              position: 'absolute',
              left: TIP_CENTERS[index] - 68,
              top: 955,
              width: 136,
              textAlign: 'center',
              fontSize: 10.5,
              lineHeight: '15px',
              fontWeight: 600,
            }}
          >
            {tip}
          </Box>
        ))}

        <ButtonBase
          onClick={onStart}
          sx={{
            position: 'absolute',
            left: 1097,
            top: 876,
            width: 346,
            height: 62,
            pl: '54px',
            pt: '10px',
            borderRadius: '31px',
            display: 'flex',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '.4px',
            whiteSpace: 'nowrap',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, .12)' },
          }}
        >
          {CTA_LABEL}
        </ButtonBase>

        <Box
          sx={{
            position: 'absolute',
            left: 1165,
            top: 961,
            width: 265,
            fontSize: 15.5,
            lineHeight: '21px',
            color: '#2f4a7a',
          }}
        >
          <Box component="span" sx={{ fontWeight: 800, color: '#1a73d1' }}>
            D-VisUp
          </Box>
          {BRAND_TEXT}
        </Box>
      </Box>
    </Box>
  );
};

export default Game2048InstructionStep;
