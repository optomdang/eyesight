/**
 * Pre-generate instruction MP3 files from instructionAudioSamples catalog.
 *
 * Compares content hashes in manifest.json — regenerates changed entries,
 * deletes orphaned files. Requires Azure Speech in eyesight-service/.env.
 *
 * Usage: npm run generate:instruction-audio
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INSTRUCTION_AUDIO_SAMPLES,
  type AudioSampleLang,
} from '../src/utils/audio/instructionAudioSamples.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_ROOT = path.resolve(__dirname, '..');
const SERVICE_ENV = path.resolve(ADMIN_ROOT, '../eyesight-service/.env');
const AUDIO_ROOT = path.resolve(ADMIN_ROOT, 'public/audio/instructions');
const MANIFEST_PATH = path.resolve(AUDIO_ROOT, 'manifest.json');

const LANGS: AudioSampleLang[] = ['vi', 'en'];
const DEFAULT_RATE = 0.8;
const VOICES: Record<AudioSampleLang, string> = {
  vi: 'vi-VN-HoaiMyNeural',
  en: 'en-US-JennyNeural',
};
const VOICE_LANG: Record<AudioSampleLang, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};

interface ManifestEntry {
  contentHash: string;
  file: string;
}

interface Manifest {
  version: number;
  provider: string;
  voiceId: string;
  enVoiceId: string;
  rate: number;
  generatedAt: string | null;
  entries: Record<string, ManifestEntry>;
}

function hashContent(lang: AudioSampleLang, text: string, voiceId: string, rate: number): string {
  const input = `${lang}|${text.trim()}|${voiceId}|${rate.toFixed(2)}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function manifestKey(lang: AudioSampleLang, sampleId: string): string {
  return `${lang}:${sampleId}`;
}

async function loadEnvFile(): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  try {
    const raw = await readFile(SERVICE_ENV, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    // optional
  }
  return env;
}

function clampRate(rate: number): number {
  return Math.min(1.3, Math.max(0.7, rate));
}

async function synthesizeAzure(
  text: string,
  voiceId: string,
  voiceLang: string,
  rate: number,
  azureKey: string,
  azureRegion: string
): Promise<Buffer> {
  const speakingRate = clampRate(rate);
  const ratePercent = Math.round(speakingRate * 100);
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const ssml = `<speak version="1.0" xml:lang="${voiceLang}"><voice name="${voiceId}"><prosody rate="${ratePercent}%">${escaped}</prosody></voice></speak>`;

  const response = await fetch(
    `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Azure TTS failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function loadManifest(): Promise<Manifest> {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw) as Manifest;
  } catch {
    return {
      version: 1,
      provider: 'azure',
      voiceId: VOICES.vi,
      enVoiceId: VOICES.en,
      rate: DEFAULT_RATE,
      generatedAt: null,
      entries: {},
    };
  }
}

async function collectOrphanMp3s(validRelativePaths: Set<string>): Promise<string[]> {
  const orphans: string[] = [];
  for (const lang of LANGS) {
    const langDir = path.join(AUDIO_ROOT, lang);
    let files: string[] = [];
    try {
      files = await readdir(langDir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.mp3')) continue;
      const rel = `${lang}/${file}`;
      if (!validRelativePaths.has(rel)) {
        orphans.push(path.join(langDir, file));
      }
    }
  }
  return orphans;
}

async function main(): Promise<void> {
  const env = await loadEnvFile();
  const azureKey = env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_KEY || '';
  const azureRegion = env.AZURE_SPEECH_REGION || process.env.AZURE_SPEECH_REGION || 'southeastasia';

  if (!azureKey) {
    console.error('Missing AZURE_SPEECH_KEY in eyesight-service/.env');
    process.exit(1);
  }

  const manifest = await loadManifest();
  const rate = manifest.rate ?? DEFAULT_RATE;
  const nextEntries: Record<string, ManifestEntry> = {};
  const validRelativePaths = new Set<string>();

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const sample of INSTRUCTION_AUDIO_SAMPLES) {
    for (const lang of LANGS) {
      const voiceId = VOICES[lang];
      const text = sample.text[lang];
      if (!text?.trim()) continue;

      const key = manifestKey(lang, sample.id);
      const contentHash = hashContent(lang, text, voiceId, rate);
      const relativeFile = `${lang}/${sample.id}.mp3`;
      const absoluteFile = path.join(AUDIO_ROOT, relativeFile);
      validRelativePaths.add(relativeFile);

      const prev = manifest.entries[key];
      const needsGenerate =
        !prev ||
        prev.contentHash !== contentHash ||
        prev.file !== relativeFile;

      if (!needsGenerate) {
        try {
          await readFile(absoluteFile);
          nextEntries[key] = { contentHash, file: relativeFile };
          skipped += 1;
          continue;
        } catch {
          // file missing — regenerate
        }
      }

      console.log(`${needsGenerate && prev ? 'Updating' : 'Creating'} ${relativeFile}…`);
      const audio = await synthesizeAzure(text, voiceId, VOICE_LANG[lang], rate, azureKey, azureRegion);
      await mkdir(path.dirname(absoluteFile), { recursive: true });
      await writeFile(absoluteFile, audio);
      nextEntries[key] = { contentHash, file: relativeFile };
      if (prev) updated += 1;
      else created += 1;
    }
  }

  const orphans = await collectOrphanMp3s(validRelativePaths);
  for (const orphan of orphans) {
    console.log(`Removing orphan ${path.relative(AUDIO_ROOT, orphan)}`);
    await rm(orphan);
  }

  const nextManifest: Manifest = {
    version: 1,
    provider: 'azure',
    voiceId: VOICES.vi,
    enVoiceId: VOICES.en,
    rate,
    generatedAt: new Date().toISOString(),
    entries: nextEntries,
  };

  await mkdir(AUDIO_ROOT, { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`);

  console.log(
    `Done. created=${created} updated=${updated} skipped=${skipped} removed=${orphans.length} total=${Object.keys(nextEntries).length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
