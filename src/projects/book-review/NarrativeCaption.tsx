import React from 'react';
import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { CLAMP, EASING, useTypography, useSpacing } from '../../design-system';
import { theme } from './theme';

/**
 * TikTok safe zones for 9:16 (1080×1920). Percentages of composition height.
 *   Top     — 14% reserved for @username / back button / status.
 *   Bottom  — 26% reserved for creator name, description, hashtags, music tag.
 *   Right   — 14% reserved for like/comment/share/save icons column.
 * We render captions INSIDE the safe box so nothing important gets covered
 * once TikTok overlays its own UI.
 */
const SAFE = {
  top: 0.14,     // 14% from top
  bottom: 0.26,  // 26% from bottom
  rightPad: 0.14, // right-side icon column
  leftPad: 0.06,  // left breathing room
};

type Props = {
  text: string;
  /** Absolute start frame (in main composition). */
  from: number;
  /** Absolute end frame. */
  to: number;
  /** Optional emphasis word — rendered in gold. */
  emphasis?: string;
  /** Size step. Default 'heading'. */
  size?: 'body' | 'subtitle' | 'heading' | 'title' | 'hero';
  /** Vertical alignment inside the safe zone. Default center. */
  align?: 'top' | 'center' | 'bottom';
};

/**
 * Big captioned line for narrative videos. Fades + slides in, holds,
 * then fades out at the end of its window. Optionally colors an
 * emphasis word gold.
 */
export const NarrativeCaption: React.FC<Props> = ({
  text,
  from,
  to,
  emphasis,
  size = 'heading',
  align = 'center',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const font = useTypography();
  const sp = useSpacing();

  if (frame < from || frame > to) return null;

  const local = frame - from;
  const total = to - from;
  const fadeIn = Math.min(0.35 * fps, total * 0.3);
  const fadeOut = Math.min(0.35 * fps, total * 0.25);

  const opacity = interpolate(
    local,
    [0, fadeIn, total - fadeOut, total],
    [0, 1, 1, 0],
    { easing: EASING.smooth, ...CLAMP },
  );
  const slideY = interpolate(local, [0, fadeIn], [16, 0], {
    easing: EASING.smooth,
    ...CLAMP,
  });

  const parts = emphasis && text.includes(emphasis)
    ? text.split(new RegExp(`(${emphasis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`))
    : [text];

  // ── TikTok safe box ──
  // Top-aligned captions sit just below TikTok's status/username area.
  // Bottom-aligned captions sit just above the description/music tag block.
  // We also inset horizontally so nothing sits under the right-side icon column.
  const topInset = Math.round(height * SAFE.top);
  const bottomInset = Math.round(height * SAFE.bottom);
  const leftInset = Math.round(width * SAFE.leftPad);
  const rightInset = Math.round(width * SAFE.rightPad);

  const justifyMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

  return (
    <div
      style={{
        position: 'absolute',
        top: topInset,
        bottom: bottomInset,
        left: leftInset,
        right: rightInset,
        display: 'flex',
        alignItems: justifyMap[align],
        justifyContent: 'center',
        padding: sp.md,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div
        style={{
          fontSize: font[size],
          color: theme.colors.textPrimary,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.35,
          letterSpacing: 0.5,
          opacity,
          transform: `translateY(${slideY}px)`,
          textShadow: '0 4px 24px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.5)',
          fontFamily: theme.fontFamily,
        }}
      >
        {parts.map((part, i) => {
          const isEm = part === emphasis;
          return (
            <span
              key={i}
              style={
                isEm
                  ? {
                      color: theme.colors.primary,
                      fontStyle: 'italic',
                    }
                  : undefined
              }
            >
              {part}
            </span>
          );
        })}
      </div>
    </div>
  );
};
