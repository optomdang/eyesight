import React, { useEffect, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { RecordVoiceOver, VolumeUp } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import useAuth from 'src/contexts/authGuard/useAuth';
import InstructionVoiceSettingsPage from 'src/features/portal/views/settings/InstructionVoiceSettingsPage';
import AudioVoiceTestContent from 'src/features/admin/views/tools/AudioVoiceTestContent';

const AUDIO_PANELS = ['voice', 'tts'] as const;
type AudioPanelId = (typeof AUDIO_PANELS)[number];

const SettingsAudioTab: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.userType === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const panelParam = searchParams.get('panel');
  const [panel, setPanel] = useState<AudioPanelId>(
    panelParam === 'tts' && isAdmin ? 'tts' : 'voice'
  );

  useEffect(() => {
    if (panelParam === 'tts' && isAdmin) {
      setPanel('tts');
    }
  }, [panelParam, isAdmin]);

  const handlePanelChange = (_: React.SyntheticEvent, value: AudioPanelId) => {
    setPanel(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'tts') {
      next.set('panel', 'tts');
    } else {
      next.delete('panel');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <Box>
      {isAdmin && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={panel} onChange={handlePanelChange} aria-label="Cài đặt âm thanh">
            <Tab icon={<VolumeUp />} iconPosition="start" label="Giọng đọc hướng dẫn" value="voice" />
            <Tab icon={<RecordVoiceOver />} iconPosition="start" label="Thử giọng TTS" value="tts" />
          </Tabs>
        </Box>
      )}

      {panel === 'voice' || !isAdmin ? <InstructionVoiceSettingsPage embedded /> : <AudioVoiceTestContent />}
    </Box>
  );
};

export default SettingsAudioTab;
