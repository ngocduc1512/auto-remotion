#!/usr/bin/env node
/**
 * gen-images — for every `imageScene` in an episode, generate a Flux image
 * via Pollinations.ai and save it under `public/<id>-images/`.
 *
 * Two prompt sources:
 *   (a) Explicit — scene.prompt is set → use verbatim.
 *   (b) Auto — scene.autoPrompt=true → LLM writes prompt from captions
 *       overlapping this scene's [from..to] window. Uses Pollinations text
 *       API (OpenAI-compatible, no key required).
 *
 * The global `episode.imageStyle` string is appended to every prompt to
 * keep the whole video visually cohesive.
 *
 * Pollinations rate-limits burst traffic; we throttle to 5s between calls.
 * Existing image files are skipped so you can re-run without repaying time
 * on interruptions.
 *
 * Usage:
 *   node scripts/gen-images.mjs <episode-id>
 *   node scripts/gen-images.mjs <episode-id> --force  (regen all)
 *
 * Example:
 *   npm run gen-images -- ei-hook
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const [, , episodeId, ...restArgs] = process.argv;
if (!episodeId) {
  console.error('Usage: node scripts/gen-images.mjs <episode-id> [--force]');
  process.exit(1);
}
const FORCE = restArgs.includes('--force');

// ── Load episode JSON ──
const episodePath = path.join(ROOT, 'episodes', `${episodeId}.json`);
if (!fs.existsSync(episodePath)) {
  console.error(`Episode not found: ${episodePath}`);
  process.exit(1);
}
const episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));

// ── Collect imageScene entries with their scene index ──
const imageScenes = [];
episode.scenes.forEach((scene, idx) => {
  if (scene.type === 'imageScene') {
    imageScenes.push({ scene, index: idx });
  }
});

if (imageScenes.length === 0) {
  console.log(`No imageScene in ${episodeId}. Nothing to do.`);
  process.exit(0);
}

console.log(`Episode ${episodeId}: ${imageScenes.length} image scene(s) to process.\n`);

// ── Output dir ──
const imgDir = path.join(ROOT, 'public', `${episodeId}-images`);
fs.mkdirSync(imgDir, { recursive: true });

// ── Helpers ──
const POLLINATIONS_IMG = 'https://image.pollinations.ai/prompt/';
const POLLINATIONS_TEXT = 'https://text.pollinations.ai/openai';
const MIN_INTERVAL_MS = 5000;
let lastCallAt = 0;

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

/**
 * Ask Pollinations text (OpenAI-compatible) to convert a caption into a
 * visual image prompt. Keeps it English (Pollinations Flux prefers English)
 * and camera-friendly.
 */
async function generateAutoPrompt(captionsInScene, episodeContext) {
  const captionText = captionsInScene.map((c) => c.text).join(' ');
  const bible = episodeContext.styleBible ?? {};

  const bibleLines = [];
  if (bible.protagonist)
    bibleLines.push(`RECURRING SUBJECT (mention this exact person in every prompt so the same character appears across scenes): ${bible.protagonist}`);
  if (bible.style)
    bibleLines.push(`ART STYLE (must match): ${bible.style}`);
  if (bible.avoid)
    bibleLines.push(`AVOID: ${bible.avoid}`);

  const bibleBlock = bibleLines.length
    ? `\n\nSTYLE BIBLE — respect on every prompt:\n${bibleLines.map((l) => `- ${l}`).join('\n')}`
    : '';

  const system =
    "You are a storyboard artist writing prompts for a text-to-image model (Flux). " +
    "Given a short spoken caption from a Vietnamese book-review video, respond with ONE image prompt in English. " +
    "The prompt must: (1) describe a concrete, illustrative scene showing what the caption talks about — not text, not a book cover; " +
    "(2) name the subject, setting, mood, and a small telling detail; " +
    "(3) fit a 9:16 vertical composition; (4) be 20-40 words max, no lists, no line breaks; " +
    "(5) never include actual words/letters/typography in the image. Reply with ONLY the prompt, no preamble." +
    bibleBlock;

  const user =
    `Book: ${episodeContext.title} (${episodeContext.genre}). Caption: "${captionText}"`;

  const body = {
    model: 'openai',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.7,
  };

  const res = await fetch(POLLINATIONS_TEXT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Pollinations text ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message?.content?.trim();
  if (!msg) throw new Error('No content in Pollinations text response');
  // Strip surrounding quotes if the model returned "..."
  return msg.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ');
}

/**
 * Fetch an image from Pollinations Flux and save to `outPath`.
 * Returns file size in bytes.
 */
async function generateImage(prompt, seed, outPath) {
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width: '1080',
    height: '1920',
    model: 'flux',
    nologo: 'true',
    enhance: 'false',
    seed: String(seed),
  });
  const url = `${POLLINATIONS_IMG}${encoded}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations image ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

/** Captions that overlap a scene's [from..to] window. */
function captionsInWindow(captions, from, to) {
  return captions.filter((c) => c.from < to && c.to > from);
}

// ── Main loop ──
// Compose a final style suffix appended to every Flux prompt.
// styleBible.style + styleBible.avoid override imageStyle if present, so an
// episode with a full style bible drives Flux via the bible alone.
const bible = episode.styleBible ?? {};
const bibleStyleSuffix = [bible.style, bible.avoid && `Avoid: ${bible.avoid}`]
  .filter(Boolean).join('. ');
const globalStyle = bibleStyleSuffix || episode.imageStyle ||
  'editorial illustration, warm cinematic palette, soft grain, subtle vignette, 9:16 vertical composition, no text';

const episodeContext = {
  title: episode.title,
  genre: episode.book?.genre ?? '',
  styleBible: episode.styleBible,
};

// ── Load storyboard if present ──────────────────────────────────────────
// Director-mode: one LLM call has already written all scene prompts with
// continuity. Auto-generate the storyboard if missing (or user can review
// + edit public/<id>-storyboard.json before running this script).
const storyboardPath = path.join(ROOT, 'public', `${episodeId}-storyboard.json`);
let storyboardMap = new Map(); // sceneIndex → prompt

async function ensureStoryboard() {
  if (fs.existsSync(storyboardPath)) return;
  const anyAuto = imageScenes.some(({ scene }) => scene.autoPrompt && !scene.prompt);
  if (!anyAuto) return; // all explicit prompts — no director needed
  console.log(`Storyboard missing — running gen-storyboard first…`);
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('node', ['scripts/gen-storyboard.mjs', episodeId], {
    stdio: 'inherit', cwd: ROOT,
  });
  if (r.status !== 0) {
    console.error(`✗ gen-storyboard failed (exit ${r.status}) — falling back to per-scene LLM calls`);
  }
}
await ensureStoryboard();

if (fs.existsSync(storyboardPath)) {
  try {
    const sb = JSON.parse(fs.readFileSync(storyboardPath, 'utf-8'));
    for (const s of sb.scenes ?? []) {
      if (typeof s.sceneIndex === 'number' && s.prompt) {
        storyboardMap.set(s.sceneIndex, s.prompt);
      }
    }
    if (storyboardMap.size > 0) {
      console.log(`Loaded ${storyboardMap.size} director prompt(s) from storyboard.\n`);
    }
  } catch (e) {
    console.warn(`⚠ Bad storyboard JSON — ignoring: ${e.message}`);
  }
}

let created = 0;
let skipped = 0;

for (const { scene, index } of imageScenes) {
  const filename = scene.imageFile
    ? scene.imageFile.split('/').pop()
    : `scene-${String(index).padStart(2, '0')}.jpg`;
  const outPath = path.join(imgDir, filename);

  if (fs.existsSync(outPath) && !FORCE) {
    console.log(`  ⋯ [${index}] skip — already exists: ${path.relative(ROOT, outPath)}`);
    skipped++;
    continue;
  }

  // Resolve prompt — priority:
  //   1. scene.prompt (explicit, user-written)
  //   2. storyboard[index] (director-mode, whole-video context)
  //   3. per-scene LLM call (isolated fallback — original behavior)
  let prompt = scene.prompt;
  let promptSource = 'explicit';
  if (!prompt && storyboardMap.has(index)) {
    prompt = storyboardMap.get(index);
    promptSource = 'director';
  }
  if (!prompt && scene.autoPrompt) {
    const caps = captionsInWindow(episode.captions ?? [], scene.from, scene.to);
    if (caps.length === 0) {
      console.log(`  ✗ [${index}] autoPrompt=true but no captions in window [${scene.from}..${scene.to}] — skipping`);
      continue;
    }
    console.log(`  ⋯ [${index}] fallback per-scene prompt (${caps.length} captions)…`);
    await throttle();
    try {
      prompt = await generateAutoPrompt(caps, episodeContext);
      promptSource = 'per-scene fallback';
      console.log(`      ⇒ "${prompt}"`);
    } catch (e) {
      console.error(`  ✗ [${index}] auto-prompt failed: ${e.message}`);
      continue;
    }
  }
  if (!prompt) {
    console.log(`  ✗ [${index}] no prompt (set scene.prompt, scene.autoPrompt=true, or run gen-storyboard) — skipping`);
    continue;
  }
  if (promptSource === 'director') {
    console.log(`  ⋯ [${index}] using director prompt`);
  }

  const fullPrompt = `${prompt}. ${globalStyle}`;
  const seed = scene.seed ?? (100 + index);

  console.log(`  ⋯ [${index}] Flux… seed=${seed}`);
  await throttle();
  try {
    const size = await generateImage(fullPrompt, seed, outPath);
    console.log(`  ✓ [${index}] ${path.relative(ROOT, outPath)}  (${(size / 1024).toFixed(0)} KB)`);
    created++;
  } catch (e) {
    console.error(`  ✗ [${index}] image gen failed: ${e.message}`);
  }
}

console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
