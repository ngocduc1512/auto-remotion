/**
 * Theme presets — dropped-in visual moods each episode can pick from.
 *
 * Pick with `episode.themePreset: "library" | "courtroom" | ...` in the JSON.
 * Optionally override individual keys with `episode.themeOverrides`.
 *
 * Each preset changes the OUTER look (background, primary accent, font, pattern).
 * Inner scene components keep their base palette so the framework stays
 * recognizable across episodes — but the top-level mood flips completely.
 *
 * Rule of thumb per preset:
 *   library    — literary, cozy, deep navy + warm gold + serif
 *   courtroom  — heavy, judicial, ink + brass + burgundy + broad serif
 *   morning    — light, hopeful, cream + terracotta + sage
 *   neon       — tech, edgy, black + electric cyan + magenta + sans
 *   mono       — minimal, monochrome, high contrast, sans
 */

export type PatternKind = 'grid' | 'dots' | 'waves' | 'none';

export type ThemePreset = {
  background: string;
  backgroundAlt: string;
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  pattern: PatternKind;
  patternOpacity: number;
  fontFamily: string;
  /** Whether to invert glow blend (light bg needs darker glows). */
  lightMode?: boolean;
};

export const PRESETS: Record<string, ThemePreset> = {
  library: {
    background: '#0f0a1c',
    backgroundAlt: '#1e162d',
    primary: '#e0b872',
    secondary: '#c66c4e',
    textPrimary: '#f5ead6',
    textSecondary: '#c9b78d',
    pattern: 'grid',
    patternOpacity: 0.035,
    fontFamily: '"Georgia", "Times New Roman", "PT Serif", serif',
  },

  courtroom: {
    background: '#161418',
    backgroundAlt: '#2b1f23',
    primary: '#d4a04d',       // aged brass
    secondary: '#a63a50',     // burgundy
    textPrimary: '#f0e6d0',
    textSecondary: '#b8a888',
    pattern: 'grid',
    patternOpacity: 0.05,
    fontFamily: '"Baskerville", "Palatino", "Georgia", serif',
  },

  morning: {
    background: '#f8f1e3',
    backgroundAlt: '#efe0c8',
    primary: '#8b5a3c',       // roasted terracotta
    secondary: '#5e8c61',     // sage
    textPrimary: '#3d2f22',
    textSecondary: '#7a6650',
    pattern: 'dots',
    patternOpacity: 0.09,
    fontFamily: '"Georgia", "Times New Roman", serif',
    lightMode: true,
  },

  neon: {
    background: '#08080f',
    backgroundAlt: '#141428',
    primary: '#00d4e0',       // electric cyan
    secondary: '#ff2e78',     // magenta
    textPrimary: '#e8eaf6',
    textSecondary: '#8b96b8',
    pattern: 'grid',
    patternOpacity: 0.07,
    fontFamily: '"SF Pro Display", -apple-system, "Segoe UI", sans-serif',
  },

  mono: {
    background: '#111111',
    backgroundAlt: '#1e1e1e',
    primary: '#ffffff',
    secondary: '#a0a0a0',
    textPrimary: '#ffffff',
    textSecondary: '#8a8a8a',
    pattern: 'none',
    patternOpacity: 0,
    fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
  },
};

/**
 * Resolve the effective preset for an episode. Falls back to `library` if
 * unspecified. Applies `themeOverrides` on top for per-episode tuning.
 */
export function resolvePreset(
  presetName: string | undefined,
  overrides?: Partial<ThemePreset>,
): ThemePreset {
  const base = PRESETS[presetName ?? 'library'] ?? PRESETS.library;
  return { ...base, ...(overrides ?? {}) };
}

/** CSS `background-image` for the given pattern. */
export function patternStyle(
  kind: PatternKind,
  color: string,
  opacity: number,
  size: number,
): React.CSSProperties {
  if (kind === 'none' || opacity === 0) return { position: 'absolute', inset: 0 };

  const rgba = withAlpha(color, opacity);
  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  };

  if (kind === 'grid') {
    return {
      ...base,
      backgroundImage: `
        linear-gradient(${rgba} 1px, transparent 1px),
        linear-gradient(90deg, ${rgba} 1px, transparent 1px)
      `,
      backgroundSize: `${size}px ${size}px`,
    };
  }

  if (kind === 'dots') {
    return {
      ...base,
      backgroundImage: `radial-gradient(${rgba} 2px, transparent 2.5px)`,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: '0 0',
    };
  }

  if (kind === 'waves') {
    // Repeating diagonal soft waves via SVG data URI
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size}" viewBox="0 0 ${size * 2} ${size}">
        <path d="M 0 ${size / 2} Q ${size / 2} 0 ${size} ${size / 2} T ${size * 2} ${size / 2}"
              stroke="${rgba}" stroke-width="1.5" fill="none"/>
      </svg>`
    );
    return {
      ...base,
      backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`,
      backgroundSize: `${size * 2}px ${size}px`,
    };
  }

  return base;
}

function withAlpha(color: string, opacity: number): string {
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// Type-only import to keep this file framework-agnostic.
import type React from 'react';
