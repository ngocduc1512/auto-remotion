import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { EASING, CLAMP, useSpacing } from '../../design-system';
import { theme } from './theme';
import type { Book } from './types';

type Props = {
  book: Book;
  enterFrame: number;
};

/**
 * Fake book cover — pure CSS/SVG. Slides in from the right with a
 * gentle Y-axis flip so it feels like a book being placed on a table.
 */
export const BookCover: React.FC<Props> = ({ book, enterFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = useSpacing();

  const local = frame - enterFrame;

  const scale = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 90, mass: 0.9 },
  });

  const opacity = interpolate(local, [0, 15], [0, 1], CLAMP);
  const rotateY = interpolate(local, [0, 30], [-45, 0], {
    easing: EASING.smooth,
    ...CLAMP,
  });
  const translateX = interpolate(local, [0, 30], [80, 0], {
    easing: EASING.smooth,
    ...CLAMP,
  });

  // Continuous idle wobble after entrance settles
  const settled = Math.max(0, local - 30);
  const wobble = Math.sin(settled / 22) * 1.2;

  const width = 380;
  const height = 560;

  return (
    <div
      style={{
        perspective: 1400,
        opacity,
        transform: `translateX(${translateX}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          width,
          height,
          transform: `rotateY(${rotateY + wobble}deg)`,
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
      >
        {/* Book spine shadow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: sp.radiusMd,
            boxShadow:
              '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.15) inset',
            background: theme.gradients.spine,
            overflow: 'hidden',
          }}
        >
          {/* Paper texture */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 45%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.25) 0%, transparent 55%)',
            }}
          />

          {/* Left edge highlight (like a spine crease) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 24,
              width: 3,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))',
            }}
          />

          {/* Motif */}
          <div
            style={{
              position: 'absolute',
              top: 60,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 120,
              color: book.cover.accent,
              opacity: 0.9,
              lineHeight: 1,
            }}
          >
            {book.cover.motif}
          </div>

          {/* Rule line */}
          <div
            style={{
              position: 'absolute',
              top: 220,
              left: '15%',
              right: '15%',
              height: 2,
              background: book.cover.accent,
              opacity: 0.6,
            }}
          />

          {/* Title */}
          <div
            style={{
              position: 'absolute',
              top: 250,
              left: 30,
              right: 30,
              textAlign: 'center',
              color: book.cover.accent,
              fontFamily: theme.fontFamily,
              fontWeight: 700,
              fontSize: 48,
              lineHeight: 1.1,
              letterSpacing: 0.5,
            }}
          >
            {book.title}
          </div>

          {/* Author */}
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: book.cover.accent,
              fontFamily: theme.fontFamily,
              fontSize: 22,
              fontStyle: 'italic',
              opacity: 0.85,
              letterSpacing: 2,
            }}
          >
            {book.author.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
};
