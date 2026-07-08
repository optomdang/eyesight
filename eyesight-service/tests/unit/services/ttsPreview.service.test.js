const ApiError = require('../../../src/utils/ApiError');
const {
  getPreviewStatus,
  synthesizePreview,
} = require('../../../src/services/tools/ttsPreview.service');

describe('ttsPreview.service', () => {
  it('getPreviewStatus returns env hints for all providers', () => {
    const status = getPreviewStatus();
    expect(status.envHints.google).toContain('GOOGLE_TTS_API_KEY');
    expect(status.envHints.azure).toContain('AZURE_SPEECH_KEY');
    expect(status.envHints.elevenlabs).toContain('ELEVENLABS_API_KEY');
  });

  it('synthesizePreview rejects empty text', async () => {
    const original = process.env.GOOGLE_TTS_API_KEY;
    process.env.GOOGLE_TTS_API_KEY = 'test-key';

    await expect(
      synthesizePreview({ provider: 'google', voiceId: 'vi-VN-Wavenet-D', text: '   ' })
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    if (original === undefined) delete process.env.GOOGLE_TTS_API_KEY;
    else process.env.GOOGLE_TTS_API_KEY = original;
  });

  it('synthesizePreview rejects unconfigured provider', async () => {
    const original = process.env.GOOGLE_TTS_API_KEY;
    delete process.env.GOOGLE_TTS_API_KEY;

    await expect(
      synthesizePreview({ provider: 'google', voiceId: 'vi-VN-Wavenet-D', text: 'Xin chào' })
    ).rejects.toBeInstanceOf(ApiError);

    if (original !== undefined) process.env.GOOGLE_TTS_API_KEY = original;
  });
});
