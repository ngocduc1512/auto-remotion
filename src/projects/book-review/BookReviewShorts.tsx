import React from 'react';
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  interpolate,
  Sequence,
  spring,
  useVideoConfig,
} from 'remotion';
import { whoosh, uiSwitch, ding, pageTurn } from '@remotion/sfx';
import {
  useLayout,
  useTypography,
  useSpacing,
  EASING,
  CLAMP,
  glassCard,
  glowSpots,
  animatedGradientBg,
  gridPatternStyle,
} from '../../design-system';
import { theme } from './theme';
import { FEATURED_BOOK } from './types';
import { BookCover } from './BookCover';
import { StarRating } from './StarRating';

/**
 * Beats (~18s @ 30fps = 540 frames):
 *
 * Beat 1 (0–2s,   f0–60):   Title fades in "Review sách hôm nay"
 * Beat 2 (2–5s,   f60–150): Book cover slides in from right
 * Beat 3 (5–8s,   f150–240): Rating stars pop in + meta row
 * Beat 4 (8–13s,  f240–390): Genre tag chips + quote takeaway
 * Beat 5 (13–18s, f390–540): CTA "Follow để xem review kế tiếp"
 */

const FPS = 30;
const BEAT_1 = 0;
const BEAT_2 = 2 * FPS;
const BEAT_3 = 5 * FPS;
const BEAT_4 = 8 * FPS;
const BEAT_5 = 13 * FPS;

export const BookReviewShorts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vh } = useLayout();
  const font = useTypography();
  const sp = useSpacing();

  // ── Background ──
  const gradientAngle = interpolate(frame, [0, 18 * fps], [0, 360], CLAMP);

  const bgGlows = glowSpots([
    { x: '20%', y: '15%', color: theme.colors.primary,   opacity: 0.12 },
    { x: '80%', y: '55%', color: theme.colors.secondary, opacity: 0.10 },
    { x: '50%', y: '90%', color: theme.colors.primary,   opacity: 0.06 },
  ]);

  const bgGradient = animatedGradientBg(gradientAngle, [
    [theme.colors.background,    '0%'],
    [theme.colors.backgroundAlt, '50%'],
    [theme.colors.background,    '100%'],
  ]);

  // ── Title ──
  const titleFade  = interpolate(frame, [BEAT_1,      BEAT_1 + 15], [0, 1],  { easing: EASING.smooth, ...CLAMP });
  const titleSlide = interpolate(frame, [BEAT_1,      BEAT_1 + 20], [-vh(2), 0], { easing: EASING.smooth, ...CLAMP });

  // ── Rating ──
  const metaFade = interpolate(frame, [BEAT_3, BEAT_3 + 15], [0, 1], { easing: EASING.smooth, ...CLAMP });
  const metaSlide = interpolate(frame, [BEAT_3, BEAT_3 + 20], [vh(1), 0], { easing: EASING.smooth, ...CLAMP });

  // ── Takeaway quote ──
  const quoteFade  = interpolate(frame, [BEAT_4, BEAT_4 + 20], [0, 1], { easing: EASING.smooth, ...CLAMP });
  const quoteScale = spring({
    frame: frame - BEAT_4,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.9 },
  });

  // ── CTA ──
  const ctaFade  = interpolate(frame, [BEAT_5, BEAT_5 + 18], [0, 1], { easing: EASING.smooth, ...CLAMP });
  const ctaSlide = interpolate(frame, [BEAT_5, BEAT_5 + 20], [vh(1), 0], { easing: EASING.smooth, ...CLAMP });
  const ctaPulse = 1 + Math.sin((frame - BEAT_5) / 8) * 0.03;

  const book = FEATURED_BOOK;

  return (
    <AbsoluteFill
      style={{
        background: `${bgGlows}, ${bgGradient}`,
        fontFamily: theme.fontFamily,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Grid pattern — subtle library-paper vibe */}
      <div
        style={{
          ...gridPatternStyle(theme.colors.primary, sp.xxl, 0.04),
          opacity: interpolate(frame, [0, 20], [0, 1], CLAMP),
        }}
      />

      {/* ── Header: eyebrow + title ── */}
      <div
        style={{
          textAlign: 'center',
          paddingTop: vh(4),
          paddingLeft: sp.xxl,
          paddingRight: sp.xxl,
          transform: `translateY(${titleSlide}px)`,
          opacity: titleFade,
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: font.subtitle,
            fontWeight: 600,
            color: theme.colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 6,
            marginBottom: sp.sm,
            fontFamily: '-apple-system, "SF Pro Display", sans-serif',
          }}
        >
          Review sách hôm nay
        </div>
        <div
          style={{
            fontSize: font.hero,
            fontWeight: 800,
            background: theme.gradients.title,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.05,
            fontStyle: 'italic',
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            fontSize: font.subtitle,
            color: theme.colors.textSecondary,
            marginTop: sp.xs,
            letterSpacing: 3,
          }}
        >
          — {book.author} · {book.year}
        </div>
      </div>

      {/* ── Book cover (center) ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${sp.lg}px 0`,
          zIndex: 2,
        }}
      >
        <Sequence from={BEAT_2} layout="none">
          <BookCover book={book} enterFrame={0} />
        </Sequence>
      </div>

      {/* ── Rating row ── */}
      <div
        style={{
          padding: `0 ${sp.xxl}px`,
          textAlign: 'center',
          opacity: metaFade,
          transform: `translateY(${metaSlide}px)`,
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <Sequence from={BEAT_3} layout="none">
          <StarRating rating={book.rating} enterFrame={0} size={sp.space(14)} />
        </Sequence>
        <div
          style={{
            marginTop: sp.md,
            fontSize: font.body,
            color: theme.colors.textSecondary,
            letterSpacing: 2,
          }}
        >
          {book.rating.toFixed(1)} / 5 · {book.pages} trang · {book.genre}
        </div>
      </div>

      {/* ── Takeaway quote card ── */}
      <div
        style={{
          margin: `${sp.lg}px ${sp.xxl}px 0`,
          padding: sp.lg,
          ...glassCard({
            bg: theme.colors.surface,
            borderColor: theme.colors.primary + '55',
            borderWidth: 2,
            borderRadius: sp.radiusLg,
          }),
          opacity: quoteFade,
          transform: `scale(${quoteScale})`,
          transformOrigin: 'center',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: font.body,
            color: theme.colors.textPrimary,
            fontStyle: 'italic',
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          <span style={{
            fontSize: font.hero,
            color: theme.colors.primary,
            lineHeight: 0,
            verticalAlign: '-0.4em',
            marginRight: sp.xs,
          }}>“</span>
          {book.takeaway}
          <span style={{
            fontSize: font.hero,
            color: theme.colors.primary,
            lineHeight: 0,
            verticalAlign: '-0.4em',
            marginLeft: sp.xs,
          }}>”</span>
        </div>

        {/* Tags row */}
        <div
          style={{
            display: 'flex',
            gap: sp.sm,
            justifyContent: 'center',
            marginTop: sp.md,
            flexWrap: 'wrap',
          }}
        >
          {book.tags.map((tag, i) => {
            const tagDelay = BEAT_4 + Math.round((i + 1) * 0.15 * fps);
            const tagOp = interpolate(frame, [tagDelay, tagDelay + 10], [0, 1], CLAMP);
            const tagScale = spring({
              frame: frame - tagDelay,
              fps,
              config: { damping: 12, stiffness: 220, mass: 0.5 },
            });
            return (
              <div
                key={tag}
                style={{
                  padding: `${sp.xs}px ${sp.md}px`,
                  borderRadius: sp.radiusSm,
                  background: theme.gradients.gold,
                  color: theme.colors.background,
                  fontSize: font.caption,
                  fontWeight: 700,
                  letterSpacing: 1,
                  fontFamily: '-apple-system, "SF Pro Display", sans-serif',
                  opacity: tagOp,
                  transform: `scale(${tagScale})`,
                }}
              >
                {tag}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <div
        style={{
          padding: `${sp.lg}px ${sp.xxl}px ${vh(3)}px`,
          textAlign: 'center',
          opacity: ctaFade,
          transform: `translateY(${ctaSlide}px) scale(${ctaPulse})`,
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: font.subtitle,
            color: theme.colors.textPrimary,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: '-apple-system, "SF Pro Display", sans-serif',
          }}
        >
          Follow để đọc nhanh 1 cuốn / ngày{' '}
          <span style={{ color: theme.colors.primary }}>📚</span>
        </div>
      </div>

      {/* ── SFX ── */}
      <Sequence from={BEAT_1 + 5} layout="none">
        <Audio src={pageTurn} volume={0.5} />
      </Sequence>
      <Sequence from={BEAT_2} layout="none">
        <Audio src={whoosh} volume={0.6} />
      </Sequence>
      <Sequence from={BEAT_3 + 3} layout="none">
        <Audio src={ding} volume={0.5} />
      </Sequence>
      <Sequence from={BEAT_4} layout="none">
        <Audio src={uiSwitch} volume={0.4} />
      </Sequence>
      <Sequence from={BEAT_5} layout="none">
        <Audio src={pageTurn} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
};
