#!/usr/bin/env node
/**
 * auto — end-to-end pipeline for one (or all) book-review episodes.
 *
 * Steps per episode:
 *   1. Ensure ElevenLabs voice track exists — regenerate from script.txt if missing.
 *   2. Ensure voice is in .m4a form the composition expects (transcode if needed).
 *   3. Render video composition → out/<name>-video.mp4
 *   4. Render thumbnail composition → out/<name>-thumbnail.jpg
 *   5. ffmpeg-splice thumbnail as 0.1s cover onto video → out/<name>.mp4
 *
 * Usage:
 *   npm run auto              # render every episode in episodes.config.mjs
 *   npm run auto -- ei        # render just the "ei" episode
 *   npm run auto -- ei --force-voice   # regen voice even if it exists
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Load .env for ElevenLabs settings ──
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
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const targetId = positional[0]; // optional
const forceVoice = flags.has('--force-voice');

// ── Discover episodes from episodes/*.json ──
// Each JSON is a complete Episode. Paths + composition IDs are derived by
// convention from `episode.id` + `episode.voice.file` — no separate config
// file needed. To add an episode:
//   1. Write public/<id>-script.txt (only needed if you'll regen voice)
//   2. Write episodes/<id>.json
//   3. Add it to episodes/index.ts so Remotion registers the composition
//   4. Run `npm run auto -- <id>`
function discoverEpisodes() {
  const dir = path.join(ROOT, 'episodes');
  const out = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const jsonPath = path.join(dir, file);
    let ep;
    try {
      ep = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
      console.warn(`⚠ Skipping invalid JSON: ${file} (${e.message})`);
      continue;
    }
    if (!ep.id) continue;

    // Voice file → base (strip extension) → script stem (strip -voice suffix)
    //   voice.file "ei-voice.m4a" → base "ei-voice" → stem "ei" → public/ei-script.txt
    const voiceFile = ep.voice?.file ?? `${ep.id}-voice.m4a`;
    const voiceBase = voiceFile.replace(/\.(m4a|mp3|wav|aac)$/i, '');
    const scriptStem = voiceBase.replace(/-voice$/, '');
    const upperId = ep.id.toUpperCase();

    out[ep.id] = {
      script: `public/${scriptStem}-script.txt`,
      voice: voiceBase,
      videoComposition: `Book-Review-${upperId}-Narrative`,
      thumbnailComposition: `Book-Review-${upperId}-Thumbnail`,
      outputName: ep.id,
    };
  }
  return out;
}

const EPISODES = discoverEpisodes();
if (Object.keys(EPISODES).length === 0) {
  console.error('No episodes/*.json found. Nothing to render.');
  process.exit(1);
}

const targets = targetId
  ? EPISODES[targetId]
    ? { [targetId]: EPISODES[targetId] }
    : (() => {
        console.error(`Unknown episode "${targetId}". Available: ${Object.keys(EPISODES).join(', ')}`);
        process.exit(1);
      })()
  : EPISODES;

// ── Helpers ──
function run(cmd, args, label, { allowFail = false, quiet = false } = {}) {
  if (!quiet) console.log(`  ▶ ${label}`);
  const t0 = Date.now();
  const r = spawnSync(cmd, args, {
    stdio: quiet ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    cwd: ROOT,
  });
  if (r.status !== 0) {
    if (allowFail) return false;
    if (quiet && r.stderr) process.stderr.write(r.stderr);
    console.error(`  ✗ ${label} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
  if (!quiet) console.log(`  ✓ ${label} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return true;
}

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

function episodeHasImageScenes(id) {
  const jsonPath = path.join(ROOT, 'episodes', `${id}.json`);
  if (!fs.existsSync(jsonPath)) return false;
  try {
    const ep = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    return Array.isArray(ep.scenes) && ep.scenes.some((sc) => sc.type === 'imageScene');
  } catch {
    return false;
  }
}

const outDir = path.join(ROOT, 'out');
fs.mkdirSync(outDir, { recursive: true });

// ── Pipeline for one episode ──
async function runEpisode(id, cfg) {
  console.log(`\n═══ Episode: ${id} ═══════════════════════════════════════`);

  // 1. Voice existence check
  const voiceBase = cfg.voice; // e.g. "ei-voice"
  const voiceM4a = path.join('public', `${voiceBase}.m4a`);
  const voiceMp3 = path.join('public', `${voiceBase}.mp3`);
  const scriptPath = cfg.script;

  const needsVoice = forceVoice || (!exists(voiceM4a) && !exists(voiceMp3));

  if (needsVoice) {
    if (!exists(scriptPath)) {
      console.error(`✗ Missing script for ${id}: ${scriptPath}`);
      process.exit(1);
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error(`✗ ELEVENLABS_API_KEY missing in .env — cannot regen voice for ${id}`);
      process.exit(1);
    }
    console.log(`  ⋯ Voice missing — regenerating from ${scriptPath}…`);
    run('node', ['scripts/gen-voice.mjs', scriptPath, voiceBase], `gen-voice for ${id}`);
  } else {
    console.log(`  ✓ Voice track already present`);
  }

  // 2. Ensure m4a form exists (composition references it by convention).
  //    If only mp3 was generated, transcode to m4a losslessly-enough for our needs.
  if (!exists(voiceM4a) && exists(voiceMp3)) {
    run(
      'ffmpeg',
      ['-y', '-i', voiceMp3, '-c:a', 'aac', '-b:a', '192k', voiceM4a],
      `Transcoding ${voiceMp3} → ${voiceM4a}`,
      { quiet: true },
    );
  }

  // 3. If the episode uses `imageScene` entries, generate any missing images
  //    via Pollinations Flux. Skipped when episode JSON has none.
  if (episodeHasImageScenes(id)) {
    console.log(`  ⋯ imageScene detected — checking generated images…`);
    run(
      'node',
      ['scripts/gen-images.mjs', id],
      `gen-images for ${id}`,
      { allowFail: true },
    );
  }

  // 4. Render video + thumbnail + splice in one shot via render-with-cover.
  run(
    'node',
    [
      'scripts/render-with-cover.mjs',
      cfg.videoComposition,
      cfg.thumbnailComposition,
      cfg.outputName,
    ],
    `Render + cover splice for ${id}`,
  );

  const finalPath = path.join('out', `${cfg.outputName}.mp4`);
  const size = (fs.statSync(path.join(ROOT, finalPath)).size / 1024 / 1024).toFixed(1);
  console.log(`  ✓ ${finalPath}  (${size} MB)`);

  // 4. Export to external drive with a "YYYY-MM-DD HHMMSS - <title>.mp4" name.
  //    Read the episode title from episodes/<id>.json for the filename.
  const exportDir = process.env.EXPORT_DIR;
  if (exportDir) {
    exportToDrive({
      id,
      exportDir,
      finalPath: path.join(ROOT, finalPath),
    });
  }
}

function exportToDrive({ id, exportDir, finalPath }) {
  if (!fs.existsSync(exportDir)) {
    console.log(`  ⋯ EXPORT_DIR "${exportDir}" not mounted — skipping export`);
    return;
  }
  const episodeJsonPath = path.join(ROOT, 'episodes', `${id}.json`);
  let title = id;
  if (fs.existsSync(episodeJsonPath)) {
    try {
      const ep = JSON.parse(fs.readFileSync(episodeJsonPath, 'utf-8'));
      if (ep.title) title = ep.title;
    } catch {
      /* fall back to id */
    }
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  // macOS APFS handles Vietnamese characters fine — only strip filesystem-hostile ones.
  const safeTitle = title.replace(/[\/\\:*?"<>|]/g, '').trim();
  const filename = `${stamp} - ${safeTitle}.mp4`;
  const destPath = path.join(exportDir, filename);
  fs.copyFileSync(finalPath, destPath);
  console.log(`  ✓ Exported → ${destPath}`);
}

// ── Run all requested episodes ──
const start = Date.now();
for (const [id, cfg] of Object.entries(targets)) {
  await runEpisode(id, cfg);
}

console.log(
  `\n═══════════════════════════════════════════════════════════\n` +
  `  All done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`,
);
