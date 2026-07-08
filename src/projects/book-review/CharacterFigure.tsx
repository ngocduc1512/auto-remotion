import React from 'react';
import { useCurrentFrame, interpolate, useVideoConfig, spring } from 'remotion';
import { CLAMP } from '../../design-system';
import { theme } from './theme';

type Props = {
  /** Absolute frame the character should appear. */
  enterFrame: number;
  /** Absolute frame the mood should flip (optional). */
  moodFlipFrame?: number;
  /** X translation percent of parent (negative = left). */
  x?: number;
  y?: number;
  /** Character label under the figure. */
  label: string;
  /** Ring color for the head halo. */
  color: string;
  /** Icons floating around (max 3). */
  icons?: string[];
  /** After moodFlipFrame, wilts + halo goes red. */
  wiltsAfter?: boolean;
  /** After moodFlipFrame, gains an upward arrow. */
  risesAfter?: boolean;
};

/**
 * Simple SVG character: head + shoulders + ring halo + orbiting mini icons.
 * The narrative "student who's smart but abrasive" vs "student who's likable"
 * scenes use two of these side by side.
 */
export const CharacterFigure: React.FC<Props> = ({
  enterFrame,
  moodFlipFrame,
  x = 0,
  y = 0,
  label,
  color,
  icons = [],
  wiltsAfter = false,
  risesAfter = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const local = frame - enterFrame;

  const enterScale = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 110, mass: 0.8 },
  });
  const enterOpacity = interpolate(local, [0, 12], [0, 1], CLAMP);

  // Post-flip transitions
  const flipLocal = moodFlipFrame != null ? frame - moodFlipFrame : -1;
  const flipProgress = interpolate(flipLocal, [0, 20], [0, 1], CLAMP);

  const currentColor = wiltsAfter
    ? interpolateColor(color, theme.colors.negative, flipProgress)
    : risesAfter
    ? interpolateColor(color, theme.colors.positive, flipProgress)
    : color;

  const wiltRotation = wiltsAfter ? flipProgress * 8 : 0;
  const wiltY = wiltsAfter ? flipProgress * 20 : 0;
  const riseY = risesAfter ? -flipProgress * 30 : 0;

  const idleBob = Math.sin((frame - enterFrame) / 25) * 4;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) translate(${x}px, ${y + idleBob + wiltY + riseY}px) rotate(${wiltRotation}deg) scale(${enterScale})`,
        opacity: enterOpacity,
        textAlign: 'center',
        transformOrigin: 'center bottom',
      }}
    >
      {/* Halo ring */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${currentColor}55 0%, transparent 60%)`,
          filter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      />

      {/* Character SVG */}
      <svg width={220} height={280} viewBox="0 0 220 280">
        {/* Halo circle stroke */}
        <circle
          cx={110}
          cy={80}
          r={62}
          fill="none"
          stroke={currentColor}
          strokeWidth={2.5}
          strokeDasharray="6 8"
          opacity={0.7}
        />
        {/* Head */}
        <circle cx={110} cy={80} r={50} fill={theme.colors.textPrimary} />
        {/* Face — happy or wilted */}
        <circle cx={92} cy={75} r={4} fill={theme.colors.background} />
        <circle cx={128} cy={75} r={4} fill={theme.colors.background} />
        <path
          d={
            wiltsAfter && flipProgress > 0.4
              ? `M 92 100 Q 110 88 128 100`
              : `M 92 92 Q 110 106 128 92`
          }
          fill="none"
          stroke={theme.colors.background}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Shoulders */}
        <path
          d="M 40 250 Q 40 170 110 155 Q 180 170 180 250 Z"
          fill={currentColor}
          opacity={0.85}
        />
      </svg>

      {/* Rising arrow */}
      {risesAfter && flipProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -70,
            left: '50%',
            transform: `translateX(-50%) scale(${flipProgress})`,
            fontSize: 56,
            color: theme.colors.positive,
            filter: `drop-shadow(0 0 12px ${theme.colors.positive}88)`,
          }}
        >
          ↑
        </div>
      )}

      {/* Orbiting icons */}
      {icons.map((icon, i) => {
        const angle = (i / icons.length) * Math.PI * 2 + frame / 60;
        const radius = 140;
        const iconOpacity = interpolate(local, [12, 30], [0, 1], CLAMP);
        // Icons drift away if character wilts
        const drift = wiltsAfter ? flipProgress * 120 : 0;
        const iconX = Math.cos(angle) * (radius + drift);
        const iconY = Math.sin(angle) * (radius * 0.6 + drift * 0.5);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: 100,
              transform: `translate(${iconX - 20}px, ${iconY}px)`,
              fontSize: 40,
              opacity: iconOpacity * (wiltsAfter ? 1 - flipProgress * 0.7 : 1),
              pointerEvents: 'none',
            }}
          >
            {icon}
          </div>
        );
      })}

      {/* Label */}
      <div
        style={{
          marginTop: -20,
          fontSize: 28,
          fontWeight: 700,
          color: theme.colors.textPrimary,
          letterSpacing: 1,
          fontFamily: theme.fontFamily,
        }}
      >
        {label}
      </div>
    </div>
  );
};

function interpolateColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex: string): [number, number, number] {
  if (hex.startsWith('rgb')) {
    const m = hex.match(/\d+/g)!;
    return [+m[0], +m[1], +m[2]];
  }
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}
