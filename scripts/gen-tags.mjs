#!/usr/bin/env node
/**
 * gen-tags — director-mode LLM call that assigns an ElevenLabs v3 emotion
 * tag to every sentence in a script.
 *
 * ElevenLabs v3 reads `[dramatic]`, `[whispers]`, `[serious]`, etc. inline
 * in the text and modulates delivery accordingly. Without tags every line
 * reads at the same emotional register — flat. With them the voiceover
 * gets natural rise-and-fall.
 *
 * One LLM call sees ALL sentences so it can pace the emotional arc across
 * the whole video (opening hook builds, middle explains, punchline
 * releases) — not each line judged in isolation.
 *
 * Usage:
 *   node scripts/gen-tags.mjs <script.txt> <out-name>
 *   node scripts/gen-tags.mjs public/ei-script.txt ei-voice
 *
 * Writes: public/<out-name>-tags.json
 * {
 *   "generatedAt": "...",
 *   "sentences": [
 *     { "text": "Người thông minh nhất phòng...", "tag": "[dramatic]" },
 *     ...
 *   ]
 * }
 *
 * Env:
 *   AUTO_EMOTION=true      Runs automatically inside gen-voice when missing.
 *   AUTO_EMOTION=false     Disables entirely — gen-voice skips tag work.
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
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const [, , scriptPathArg, outName] = process.argv;
if (!scriptPathArg || !outName) {
  console.error('Usage: node scripts/gen-tags.mjs <script.txt> <out-name>');
  process.exit(1);
}
const scriptPath = path.resolve(ROOT, scriptPathArg);
if (!fs.existsSync(scriptPath)) {
  console.error(`Script not found: ${scriptPath}`);
  process.exit(1);
}
const scriptText = fs.readFileSync(scriptPath, 'utf-8').trim();
if (!scriptText) {
  console.error('Script is empty.');
  process.exit(1);
}

// ── Sentence split ──
// Break at [.?!…] followed by whitespace, keeping the punctuation with the
// preceding sentence. Handles both `...` (3 ASCII dots) and `…` (U+2026).
function splitSentences(text) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed
    .split(/(?<=[.?!…])(?=\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
const sentences = splitSentences(scriptText);
if (sentences.length === 0) {
  console.log('No sentences detected — nothing to tag.');
  process.exit(0);
}

// ── Allowed tags — the ones EL v3 reliably interprets for narration ──
const ALLOWED = [
  'dramatic', 'serious', 'confident', 'excited',
  'inspirational', 'motivational', 'mysterious', 'whispers',
  'playful', 'calm', 'sad', 'happy',
  'professional', 'soft', 'energetic',
];

function validate(tag) {
  const raw = (tag || '').trim();
  if (!raw) return '';
  const m = raw.match(/^\[([a-z]+)\]$/i);
  if (!m) return '';
  const inside = m[1].toLowerCase();
  if (!ALLOWED.includes(inside)) return '';
  return `[${inside}]`;
}

// ── Build director prompt ──
const allowedList = ALLOWED.map((e) => `[${e}]`).join(', ');
const sentencesBlock = sentences.map((s, i) => `${i}: "${s}"`).join('\n');

const system =
  'You are an audio director for a Vietnamese short-form book-review video. ' +
  'For each sentence of the voiceover, pick ONE ElevenLabs v3 emotion tag ' +
  'from the allowed list, or empty string if neutral. Consider the ' +
  'sentence\'s position in the arc (opening hook, middle body, closing CTA) ' +
  'and its emotional character. Reply with strict JSON only.';

const user = `Allowed tags: ${allowedList}

Guidance:
- Opening hook / imperative / shock value → [dramatic] or [confident] or [serious]
- Suspense before revealing twist → [whispers] or [mysterious]
- Punchline, big number, or surprise → [excited] or [dramatic]
- Identity / self-belief statement → [confident] or [inspirational]
- Closing motivational line or CTA → [motivational] or [inspirational]
- Question / reflection → [serious] or [calm]
- Sad outcome / loss → [sad] or [soft]
- Plain definitional explanation → "" (empty string, neutral)

Rules:
- Vary tags — do NOT return the same tag for every sentence. A monotone series is worse than no tags.
- Neutral ("") is a valid choice for connector/explainer sentences.
- Aim for ~30-40% of sentences with tags, ~60% neutral, so the emphasis lands where it matters.

Sentences to tag (${sentences.length} total):
${sentencesBlock}

Return strict JSON: {"tags": ["[dramatic]", "", "[whispers]", ...]}
The tags array MUST have exactly ${sentences.length} entries in the same order.`;

console.log(`Emotion director for "${outName}" — ${sentences.length} sentences…`);
const startedAt = Date.now();

// ── Call Pollinations text with retry ──
async function callDirector(attempt = 1) {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  if (res.ok) return res;
  if (res.status === 429 && attempt <= 5) {
    const wait = Math.min(30000, 4000 * attempt);
    console.log(`  ⋯ rate-limited (429), retry ${attempt}/5 in ${wait / 1000}s…`);
    await new Promise((r) => setTimeout(r, wait));
    return callDirector(attempt + 1);
  }
  console.error(`✗ Pollinations text ${res.status}: ${(await res.text()).slice(0, 500)}`);
  process.exit(1);
}

const res = await callDirector();
const body = await res.json();
const raw = body.choices?.[0]?.message?.content?.trim();
if (!raw) {
  console.error(`✗ Empty response. Body:\n${JSON.stringify(body, null, 2).slice(0, 1200)}`);
  process.exit(1);
}

const stripped = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
let parsed;
try {
  parsed = JSON.parse(stripped);
} catch (e) {
  console.error(`✗ Invalid JSON:\n${stripped.slice(0, 500)}\n${e.message}`);
  process.exit(1);
}

// ── Normalize + validate ──
const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
if (rawTags.length !== sentences.length) {
  console.warn(
    `⚠ Director returned ${rawTags.length} tags for ${sentences.length} sentences ` +
      `— missing entries default to neutral.`,
  );
}

const tagged = sentences.map((text, i) => ({
  text,
  tag: validate(rawTags[i]),
}));

const withTagCount = tagged.filter((t) => t.tag).length;

// ── Save ──
const outPath = path.join(ROOT, 'public', `${outName}-tags.json`);
fs.writeFileSync(
  outPath,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), sentences: tagged },
    null,
    2,
  ) + '\n',
);

console.log(
  `\n  ✓ ${((Date.now() - startedAt) / 1000).toFixed(1)}s — ` +
    `${withTagCount}/${sentences.length} sentences tagged, ` +
    `${sentences.length - withTagCount} neutral`,
);
console.log(`  → ${path.relative(ROOT, outPath)}`);

// Show first few for eyeballing
const preview = tagged.slice(0, 5);
console.log('\n  Preview:');
for (const t of preview) {
  const tagStr = t.tag ? `${t.tag.padEnd(15)}` : '(neutral)'.padEnd(15);
  console.log(`    ${tagStr}  ${t.text.slice(0, 60)}${t.text.length > 60 ? '…' : ''}`);
}
