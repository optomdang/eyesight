const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const {
  CLOUD_TTS_VOICES,
  getTtsPreviewEnv,
  getEnabledProviders,
} = require('../../config/ttsPreview.config');

const MAX_TEXT_LENGTH = 600;

function clampRate(rate) {
  const n = Number(rate);
  if (Number.isNaN(n)) return 0.95;
  return Math.min(1.3, Math.max(0.7, n));
}

function assertProviderEnabled(provider) {
  const enabled = getEnabledProviders();
  if (!enabled.includes(provider)) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Cloud TTS provider "${provider}" is not configured. Add API key to eyesight-service/.env`
    );
  }
}

function getVoicesForProvider(provider) {
  const catalog = CLOUD_TTS_VOICES[provider];
  if (!catalog) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unknown TTS provider: ${provider}`);
  }
  return catalog.voices;
}

function resolveVoice(provider, voiceId, lang) {
  const voices = getVoicesForProvider(provider);
  const voice = voices.find((v) => v.id === voiceId);
  if (voice) return voice;

  if (provider === 'google' && voiceId) {
    return { id: voiceId, label: voiceId, lang: lang === 'en' ? 'en-US' : 'vi-VN' };
  }
  if (provider === 'azure' && voiceId) {
    return { id: voiceId, label: voiceId, lang: lang === 'en' ? 'en-US' : 'vi-VN' };
  }

  throw new ApiError(httpStatus.BAD_REQUEST, `Voice not found: ${voiceId}`);
}

async function synthesizeGoogle({ text, voice, rate }) {
  const { googleApiKey } = getTtsPreviewEnv();
  const speakingRate = clampRate(rate);
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(googleApiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: voice.lang,
        name: voice.id,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ApiError(httpStatus.BAD_GATEWAY, `Google TTS failed: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    audioBase64: data.audioContent,
    contentType: 'audio/mpeg',
  };
}

async function synthesizeAzure({ text, voice, rate }) {
  const { azureSpeechKey, azureSpeechRegion } = getTtsPreviewEnv();
  const speakingRate = clampRate(rate);
  const ratePercent = Math.round(speakingRate * 100);
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const ssml = `<speak version="1.0" xml:lang="${voice.lang}"><voice name="${voice.id}"><prosody rate="${ratePercent}%">${escaped}</prosody></voice></speak>`;

  const response = await fetch(
    `https://${azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureSpeechKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new ApiError(httpStatus.BAD_GATEWAY, `Azure TTS failed: ${errBody.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    audioBase64: buffer.toString('base64'),
    contentType: 'audio/mpeg',
  };
}

async function synthesizeElevenLabs({ text, voice, rate }) {
  const { elevenLabsApiKey } = getTtsPreviewEnv();
  const speed = clampRate(rate);
  const modelId = CLOUD_TTS_VOICES.elevenlabs.modelId;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabsApiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        speed,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ApiError(httpStatus.BAD_GATEWAY, `ElevenLabs TTS failed: ${errBody.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    audioBase64: buffer.toString('base64'),
    contentType: 'audio/mpeg',
  };
}

async function synthesizePreview({ provider, voiceId, text, lang = 'vi', rate = 0.95 }) {
  assertProviderEnabled(provider);

  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Text is required');
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Text exceeds ${MAX_TEXT_LENGTH} characters`);
  }

  const voice = resolveVoice(provider, voiceId, lang);
  let result;

  if (provider === 'google') {
    result = await synthesizeGoogle({ text: trimmed, voice, rate });
  } else if (provider === 'azure') {
    result = await synthesizeAzure({ text: trimmed, voice, rate });
  } else if (provider === 'elevenlabs') {
    result = await synthesizeElevenLabs({ text: trimmed, voice, rate });
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, `Unknown provider: ${provider}`);
  }

  return {
    provider,
    voiceId: voice.id,
    voiceLabel: voice.label,
    ...result,
  };
}

function getPreviewStatus() {
  const enabledProviders = getEnabledProviders();
  return {
    enabledProviders,
    voices: Object.fromEntries(
      enabledProviders.map((p) => [
        p,
        {
          label: CLOUD_TTS_VOICES[p].label,
          voices: CLOUD_TTS_VOICES[p].voices,
          modelId: CLOUD_TTS_VOICES[p].modelId,
        },
      ])
    ),
    envHints: {
      google: 'GOOGLE_TTS_API_KEY',
      azure: 'AZURE_SPEECH_KEY + AZURE_SPEECH_REGION',
      elevenlabs: 'ELEVENLABS_API_KEY',
    },
  };
}

module.exports = {
  synthesizePreview,
  getPreviewStatus,
  getEnabledProviders,
};
