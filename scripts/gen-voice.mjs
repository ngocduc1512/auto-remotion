#!/usr/bin/env node
/**
 * gen-voice — call ElevenLabs TTS for a script, save mp3 + word-timings.
 *
 * Ported from Auto-Video-RV/pipeline/voice.py, simplified for a single-take
 * per episode (the whole script goes in one request, so voice character
 * stays consistent).
 *
 * Usage:
 *   node scripts/gen-voice.mjs <script.txt> <out-name>
 *   node scripts/gen-voice.mjs public/ei-script.txt ei-voice
 *
 * Writes:
 *   public/<out-name>.mp3          — the audio
 *   public/<out-name>.words.json   — [{ text, start, end }] per word
 *   public/<out-name>.srt          — sentence-level captions
 *
 * Env vars read from .env (dotenv-style, KEY=VALUE, # comments):
 *   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL,
 *   ELEVENLABS_STABILITY, ELEVENLABS_SIMILARITY_BOOST, ELEVENLABS_STYLE,
 *   ELEVENLABS_USE_SPEAKER_BOOST, ELEVENLABS_SPEED, ELEVENLABS_LANGUAGE_CODE
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── .env loader ──
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ── Args ──
const [, , scriptPathArg, outName] = process.argv;
if (!scriptPathArg || !outName) {
  console.error('Usage: node scripts/gen-voice.mjs <script.txt> <out-name>');
  console.error('Example: node scripts/gen-voice.mjs public/ei-script.txt ei-voice');
  process.exit(1);
}
const scriptPath = path.resolve(ROOT, scriptPathArg);
if (!fs.existsSync(scriptPath)) {
  console.error(`Script not found: ${scriptPath}`);
  process.exit(1);
}

const rawText = fs.readFileSync(scriptPath, 'utf-8').trim();
if (!rawText) {
  console.error('Script is empty.');
  process.exit(1);
}

// ── Emotion tags (ElevenLabs v3) ──
// If AUTO_EMOTION is on, run gen-tags first (once), then prepend the tag to
// each sentence when we send the text to ElevenLabs. Tags never appear in the
// final SRT or words.json because we strip [tag]-shaped words after alignment.
const AUTO_EMOTION = (process.env.AUTO_EMOTION ?? 'true').toLowerCase() !== 'false';
const tagsFile = path.join(ROOT, 'public', `${outName}-tags.json`);

async function ensureTagsFile() {
  if (!AUTO_EMOTION) return null;
  // Auto-tags only work with EL v3 — other models treat tags as literal text.
  if (!/^eleven_v3/i.test(process.env.ELEVENLABS_MODEL ?? '')) return null;
  if (fs.existsSync(tagsFile)) return tagsFile;
  console.log(`Emotion tags missing — running gen-tags first…`);
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('node', ['scripts/gen-tags.mjs', scriptPathArg, outName], {
    stdio: 'inherit', cwd: ROOT,
  });
  if (r.status !== 0) {
    console.warn(`⚠ gen-tags failed — continuing with untagged text`);
    return null;
  }
  return fs.existsSync(tagsFile) ? tagsFile : null;
}
const tagsPath = await ensureTagsFile();

/**
 * Build the text ElevenLabs will actually see. When a tags file exists we
 * prepend each sentence's chosen tag; otherwise we send the raw script.
 * Whitespace between sentences is normalized to single spaces so alignment
 * boundaries are predictable.
 */
function applyTags(script, tagsFilePath) {
  if (!tagsFilePath) return script;
  try {
    const data = JSON.parse(fs.readFileSync(tagsFilePath, 'utf-8'));
    if (!Array.isArray(data.sentences)) return script;
    return data.sentences
      .map((s) => (s.tag ? `${s.tag} ${s.text}` : s.text))
      .join(' ');
  } catch {
    return script;
  }
}
const text = applyTags(rawText, tagsPath);
if (tagsPath) {
  const tagCount = (text.match(/\[[a-z]+\]/gi) || []).length;
  console.log(`  ✓ ${tagCount} emotion tag(s) applied from ${path.relative(ROOT, tagsPath)}`);
}

// ── Config ──
const cfg = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
  model: process.env.ELEVENLABS_MODEL || 'eleven_v3',
  stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.5'),
  similarityBoost: parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '0.75'),
  style: parseFloat(process.env.ELEVENLABS_STYLE || '0.0'),
  useSpeakerBoost: (process.env.ELEVENLABS_USE_SPEAKER_BOOST || 'true') === 'true',
  speed: parseFloat(process.env.ELEVENLABS_SPEED || '1.0'),
  languageCode: process.env.ELEVENLABS_LANGUAGE_CODE || '',
};

if (!cfg.apiKey) {
  console.error('Missing ELEVENLABS_API_KEY. Set it in .env');
  process.exit(1);
}
if (text.length > 4500) {
  console.error(`Script too long (${text.length} chars). Max 4500 for a single take.`);
  process.exit(1);
}

// ── ElevenLabs TTS with alignment ──
const url = `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}/with-timestamps`;
const payload = {
  text,
  model_id: cfg.model,
  voice_settings: {
    stability: cfg.stability,
    similarity_boost: cfg.similarityBoost,
    style: cfg.style,
    use_speaker_boost: cfg.useSpeakerBoost,
    speed: cfg.speed,
  },
};
if (cfg.languageCode) payload.language_code = cfg.languageCode;

console.log(`Calling ElevenLabs (${cfg.model}, voice ${cfg.voiceId}, ${text.length} chars)…`);
const startedAt = Date.now();

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'xi-api-key': cfg.apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`ElevenLabs ${res.status}: ${body.slice(0, 500)}`);
  process.exit(1);
}

const data = await res.json();
const audioBytes = Buffer.from(data.audio_base64, 'base64');
console.log(`  ✓ ${audioBytes.length.toLocaleString()} bytes in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);

// ── Save audio ──
const publicDir = path.join(ROOT, 'public');
fs.mkdirSync(publicDir, { recursive: true });
const mp3Path = path.join(publicDir, `${outName}.mp3`);
fs.writeFileSync(mp3Path, audioBytes);
console.log(`  → ${path.relative(ROOT, mp3Path)}`);

// ── Word alignment ──
const align = data.normalized_alignment || data.alignment || {};
const chars = align.characters || [];
const starts = align.character_start_times_seconds || [];
const ends = align.character_end_times_seconds || [];

function charsToWords(chars, starts, ends) {
  const words = [];
  let buf = [];
  let bufStart = null;
  let bufEnd = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      if (buf.length) {
        words.push({ text: buf.join(''), start: bufStart ?? 0, end: bufEnd });
        buf = [];
        bufStart = null;
      }
    } else {
      if (bufStart === null) bufStart = starts[i];
      buf.push(ch);
      bufEnd = ends[i];
    }
  }
  if (buf.length) words.push({ text: buf.join(''), start: bufStart ?? 0, end: bufEnd });
  return words;
}
const wordsWithTags = charsToWords(chars, starts, ends);

// Strip [tag]-shaped "words" from the alignment. EL v3 doesn't speak the
// bracket characters — they're silent delivery modifiers — but the API's
// char alignment still includes them as regular characters. Filtering here
// keeps captions and SRT clean of ""[dramatic]"" etc.
const isTag = (w) => /^\[[a-z][a-z\s]*\]$/i.test(w.text.trim());
const words = wordsWithTags.filter((w) => !isTag(w));
const strippedCount = wordsWithTags.length - words.length;

const wordsPath = path.join(publicDir, `${outName}.words.json`);
fs.writeFileSync(wordsPath, JSON.stringify({ text: rawText, words }, null, 2));
console.log(
  `  → ${path.relative(ROOT, wordsPath)} (${words.length} words` +
    (strippedCount > 0 ? `, ${strippedCount} tag(s) stripped` : '') + `)`,
);

// ── SRT (sentence-level, split at . ? ! …) ──
function toSrtTimestamp(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

const sentenceEnd = /[.?!…]$/;
const srtLines = [];
let curWords = [];
let curStart = null;
let idx = 1;
for (const w of words) {
  if (curStart === null) curStart = w.start;
  curWords.push(w);
  if (sentenceEnd.test(w.text)) {
    const line = curWords.map((x) => x.text).join(' ');
    const end = w.end;
    srtLines.push(`${idx}\n${toSrtTimestamp(curStart)} --> ${toSrtTimestamp(end)}\n${line}\n`);
    idx++;
    curWords = [];
    curStart = null;
  }
}
if (curWords.length) {
  const line = curWords.map((x) => x.text).join(' ');
  const end = curWords[curWords.length - 1].end;
  srtLines.push(`${idx}\n${toSrtTimestamp(curStart)} --> ${toSrtTimestamp(end)}\n${line}\n`);
}
const srtPath = path.join(publicDir, `${outName}.srt`);
fs.writeFileSync(srtPath, srtLines.join('\n'));
console.log(`  → ${path.relative(ROOT, srtPath)}`);

console.log(`\nDone. Reference in a composition with staticFile('${outName}.mp3').`);
