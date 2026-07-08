import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { CLAMP } from '../../design-system';
import { theme } from './theme';

type Props = {
  rating: number; // 0–5, halves allowed
  enterFrame: number;
  size?: number;
};

/**
 * 5 gold stars, each pops in with a stagger. Supports half stars via
 * a clip-path mask on the last "half" star.
 */
export const StarRating: React.FC<Props> = ({ rating, enterFrame, size = 56 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - enterFrame;

  const stars = Array.from({ length: 5 }, (_, i) => {
    // How "filled" this star is: 0, 0.5 or 1
    let fill = 0;
    if (rating >= i + 1) fill = 1;
    else if (rating >= i + 0.5) fill = 0.5;

    const delay = Math.round(i * 0.12 * fps);
    const s = spring({
      frame: local - delay,
      fps,
      config: { damping: 10, stiffness: 200, mass: 0.6 },
    });

    const opacity = interpolate(local - delay, [0, 6], [0, 1], CLAMP);

    return { fill, scale: s, opacity };
  });

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {stars.map((st, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            position: 'relative',
            transform: `scale(${st.scale})`,
            opacity: st.opacity,
          }}
        >
          {/* Empty star (outline) */}
          <Star size={size} color={theme.colors.textMuted} filled={false} />
          {st.fill > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                clipPath:
                  st.fill === 1
                    ? 'inset(0 0 0 0)'
                    : `inset(0 ${100 - st.fill * 100}% 0 0)`,
              }}
            >
              <Star size={size} color={theme.colors.primary} filled />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const Star: React.FC<{ size: number; color: string; filled: boolean }> = ({
  size,
  color,
  filled,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={filled ? 0 : 1.5}
      strokeLinejoin="round"
    />
  </svg>
);
