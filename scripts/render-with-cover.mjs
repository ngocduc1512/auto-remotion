#!/usr/bin/env node
/**
 * render-with-cover — render a Remotion composition and splice a
 * matching thumbnail as a held cover frame at the very start.
 *
 * TikTok / Reels grab the first video frame as feed preview. Burning
 * the designed thumbnail in as the opening ~0.1s ensures the right
 * image shows up in feed without needing each platform's cover UI.
 *
 * Usage:
 *   node scripts/render-with-cover.mjs <video-comp-id> <thumbnail-comp-id> <out-name>
 *
 * Example:
 *   node scripts/render-with-cover.mjs Book-Review-EI-Narrative Book-Review-EI-Thumbnail ei
 *
 * Writes:
 *   out/<out-name>-video.mp4     — raw video render
 *   out/<out-name>-thumbnail.jpg — the designed cover
 *   out/<out-name>.mp4           — final video with cover spliced at frame 0
 *
 * Env:
 *   COVER_HOLD_SEC (default 0.1) — how long the cover frame is held
 *   THUMBNAIL_FRAME (default 40) — which composition frame to render as thumb
 *                                  (springs/animations settle by ~30 frames)
 */

import { spawnSync } from 'node:child_process';
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

const [, , videoId, thumbnailId, outName] = process.argv;
if (!videoId || !thumbnailId || !outName) {
  console.error(
    'Usage: node scripts/render-with-cover.mjs <video-comp> <thumbnail-comp> <out-name>',
  );
  console.error(
    'Example: node scripts/render-with-cover.mjs Book-Review-EI-Narrative Book-Review-EI-Thumbnail ei',
  );
  process.exit(1);
}

const holdSec = parseFloat(process.env.COVER_HOLD_SEC || '0.1');
const thumbFrame = parseInt(process.env.THUMBNAIL_FRAME || '40', 10);

const outDir = path.join(ROOT, 'out');
fs.mkdirSync(outDir, { recursive: true });
const videoPath = path.join(outDir, `${outName}-video.mp4`);
const thumbPath = path.join(outDir, `${outName}-thumbnail.jpg`);
const finalPath = path.join(outDir, `${outName}.mp4`);

function run(cmd, args, label) {
  console.log(`▶ ${label}`);
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) {
    console.error(`✗ ${label} failed with exit code ${r.status}`);
    process.exit(r.status ?? 1);
  }
  console.log(`  ✓ ${label} in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}

// ── Step 1: render the video ──
run('npx', [
  'remotion', 'render', videoId, videoPath,
  '--concurrency=4', '--log=info',
], `Rendering video: ${videoId}`);

// ── Step 2: render the thumbnail still ──
run('npx', [
  'remotion', 'still', thumbnailId, thumbPath,
  `--frame=${thumbFrame}`, '--image-format=jpeg', '--jpeg-quality=92',
], `Rendering thumbnail: ${thumbnailId} @ frame ${thumbFrame}`);

// ── Step 3: probe video for width/height/fps so ffmpeg can match ──
function ffprobe(field) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', `stream=${field}`,
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ], { encoding: 'utf-8' });
  return (r.stdout || '').trim();
}
const width = ffprobe('width');
const height = ffprobe('height');
const rateStr = ffprobe('r_frame_rate'); // "30/1"
const [num, den] = rateStr.split('/');
const fps = Math.round(parseFloat(num) / parseFloat(den || '1'));
console.log(`Video: ${width}x${height} @ ${fps}fps`);

// ── Step 4: splice thumbnail as 0.1s cover, concat with main ──
// Filter graph: scale/pad cover to match video, add silent audio for the
// cover segment, concat cover(v+a) with main(v+a) into single stream.
const filter =
  `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
  `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps},format=yuv420p[cov];` +
  `[cov][2:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]`;

run('ffmpeg', [
  '-y',
  '-loop', '1', '-t', holdSec.toFixed(3), '-i', thumbPath,
  '-i', videoPath,
  '-f', 'lavfi', '-t', holdSec.toFixed(3), '-i', 'anullsrc=r=44100:cl=stereo',
  '-filter_complex', filter,
  '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
  '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart',
  finalPath,
], `Splicing cover (${holdSec}s hold) into final MP4`);

// ── Summary ──
const finalStat = fs.statSync(finalPath);
const finalMb = (finalStat.size / 1024 / 1024).toFixed(1);
console.log('┌─────────────────────────────────────────────────');
console.log(`│  Final: ${path.relative(ROOT, finalPath)}  (${finalMb} MB)`);
console.log(`│  Cover: ${path.relative(ROOT, thumbPath)}`);
console.log(`│  First ${holdSec}s = designed thumbnail — TikTok/Reels`);
console.log('│  will grab it as the feed preview.');
console.log('└─────────────────────────────────────────────────');
