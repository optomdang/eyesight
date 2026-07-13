import axios from 'axios';
import { postData, getData } from 'src/utils/request';
import { getAccessToken } from 'src/utils/Jwt';

export type CloudTtsProvider = 'google' | 'azure' | 'elevenlabs';

export interface CloudTtsVoice {
  id: string;
  label: string;
  lang: string;
  gender?: string;
}

export interface CloudTtsProviderInfo {
  label: string;
  voices: CloudTtsVoice[];
  modelId?: string;
}

export interface CloudTtsPreviewStatus {
  enabledProviders: CloudTtsProvider[];
  voices: Partial<Record<CloudTtsProvider, CloudTtsProviderInfo>>;
  envHints: Record<CloudTtsProvider, string>;
}

export interface CloudTtsSynthesizeRequest {
  provider: CloudTtsProvider;
  voiceId: string;
  text: string;
  lang: 'vi' | 'en';
  rate?: number;
}

export interface CloudTtsSynthesizeResponse {
  provider: CloudTtsProvider;
  voiceId: string;
  voiceLabel: string;
  audioBase64: string;
  contentType: string;
}

export async function fetchCloudTtsStatus(): Promise<CloudTtsPreviewStatus> {
  return getData<CloudTtsPreviewStatus>('tts-preview/status');
}

export async function synthesizeCloudTts(
  payload: CloudTtsSynthesizeRequest
): Promise<CloudTtsSynthesizeResponse> {
  const accessToken = getAccessToken();
  const response = await axios.post<CloudTtsSynthesizeResponse>(
    `${import.meta.env.VITE_BASE_API_URL}/tts-preview/synthesize`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      withCredentials: true,
      timeout: 45000,
    }
  );
  return response.data;
}

/** Fallback using shared auth helper (10s timeout) — prefer synthesizeCloudTts for long TTS. */
export async function synthesizeCloudTtsWithAuth(
  payload: CloudTtsSynthesizeRequest
): Promise<CloudTtsSynthesizeResponse> {
  return postData<CloudTtsSynthesizeResponse, CloudTtsSynthesizeRequest>(
    'tts-preview/synthesize',
    payload
  );
}
