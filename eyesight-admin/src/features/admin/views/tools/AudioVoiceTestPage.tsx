/**
 * @deprecated Use /admin/settings/audio?panel=tts — kept as redirect target only.
 */
import { Navigate } from 'react-router-dom';

const AudioVoiceTestPage: React.FC = () => (
  <Navigate to="/admin/settings/audio?panel=tts" replace />
);

export default AudioVoiceTestPage;
