/**
 * Curated cloud TTS voices for admin preview (exam / VT instruction copy).
 * API keys are optional — only configured providers are enabled.
 */

const CLOUD_TTS_VOICES = {
  google: {
    label: 'Google Cloud TTS',
    voices: [
      { id: 'vi-VN-Wavenet-A', label: 'Wavenet A (nữ)', lang: 'vi-VN', gender: 'FEMALE' },
      { id: 'vi-VN-Wavenet-B', label: 'Wavenet B (nam)', lang: 'vi-VN', gender: 'MALE' },
      { id: 'vi-VN-Wavenet-C', label: 'Wavenet C (nữ)', lang: 'vi-VN', gender: 'FEMALE' },
      { id: 'vi-VN-Wavenet-D', label: 'Wavenet D (nữ)', lang: 'vi-VN', gender: 'FEMALE' },
      { id: 'vi-VN-Neural2-A', label: 'Neural2 A (nữ)', lang: 'vi-VN', gender: 'FEMALE' },
      { id: 'vi-VN-Neural2-D', label: 'Neural2 D (nữ)', lang: 'vi-VN', gender: 'FEMALE' },
      { id: 'en-US-Neural2-F', label: 'Neural2 F (nữ, EN)', lang: 'en-US', gender: 'FEMALE' },
      { id: 'en-US-Neural2-J', label: 'Neural2 J (nam, EN)', lang: 'en-US', gender: 'MALE' },
    ],
  },
  azure: {
    label: 'Azure Neural TTS',
    voices: [
      { id: 'vi-VN-HoaiMyNeural', label: 'HoaiMy (nữ)', lang: 'vi-VN', gender: 'Female' },
      { id: 'vi-VN-NamMinhNeural', label: 'NamMinh (nam)', lang: 'vi-VN', gender: 'Male' },
      { id: 'en-US-JennyNeural', label: 'Jenny (nữ, EN)', lang: 'en-US', gender: 'Female' },
      { id: 'en-US-GuyNeural', label: 'Guy (nam, EN)', lang: 'en-US', gender: 'Male' },
    ],
  },
  elevenlabs: {
    label: 'ElevenLabs',
    modelId: 'eleven_multilingual_v2',
    voices: [
      { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (đa ngôn ngữ)', lang: 'multilingual', gender: 'Female' },
      { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella (đa ngôn ngữ)', lang: 'multilingual', gender: 'Female' },
      { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam (đa ngôn ngữ)', lang: 'multilingual', gender: 'Male' },
      { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (đa ngôn ngữ)', lang: 'multilingual', gender: 'Male' },
    ],
  },
};

function getTtsPreviewEnv() {
  return {
    googleApiKey: process.env.GOOGLE_TTS_API_KEY || '',
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'southeastasia',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  };
}

function getEnabledProviders() {
  const env = getTtsPreviewEnv();
  const providers = [];
  if (env.googleApiKey) providers.push('google');
  if (env.azureSpeechKey) providers.push('azure');
  if (env.elevenLabsApiKey) providers.push('elevenlabs');
  return providers;
}

module.exports = {
  CLOUD_TTS_VOICES,
  getTtsPreviewEnv,
  getEnabledProviders,
};
