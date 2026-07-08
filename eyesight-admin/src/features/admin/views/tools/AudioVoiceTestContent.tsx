import React, { useState } from 'react';
import { Alert, Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Cloud, RecordVoiceOver } from '@mui/icons-material';
import type { AudioSampleLang } from 'src/utils/audio/instructionAudioSamples';
import BrowserTtsPanel from './BrowserTtsPanel';
import CloudTtsPanel from './CloudTtsPanel';

/** Inner content for TTS comparison — usable standalone or inside Settings › Âm thanh tab. */
const AudioVoiceTestContent: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [lang, setLang] = useState<AudioSampleLang>('vi');

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        <Typography variant="body2">
          Dùng mục này để <strong>nghe và so sánh</strong> trước khi quyết định tích hợp giọng đọc
          vào exam và bài tập. Tab Cloud TTS cần API key trong <code>eyesight-service/.env</code>.
        </Typography>
      </Alert>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="Loại giọng đọc">
          <Tab icon={<RecordVoiceOver />} iconPosition="start" label="Trình duyệt (miễn phí)" />
          <Tab icon={<Cloud />} iconPosition="start" label="Cloud TTS (neural)" />
        </Tabs>
      </Box>

      {tab === 0 && <BrowserTtsPanel lang={lang} onLangChange={setLang} />}
      {tab === 1 && <CloudTtsPanel lang={lang} onLangChange={setLang} />}

      <Alert severity="warning" variant="outlined">
        <Typography variant="subtitle2" gutterBottom>
          Ghi chú lâm sàng
        </Typography>
        <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2.5 }}>
          <li>Chỉ đọc hướng dẫn / câu hỏi chung — không đọc ký tự optotype hay gợi ý đáp án.</li>
          <li>Nếu chọn cloud: nên pre-generate MP3 một lần thay vì gọi API mỗi lần bệnh nhân làm bài.</li>
        </Typography>
      </Alert>
    </Stack>
  );
};

export default AudioVoiceTestContent;
