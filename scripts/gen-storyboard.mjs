#!/usr/bin/env node
/**
 * gen-storyboard — director-mode LLM call for one episode.
 *
 * Instead of asking the LLM to write image prompts one-at-a-time (isolated,
 * abstract), we send the WHOLE script + style bible + scene time windows in
 * a single call and get back a coherent storyboard: recurring protagonist,
 * consistent setting, narrative arc awareness.
 *
 * The output is `public/<id>-storyboard.json` — a human-readable file the
 * user can inspect + edit before Flux renders. `gen-images.mjs` reads this
 * for its prompts.
 *
 * Usage:
 *   node scripts/gen-storyboard.mjs <episode-id>
 *   node scripts/gen-storyboard.mjs <episode-id> --force  (overwrite existing)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── .env loader (matches gen-voice.mjs) ──
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

// ── Args ──
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = new Set(args.filter((a) => a.startsWith('--')));
const episodeId = positional[0];
const FORCE = flags.has('--force');

if (!episodeId) {
  console.error('Usage: node scripts/gen-storyboard.mjs <episode-id> [--force]');
  process.exit(1);
}

// ── Load episode + collect what we need ──
const episodePath = path.join(ROOT, 'episodes', `${episodeId}.json`);
if (!fs.existsSync(episodePath)) {
  console.error(`Episode not found: ${episodePath}`);
  process.exit(1);
}
const episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));

const storyboardPath = path.join(ROOT, 'public', `${episodeId}-storyboard.json`);
if (fs.existsSync(storyboardPath) && !FORCE) {
  console.log(`Storyboard already exists: ${path.relative(ROOT, storyboardPath)}`);
  console.log(`  Use --force to regenerate.`);
  process.exit(0);
}

// Collect imageScene entries with their absolute scene index
const imageScenes = [];
(episode.scenes || []).forEach((scene, idx) => {
  if (scene.type === 'imageScene') {
    imageScenes.push({ sceneIndex: idx, scene });
  }
});

if (imageScenes.length === 0) {
  console.log(`No imageScene entries in ${episodeId}. Nothing to storyboard.`);
  process.exit(0);
}

// Grab the full script text (voice-based path derivation, matches gen-voice)
function findScript() {
  const voiceBase = (episode.voice?.file || '').replace(/\.(m4a|mp3|wav|aac)$/i, '');
  const stem = voiceBase.replace(/-voice$/, '');
  const candidates = [
    path.join(ROOT, 'public', `${episodeId}-script.txt`),
    path.join(ROOT, 'public', `${stem}-script.txt`),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}
const scriptPath = findScript();
const scriptText = scriptPath ? fs.readFileSync(scriptPath, 'utf-8').trim() : null;

if (!scriptText) {
  console.warn(
    `⚠ No script.txt found — director will only see captions from imageScene windows.\n` +
      `  For best results, save the full script to public/${episodeId}-script.txt`,
  );
}

// Which captions fall inside each imageScene's [from..to] window?
function captionsInWindow(from, to) {
  return (episode.captions ?? [])
    .filter((c) => c.from < to && c.to > from)
    .map((c) => c.text);
}

// Build the scene list the LLM will fill in
const sceneBriefs = imageScenes.map(({ sceneIndex, scene }) => ({
  sceneIndex,
  from: scene.from,
  to: scene.to,
  durationSec: Math.round((scene.to - scene.from) * 100) / 100,
  captions: captionsInWindow(scene.from, scene.to),
  note: scene.prompt ? `USER PROMPT (respect exactly): ${scene.prompt}` : undefined,
}));

// ── Build director prompt ──
const bible = episode.styleBible ?? {};
const bibleLines = [];
if (bible.protagonist) bibleLines.push(`Protagonist: ${bible.protagonist}`);
if (bible.style) bibleLines.push(`Art style: ${bible.style}`);
if (bible.avoid) bibleLines.push(`Avoid: ${bible.avoid}`);
const bibleBlock = bibleLines.length ? `\nStyle bible:\n${bibleLines.map((l) => `- ${l}`).join('\n')}\n` : '';

const scenesJson = JSON.stringify(sceneBriefs, null, 2);

const system = `You are a storyboard director for a Vietnamese short-form book-review video (9:16, ~60 seconds, TikTok/Reels).

You will be given (1) the FULL spoken script, (2) a style bible, (3) a list of scene time windows with the captions that fall inside them.

Your job: write ONE image prompt (in English) for each scene, forming a COHERENT VISUAL NARRATIVE across the whole video. Not isolated illustrations — a story with:

- A SINGLE recurring protagonist. Describe them physically in your first prompt and refer back consistently in every later prompt ("the same young Vietnamese man...").
- A SPECIFIC setting or setting sequence. Not "generic office" — pick a real place the video plausibly happens (a hospital corridor, a locker-lined school hallway, a cluttered bedroom at night).
- Emotional arc awareness. Opening establishes, middle escalates, climax pays off. The image should MATCH where in the arc that scene sits, not be interchangeable.
- Concrete detail. Bad: "a person in thought". Good: "a young man slumped on hospital-corridor bench at 2am, phone glowing in his cupped hands, empty plastic chairs stretching down the hall".

Each prompt must be:
- 25-45 words, one flowing sentence, no bullet lists, no line breaks
- English (Pollinations Flux prefers English prompts)
- Zero text/letters/logos in the image
- Match the style bible exactly

Return a JSON object with this shape (no markdown, no preamble):
{
  "protagonistNote": "one-line description of the recurring character",
  "settingNote": "one-line description of where the story takes place",
  "arc": "one-line summary of the emotional arc",
  "scenes": [
    { "sceneIndex": 0, "prompt": "...", "reasoning": "one-line why this shot at this beat" },
    { "sceneIndex": 2, "prompt": "...", "reasoning": "..." }
  ]
}

Keep sceneIndex matching the input exactly.`;

const user = `Book: ${episode.book?.title ?? '(unknown)'} by ${episode.book?.author ?? '(unknown)'} — genre: ${episode.book?.genre ?? '(unknown)'}
${bibleBlock}
Full script (spoken narration):
"""
${scriptText || '(no script.txt available — infer from captions only)'}
"""

Scenes to storyboard:
${scenesJson}

Return the storyboard JSON now.`;

console.log(`Director-mode LLM call for "${episodeId}"…`);
console.log(`  ${imageScenes.length} imageScene entries, ${scriptText?.length ?? 0} chars of script`);

// ── Call Pollinations text (OpenAI-compatible) with retry ──
// Pollinations allows 1 concurrent request per IP and returns 429 with a
// "queue full" body. Retry with exponential backoff up to 5 attempts.
const POLLINATIONS_TEXT = 'https://text.pollinations.ai/openai';
const startedAt = Date.now();

async function callDirector(attempt = 1) {
  const res = await fetch(POLLINATIONS_TEXT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // openai-fast is the non-reasoning variant — the reasoning model
      // burns all its output tokens on hidden reasoning and returns empty
      // content, breaking our JSON pipeline. Fast model returns straight JSON.
      model: 'openai-fast',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.75,
      // Pollinations openai-fast is a reasoning model that burns tokens on
      // hidden thinking before writing content — 2048 wasn't enough for both.
      // 8192 gives ~6000 tokens for reasoning + plenty for the JSON answer.
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      // Some reasoning-model proxies honor these hints to shrink thinking.
      reasoning_effort: 'low',
    }),
  });
  if (res.ok) return res;
  if (res.status === 429 && attempt <= 5) {
    const wait = Math.min(30000, 4000 * attempt); // 4s, 8s, 12s, 16s, 20s
    console.log(`  ⋯ rate-limited (429), retry ${attempt}/5 in ${wait / 1000}s…`);
    await new Promise((r) => setTimeout(r, wait));
    return callDirector(attempt + 1);
  }
  console.error(`✗ Pollinations text ${res.status}: ${(await res.text()).slice(0, 500)}`);
  process.exit(1);
}

const res = await callDirector();
const bodyText = await res.text();
let bodyJson;
try {
  bodyJson = JSON.parse(bodyText);
} catch {
  console.error(`✗ Non-JSON response from Pollinations:\n${bodyText.slice(0, 800)}`);
  process.exit(1);
}
// Reasoning-model quirk: sometimes final JSON is in `reasoning` field
// instead of `content`. Try content first, fall back to reasoning (last {…}
// object). If both empty, that's model failure — retry.
const msg = bodyJson.choices?.[0]?.message ?? {};
let raw = msg.content?.trim();
if (!raw && typeof msg.reasoning === 'string') {
  const m = msg.reasoning.match(/\{[\s\S]*\}\s*$/);
  if (m) raw = m[0];
}
if (!raw) {
  console.error(
    `✗ No JSON in response. finish_reason=${bodyJson.choices?.[0]?.finish_reason}. ` +
      `usage=${JSON.stringify(bodyJson.usage)}. ` +
      `Try re-running — reasoning model sometimes runs out of tokens.`,
  );
  process.exit(1);
}
// Some models wrap JSON in ```json fences — strip if present
const stripped = raw
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

let parsed;
try {
  parsed = JSON.parse(stripped);
} catch (e) {
  console.error(`✗ Director returned invalid JSON:\n${stripped.slice(0, 500)}\n\nError: ${e.message}`);
  console.error('Retry: the model sometimes wraps output oddly. Run again.');
  process.exit(1);
}

// Sanity-check: every input sceneIndex should have a prompt
const inputIdx = new Set(sceneBriefs.map((s) => s.sceneIndex));
const outputIdx = new Set((parsed.scenes ?? []).map((s) => s.sceneIndex));
const missing = [...inputIdx].filter((i) => !outputIdx.has(i));
if (missing.length > 0) {
  console.warn(`⚠ Director skipped sceneIndex: ${missing.join(', ')} — gen-images will fall back to per-scene call for those`);
}

// ── Save storyboard.json ──
const storyboard = {
  episodeId,
  generatedAt: new Date().toISOString(),
  protagonistNote: parsed.protagonistNote ?? null,
  settingNote: parsed.settingNote ?? null,
  arc: parsed.arc ?? null,
  scenes: parsed.scenes ?? [],
};

fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2) + '\n');

console.log(`\n  ✓ ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
console.log(`  → ${path.relative(ROOT, storyboardPath)}\n`);
if (storyboard.protagonistNote) console.log(`  Protagonist: ${storyboard.protagonistNote}`);
if (storyboard.settingNote) console.log(`  Setting:     ${storyboard.settingNote}`);
if (storyboard.arc) console.log(`  Arc:         ${storyboard.arc}`);
console.log(`\n  ${storyboard.scenes.length} scenes storyboarded. Review + edit prompts if needed, then run:`);
console.log(`    npm run gen-images -- ${episodeId}`);
