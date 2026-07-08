#!/usr/bin/env node
/**
 * update-remotion — safely bump every @remotion/* package to the latest
 * matching version, with automatic rollback if a smoke-test render fails.
 *
 * Why this exists: Remotion's runtime + all `@remotion/*` peer packages must
 * share the exact same version, and every release ships breaking-adjacent
 * tweaks (spring config, animation timing, renderer flags). "Just run `npm
 * update` regularly" tends to break the pipeline silently — you notice next
 * time a render looks off. This script proves the new version renders before
 * committing to it.
 *
 * Flow:
 *   1. Read current version from package.json.
 *   2. Query npm for latest.
 *   3. If same → no-op.
 *   4. If different → back up package.json + package-lock.json + node_modules.
 *      (node_modules "backup" is just the current lockfile — we reinstall via
 *      `npm ci` on rollback, which is faster than copying MBs of files.)
 *   5. Run `remotion upgrade` (or npm install fallback).
 *   6. Smoke test: `remotion still Book-Review-EI-Thumbnail`.
 *   7. Success → append to update.log. Failure → restore + `npm ci` → exit 1.
 *
 * Usage:
 *   npm run update              # interactive: prompt before applying major bumps
 *   npm run update -- --yes     # apply without prompt (all severities)
 *   npm run update -- --check   # dry run: report only, no changes
 *   npm run update -- --allow-major  # allow major bumps in --yes mode
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const YES = flags.has('--yes');
const CHECK_ONLY = flags.has('--check');
const ALLOW_MAJOR = flags.has('--allow-major');

const LOG_PATH = path.join(ROOT, '.update.log');
const REMOTION_PKGS = [
  'remotion',
  '@remotion/cli',
  '@remotion/sfx',
  '@remotion/tailwind-v4',
  '@remotion/eslint-config-flat',
];

// ── Helpers ──
function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', ...opts });
}

function currentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return deps.remotion?.replace(/^[\^~]/, '') ?? null;
}

function latestVersion() {
  const r = run('npm', ['view', 'remotion', 'version']);
  if (r.status !== 0) throw new Error(`npm view failed: ${r.stderr}`);
  return r.stdout.trim();
}

/** Semver diff: 'same' | 'patch' | 'minor' | 'major' | 'downgrade' | 'invalid' */
function semverDiff(a, b) {
  const parse = (v) => v.split('.').map((n) => parseInt(n, 10));
  const [aM, am, ap] = parse(a);
  const [bM, bm, bp] = parse(b);
  if ([aM, am, ap, bM, bm, bp].some(Number.isNaN)) return 'invalid';
  if (aM === bM && am === bm && ap === bp) return 'same';
  if (bM > aM) return 'major';
  if (bM < aM) return 'downgrade';
  if (bm > am) return 'minor';
  if (bm < am) return 'downgrade';
  if (bp > ap) return 'patch';
  return 'downgrade';
}

function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(ROOT, '.update-backups', stamp);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  fs.copyFileSync(path.join(ROOT, 'package-lock.json'), path.join(dir, 'package-lock.json'));
  return dir;
}

function restore(backupDir) {
  fs.copyFileSync(path.join(backupDir, 'package.json'), path.join(ROOT, 'package.json'));
  fs.copyFileSync(path.join(backupDir, 'package-lock.json'), path.join(ROOT, 'package-lock.json'));
  console.log('  ⟲ Reinstalling from lockfile…');
  const r = run('npm', ['ci', '--silent'], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('  ✗ npm ci failed during rollback — package-lock.json is restored but node_modules may be out of sync. Run `npm ci` manually.');
  }
}

function log(msg) {
  const line = `${new Date().toISOString()}  ${msg}\n`;
  fs.appendFileSync(LOG_PATH, line);
}

async function confirm(question) {
  if (YES) return true;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const ans = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return ans === 'y' || ans === 'yes';
}

// ── Main ──
const cur = currentVersion();
if (!cur) {
  console.error('Cannot read remotion version from package.json');
  process.exit(1);
}
console.log(`  Current:  ${cur}`);

let latest;
try {
  latest = latestVersion();
} catch (e) {
  console.error(`  ✗ ${e.message}`);
  process.exit(1);
}
console.log(`  Latest:   ${latest}`);

const diff = semverDiff(cur, latest);
if (diff === 'same') {
  console.log('  ✓ Already on latest — nothing to do.');
  process.exit(0);
}
if (diff === 'downgrade') {
  console.log(`  ⋯ Local version is ahead of npm registry — leaving as-is.`);
  process.exit(0);
}

console.log(`  → ${diff} bump available`);

if (CHECK_ONLY) {
  console.log('  (--check mode: not applying)');
  process.exit(0);
}

// Major bumps need explicit consent even in --yes mode (unless --allow-major)
if (diff === 'major' && YES && !ALLOW_MAJOR) {
  console.error('  ✗ Refusing major bump under --yes without --allow-major.');
  console.error(`    Review the changelog first: https://github.com/remotion-dev/remotion/releases/tag/v${latest}`);
  process.exit(1);
}
if (diff === 'major' && !YES) {
  console.log(`\n  ⚠ MAJOR version bump — likely has breaking changes.`);
  console.log(`    Changelog: https://github.com/remotion-dev/remotion/releases/tag/v${latest}`);
  const ok = await confirm('  Proceed anyway?');
  if (!ok) {
    console.log('  Aborted.');
    process.exit(0);
  }
}
if ((diff === 'minor' || diff === 'patch') && !YES) {
  const ok = await confirm(`  Apply ${diff} bump ${cur} → ${latest}?`);
  if (!ok) {
    console.log('  Aborted.');
    process.exit(0);
  }
}

// ── Apply ──
console.log('\n  ⋯ Backing up package.json + package-lock.json…');
const backupDir = backup();
console.log(`    → ${path.relative(ROOT, backupDir)}`);

console.log('\n  ⋯ Running `remotion upgrade`…');
const upgraded = run('npx', ['--yes', 'remotion', 'upgrade'], { stdio: 'inherit' });

if (upgraded.status !== 0) {
  console.log('  ✗ `remotion upgrade` failed — falling back to manual `npm install`');
  const specs = REMOTION_PKGS.map((p) => `${p}@${latest}`);
  const npmR = run('npm', ['install', '--save-exact', ...specs], { stdio: 'inherit' });
  if (npmR.status !== 0) {
    console.error('  ✗ npm install failed — restoring backup');
    restore(backupDir);
    log(`FAILED  ${cur} → ${latest}  (${diff}, install error)`);
    process.exit(1);
  }
}

// ── Smoke test ──
console.log('\n  ⋯ Smoke test: rendering thumbnail still…');
const testOut = path.join(ROOT, 'out', '.update-smoketest.png');
fs.mkdirSync(path.dirname(testOut), { recursive: true });

const smoke = run(
  'npx',
  ['remotion', 'still', 'Book-Review-EI-Thumbnail', testOut, '--frame=0', '--overwrite'],
  { stdio: 'inherit' },
);

if (smoke.status !== 0 || !fs.existsSync(testOut)) {
  console.error('\n  ✗ Smoke test render failed — rolling back');
  restore(backupDir);
  log(`FAILED  ${cur} → ${latest}  (${diff}, smoketest failed)`);
  process.exit(1);
}
fs.unlinkSync(testOut);

// ── Success ──
const newCur = currentVersion();
log(`OK      ${cur} → ${newCur}  (${diff})`);

console.log('\n  ┌──────────────────────────────────────────');
console.log(`  │  ✓ Updated to ${newCur} — smoke test passed`);
console.log(`  │  Backup: ${path.relative(ROOT, backupDir)}`);
console.log(`  │  Log:    .update.log`);
console.log('  └──────────────────────────────────────────');
