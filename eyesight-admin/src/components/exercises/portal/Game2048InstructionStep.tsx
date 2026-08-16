import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import GlassesIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import DistanceIcon from '@mui/icons-material/StraightenRounded';
import EyeIcon from '@mui/icons-material/VisibilityRounded';
import SwipeIcon from '@mui/icons-material/SwipeRounded';
import GoalIcon from '@mui/icons-material/TrendingUpRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import PostureIcon from '@mui/icons-material/FaceRounded';
import LightIcon from '@mui/icons-material/LightModeRounded';

interface Game2048InstructionStepProps {
  trainingEye: 'left' | 'right' | 'both' | null;
  requiresAnaglyphGlasses: boolean;
  onStart: () => void;
}

const getEyeInstruction = (
  trainingEye: Game2048InstructionStepProps['trainingEye'],
  requiresAnaglyphGlasses: boolean,
) => {
  if (requiresAnaglyphGlasses) {
    return {
      title: 'Mở cả hai mắt',
      description:
        'Mở cả hai mắt và đeo kính lọc màu theo hướng dẫn (nếu có) chồng lên kính đang đeo.',
    };
  }
  if (trainingEye === 'left') {
    return {
      title: 'Che mắt phải',
      description: 'Hãy che mắt phải trong suốt bài tập để luyện mắt trái.',
    };
  }
  if (trainingEye === 'right') {
    return {
      title: 'Che mắt trái',
      description: 'Hãy che mắt trái trong suốt bài tập để luyện mắt phải.',
    };
  }
  return {
    title: 'Mở cả hai mắt',
    description: 'Mở cả hai mắt trong suốt bài tập.',
  };
};

const stepCardSx = {
  border: '1px solid #dce7f4',
  borderRadius: '18px',
  p: { xs: 2, sm: 2.5 },
  display: 'grid',
  gridTemplateColumns: { xs: '48px 1fr', sm: '58px 1fr' },
  gap: 1.8,
  alignItems: 'start',
  background: 'linear-gradient(180deg, #fff, #fbfdff)',
};

const illustrationSx = {
  gridColumn: { xs: '1 / -1', sm: 2 },
  bgcolor: '#eaf4ff',
  borderRadius: '14px',
  p: 1.25,
  mt: 1,
  minHeight: 104,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#1976d2',
};

const Game2048InstructionStep: React.FC<Game2048InstructionStepProps> = ({
  trainingEye,
  requiresAnaglyphGlasses,
  onStart,
}) => {
  const eyeInstruction = getEyeInstruction(trainingEye, requiresAnaglyphGlasses);
  const coveredEyeReminder =
    trainingEye !== 'both' && !requiresAnaglyphGlasses ? ' hoặc mở mắt đang che để nhìn phụ' : '';

  const steps = [
    {
      title: 'Đeo kính nếu cần',
      description: 'Nếu đang đeo kính, hãy đeo kính vào trước khi bắt đầu chơi.',
      icon: <GlassesIcon sx={{ fontSize: 58 }} />,
      illustration: 'Đeo kính',
    },
    {
      title: 'Giữ đúng khoảng cách',
      description:
        'Ngồi đúng khoảng cách đã thiết lập. Giữ tư thế ổn định, không rướn người lại gần màn hình.',
      icon: <DistanceIcon sx={{ fontSize: 58 }} />,
      illustration: 'Giữ khoảng cách',
    },
    {
      title: eyeInstruction.title,
      description: eyeInstruction.description,
      icon: <EyeIcon sx={{ fontSize: 58 }} />,
      illustration:
        requiresAnaglyphGlasses || trainingEye === 'both'
          ? 'Mở hai mắt'
          : `Luyện mắt ${trainingEye === 'left' ? 'trái' : 'phải'}`,
    },
    {
      title: 'Cách chơi 2048',
      description:
        'Dùng phím mũi tên hoặc vuốt trên màn hình để di chuyển các ô. Hai ô cùng số chạm nhau sẽ gộp thành một ô lớn hơn.',
      icon: <SwipeIcon sx={{ fontSize: 58 }} />,
      illustration: '2  +  2  →  4',
      tiles: true,
    },
    {
      title: 'Mục tiêu luyện tập',
      description:
        'Cố gắng tạo ô số càng lớn càng tốt và duy trì tập trung trong suốt thời gian bài tập. Không nhất thiết phải đạt đúng 2048.',
      icon: <GoalIcon sx={{ fontSize: 58 }} />,
      illustration: 'Tập trung  →  Điểm số ↑',
    },
    {
      title: 'Khi không còn nước đi',
      description: 'Bàn cờ sẽ làm mới để tiếp tục chơi; điểm và thời gian luyện tập vẫn được giữ.',
      icon: <RefreshIcon sx={{ fontSize: 58 }} />,
      illustration: 'Làm mới bàn cờ',
    },
    {
      title: 'Không nheo mắt, nghiêng đầu',
      description: `Được phép suy nghĩ chậm, nhưng không nheo mắt, nghiêng đầu quá mức${coveredEyeReminder}.`,
      icon: <PostureIcon sx={{ fontSize: 58 }} />,
      illustration: 'Nhìn thẳng, mắt mở tự nhiên',
    },
    {
      title: 'Giữ ánh sáng ổn định',
      description:
        'Không cần chỉnh đèn phòng quá sáng; giữ ánh sáng ổn định để độ tương phản đúng như thiết kế bài tập.',
      icon: <LightIcon sx={{ fontSize: 58, color: '#f2b600' }} />,
      illustration: 'Ánh sáng vừa đủ',
    },
  ];

  return (
    <Container
      maxWidth={false}
      sx={{
        maxWidth: '1180px',
        minHeight: '100%',
        py: { xs: 1.75, sm: 3.5 },
        px: { xs: 1.5, sm: 2.5 },
        overflow: 'auto',
        color: '#172033',
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1674d1, #2d8de6)',
          borderRadius: { xs: '20px', sm: '26px' },
          px: { xs: 3, sm: 4.25 },
          py: { xs: 3, sm: 3.75 },
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3,
          boxShadow: '0 16px 40px rgba(25,118,210,.20)',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, opacity: 0.9, mb: 1, letterSpacing: 0.6 }}>
            BÀI TẬP NHƯỢC THỊ
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: 28, sm: 36, md: 44 },
              lineHeight: 1.15,
              mb: 1.25,
            }}
          >
            Hướng dẫn luyện tập 2048
          </Typography>
          <Typography sx={{ opacity: 0.94, fontSize: 17, lineHeight: 1.5 }}>
            Luyện nhìn rõ ô số, khả năng tập trung và phản ứng trong thời gian được giao.
          </Typography>
        </Box>

        <Box
          aria-hidden
          sx={{
            display: { xs: 'none', sm: 'grid' },
            width: 190,
            minWidth: 150,
            gridTemplateColumns: 'repeat(2, 58px)',
            gap: 1.25,
            justifyContent: 'center',
            p: 2.5,
            borderRadius: '22px',
            bgcolor: 'rgba(255,255,255,.18)',
          }}
        >
          {[
            ['2', '#ffd166', '#6b4d00'],
            ['4', '#ff9f68', '#6b2400'],
            ['8', '#90caf9', '#123b66'],
            ['16', '#b7e4c7', '#14532d'],
          ].map(([value, bg, color]) => (
            <Box
              key={value}
              sx={{
                height: 46,
                borderRadius: '9px',
                bgcolor: bg,
                color,
                fontWeight: 800,
                fontSize: 21,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {value}
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: '#fff',
          border: '1px solid #dce7f4',
          borderRadius: '22px',
          boxShadow: '0 8px 25px rgba(20,50,90,.07)',
          p: { xs: 2, sm: 3 },
          mt: 2.75,
        }}
      >
        <Typography sx={{ fontSize: 17, lineHeight: 1.6 }}>
          <strong>Hãy đọc hết hướng dẫn trước khi bắt đầu.</strong> Trong suốt bài tập, ưu tiên nhìn
          rõ màn hình, giữ tư thế ổn định và thực hiện đúng yêu cầu về mắt cần luyện.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2.25,
            mt: 2.75,
          }}
        >
          {steps.map((step, index) => (
            <Box key={step.title} sx={stepCardSx}>
              <Box
                sx={{
                  width: { xs: 44, sm: 52 },
                  height: { xs: 44, sm: 52 },
                  borderRadius: { xs: '13px', sm: '16px' },
                  bgcolor: '#1976d2',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: { xs: 20, sm: 24 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {index + 1}
              </Box>
              <Box>
                <Typography component="h3" sx={{ fontWeight: 700, fontSize: 18, mb: 0.75 }}>
                  {step.title}
                </Typography>
                <Typography sx={{ color: '#45546a', lineHeight: 1.55, fontSize: 15.5 }}>
                  {step.description}
                </Typography>
              </Box>
              <Box sx={illustrationSx}>
                <Box sx={{ textAlign: 'center' }}>
                  {step.icon}
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: '#17345f',
                      fontWeight: step.tiles ? 800 : 700,
                      fontSize: step.tiles ? 19 : 14,
                    }}
                  >
                    {step.illustration}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 2.25,
            alignItems: 'center',
            bgcolor: '#fff9df',
            border: '1px solid #f3df8a',
            borderRadius: '18px',
            px: 2.5,
            py: 2.25,
            mt: 2.75,
          }}
        >
          <Typography aria-hidden sx={{ fontSize: 34 }}>
            👁️
          </Typography>
          <Typography sx={{ lineHeight: 1.55 }}>
            <strong>Quan trọng</strong> — Đây là bài tập thị giác. Hãy thực hiện đúng tư thế, đúng
            mắt cần luyện và duy trì sự tập trung trong suốt thời gian được giao.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2.75,
          bgcolor: '#17345f',
          color: 'white',
          borderRadius: '22px',
          p: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2.5,
        }}
      >
        <Box>
          <Typography component="h2" sx={{ fontSize: 22, fontWeight: 700, mb: 0.75 }}>
            Sẵn sàng bắt đầu?
          </Typography>
          <Typography sx={{ color: '#dce9fb', lineHeight: 1.5 }}>
            Hãy kiểm tra kính, tư thế ngồi và mắt được che trước khi vào bài.
          </Typography>
          <Typography sx={{ color: '#b9cbe3', fontSize: 13, mt: 1.5 }}>
            Điểm số và thời gian sẽ được ghi nhận trong quá trình luyện tập.
          </Typography>
        </Box>
        <Button
          onClick={onStart}
          sx={{
            border: 0,
            bgcolor: '#ffb800',
            color: '#15294a',
            fontSize: 16,
            fontWeight: 800,
            px: 3,
            py: 1.65,
            borderRadius: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 5px 12px rgba(0,0,0,.18)',
            '&:hover': { bgcolor: '#ffc21c' },
          }}
        >
          Bắt đầu luyện tập →
        </Button>
      </Box>
    </Container>
  );
};

export default Game2048InstructionStep;
