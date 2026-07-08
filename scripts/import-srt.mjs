#!/usr/bin/env node
/**
 * import-srt — convert `public/<id>-voice.srt` into `episode.captions[]`
 * entries and (optionally) merge them into `episodes/<id>.json`.
 *
 * Why: after `gen-voice.mjs` runs, ElevenLabs alignment gives per-sentence
 * timing in the SRT — but you'd have to copy 25+ entries by hand into the
 * JSON with the right shape, plus decide on emphasis/size/align each time.
 * This script does that mechanical work.
 *
 * With `--auto-hint`, it also asks Pollinations text (OpenAI-compatible,
 * no API key) to suggest an emphasis word for each caption. You still get
 * final say — the output is JSON you review before merging.
 *
 * Usage:
 *   node scripts/import-srt.mjs <id>
 *      → prints captions[] JSON to stdout (paste into episode.json manually)
 *
 *   node scripts/import-srt.mjs <id> --write
 *      → merges into episodes/<id>.json (backs up existing captions to
 *        .captions.bak before overwriting)
 *
 *   node scripts/import-srt.mjs <id> --auto-hint
 *      → also runs an LLM per line to suggest emphasis words (slower,
 *        adds ~30s for a 30-line SRT because of Pollinations throttle)
 *
 * Example:
 *   npm run import-srt -- ei-atomic --write --auto-hint
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = new Set(args.filter((a) => a.startsWith('--')));
const episodeId = positional[0];

if (!episodeId) {
  console.error('Usage: node scripts/import-srt.mjs <episode-id> [--write] [--auto-hint]');
  process.exit(1);
}

const WRITE = flags.has('--write');
const AUTO_HINT = flags.has('--auto-hint');

// ── Locate SRT ──
// Try public/<id>-voice.srt first (default from gen-voice.mjs),
// then public/<voice-base>.srt using the episode's voice.file.
function findSrt(id) {
  const first = path.join(ROOT, 'public', `${id}-voice.srt`);
  if (fs.existsSync(first)) return first;
  const jsonPath = path.join(ROOT, 'episodes', `${id}.json`);
  if (fs.existsSync(jsonPath)) {
    const ep = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const voiceBase = (ep.voice?.file || '').replace(/\.(m4a|mp3|wav|aac)$/i, '');
    const alt = path.join(ROOT, 'public', `${voiceBase}.srt`);
    if (fs.existsSync(alt)) return alt;
  }
  return null;
}

const srtPath = findSrt(episodeId);
if (!srtPath) {
  console.error(`✗ No SRT found for "${episodeId}". Expected public/${episodeId}-voice.srt`);
  process.exit(1);
}
console.log(`Reading ${path.relative(ROOT, srtPath)}…`);

// ── Parse SRT ──
function parseSrt(srtText) {
  const blocks = srtText.replace(/\r/g, '').trim().split(/\n\n+/);
  const entries = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    // Line 0: index. Line 1: timestamp. Line 2+: text.
    const ts = lines[1].match(/(\d+):(\d+):(\d+),(\d+)\s+-->\s+(\d+):(\d+):(\d+),(\d+)/);
    if (!ts) continue;
    const from = toSec(+ts[1], +ts[2], +ts[3], +ts[4]);
    const to = toSec(+ts[5], +ts[6], +ts[7], +ts[8]);
    const text = lines.slice(2).join(' ').trim();
    if (!text) continue;
    entries.push({ from, to, text });
  }
  return entries;
}
const toSec = (h, m, s, ms) => h * 3600 + m * 60 + s + ms / 1000;
const round = (n) => Math.round(n * 100) / 100;

const srt = parseSrt(fs.readFileSync(srtPath, 'utf-8'));
if (srt.length === 0) {
  console.error('SRT parse yielded no entries.');
  process.exit(1);
}
console.log(`Parsed ${srt.length} SRT entries.`);

// ── Heuristic size + align ──
// short + question-ish → title, center, no emphasis
// medium → heading, alternating top/bottom
// long → subtitle, top
function heuristicShape(text, i) {
  const words = text.split(/\s+/).length;
  const isQuestion = /[?…]$/.test(text);
  const size = words <= 5 ? 'title' : words <= 9 ? 'heading' : 'subtitle';
  // Alternate top/bottom so consecutive captions don't stack in same spot
  const align = isQuestion || words <= 5 ? 'center' : i % 2 === 0 ? 'top' : 'bottom';
  return { size, align };
}

// ── Optional LLM emphasis hint (Pollinations text) ──
const POLLINATIONS_TEXT = 'https://text.pollinations.ai/openai';
let lastCallAt = 0;

async function suggestEmphasis(text) {
  // Throttle to 1.5s between LLM calls to avoid rate-limit spikes.
  const wait = 1500 - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();

  const body = {
    model: 'openai',
    messages: [
      {
        role: 'system',
        content:
          "You pick ONE phrase (1-3 words) from a Vietnamese sentence that should be visually highlighted in gold italics — the emotional or semantic anchor. " +
          "Return ONLY the phrase, exact match to the sentence (same casing, same diacritics). " +
          "If no phrase clearly deserves emphasis, return the literal word 'none'.",
      },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
  };

  try {
    const res = await fetch(POLLINATIONS_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    let msg = data.choices?.[0]?.message?.content?.trim() ?? '';
    msg = msg.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
    if (!msg || msg.toLowerCase() === 'none') return null;
    // Sanity: the suggested phrase must actually appear in the source text.
    // Prevents hallucination.
    if (!text.includes(msg)) return null;
    return msg;
  } catch {
    return null;
  }
}

// ── Build captions array ──
const captions = [];
for (let i = 0; i < srt.length; i++) {
  const e = srt[i];
  const { size, align } = heuristicShape(e.text, i);
  const cap = {
    from: round(e.from),
    to: round(e.to),
    text: e.text,
    size,
    align,
  };
  if (AUTO_HINT) {
    process.stdout.write(`  [${i + 1}/${srt.length}] hint…`);
    const emp = await suggestEmphasis(e.text);
    if (emp) cap.emphasis = emp;
    process.stdout.write(emp ? ` ⇒ "${emp}"\n` : ` ⇒ none\n`);
  }
  captions.push(cap);
}

// ── Output ──
const outStr = JSON.stringify(captions, null, 2);

if (!WRITE) {
  console.log('\n─── captions[] ─────────────────────────────────────────────');
  console.log(outStr);
  console.log(
    '\nPaste into episodes/' +
      episodeId +
      '.json (or re-run with --write to merge automatically).',
  );
} else {
  const jsonPath = path.join(ROOT, 'episodes', `${episodeId}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`✗ episodes/${episodeId}.json not found — cannot --write`);
    process.exit(1);
  }
  const ep = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const backup = path.join(ROOT, 'episodes', `${episodeId}.captions.bak.json`);
  fs.writeFileSync(backup, JSON.stringify(ep.captions ?? [], null, 2));
  ep.captions = captions;
  fs.writeFileSync(jsonPath, JSON.stringify(ep, null, 2) + '\n');
  console.log(`\n✓ Merged ${captions.length} captions into ${path.relative(ROOT, jsonPath)}`);
  console.log(`  Old captions backed up to ${path.relative(ROOT, backup)}`);
}
