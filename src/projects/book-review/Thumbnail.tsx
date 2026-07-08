import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { useSpacing, glowSpots, animatedGradientBg } from '../../design-system';
import type { Book } from './types';
import { FEATURED_BOOK } from './types';
import type { Episode } from './episode';
import { resolvePreset, patternStyle } from './themePresets';

/**
 * Book-Review episode cover thumbnail — 1080×1920 still frame.
 *
 * Spliced onto the video at 0.1s so TikTok/Reels grab it as feed preview.
 * The visual mood follows `episode.themePreset` so cover matches the video.
 */
type Props = {
  book?: Book;
  /** Short line above the title, script-feel. Default "Hôm nói về". */
  eyebrow?: string;
  /** BIG hook — the viral line viewers see in feed. Max ~50 chars. */
  hook: string;
  /** Small kicker under the hook. Optional. */
  subhook?: string;
  /** Optional badge in the top-right corner. */
  badge?: string;
  /** Optional theme preset override. */
  preset?: ReturnType<typeof resolvePreset>;
};

export const Thumbnail: React.FC<Props> = ({
  book = FEATURED_BOOK,
  eyebrow = 'Hôm nói về',
  hook,
  subhook,
  badge = 'SÁCH HAY',
  preset,
}) => {
  const { width, height } = useVideoConfig();
  const sp = useSpacing();
  const p = preset ?? resolvePreset('library');

  const glowOpacity = p.lightMode ? 0.12 : 0.22;
  const bgGlows = glowSpots([
    { x: '25%', y: '20%', color: p.primary,   opacity: glowOpacity },
    { x: '75%', y: '75%', color: p.secondary, opacity: glowOpacity * 0.8 },
    { x: '50%', y: '50%', color: p.primary,   opacity: glowOpacity * 0.4 },
  ]);
  const bgGradient = animatedGradientBg(45, [
    [p.background,    '0%'],
    [p.backgroundAlt, '55%'],
    [p.background,    '100%'],
  ]);

  // Length-adaptive hook font size
  const hookLen = hook.length;
  const hookSize =
    hookLen < 22 ? Math.round(height * 0.11)
    : hookLen < 34 ? Math.round(height * 0.085)
    : hookLen < 48 ? Math.round(height * 0.068)
    : Math.round(height * 0.055);

  const textShadow = p.lightMode
    ? '0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.10)'
    : '0 6px 24px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.6)';

  const stroke = p.lightMode ? undefined : `2px ${p.background}`;

  return (
    <AbsoluteFill
      style={{
        background: `${bgGlows}, ${bgGradient}`,
        fontFamily: p.fontFamily,
        overflow: 'hidden',
      }}
    >
      <div style={{ ...patternStyle(p.pattern, p.primary, p.patternOpacity * 1.6, sp.xxl) }} />

      {/* ═══ Header block: eyebrow + hook ═══ */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: 0,
          right: 0,
          padding: `0 ${Math.round(width * 0.06)}px`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: Math.round(height * 0.032),
            color: p.secondary,
            fontStyle: 'italic',
            fontWeight: 600,
            letterSpacing: 3,
            marginBottom: sp.md,
            fontFamily: '"Georgia", "Times New Roman", serif',
            transform: 'rotate(-3deg)',
            display: 'inline-block',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: hookSize,
            fontWeight: 900,
            color: p.textPrimary,
            lineHeight: 1.02,
            letterSpacing: -1,
            textTransform: 'uppercase',
            fontFamily: p.fontFamily,
            textShadow,
            WebkitTextStroke: stroke,
          }}
        >
          {hook}
        </div>
        {subhook && (
          <div
            style={{
              fontSize: Math.round(height * 0.028),
              color: p.textSecondary,
              fontStyle: 'italic',
              marginTop: sp.lg,
              lineHeight: 1.3,
              letterSpacing: 1,
              maxWidth: '85%',
              margin: `${sp.lg}px auto 0`,
            }}
          >
            “{subhook}”
          </div>
        )}
      </div>

      {/* ═══ Bottom credit ribbon ═══ */}
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: sp.sm,
        }}
      >
        <div
          style={{
            fontSize: Math.round(height * 0.032),
            color: p.textPrimary,
            fontWeight: 700,
            letterSpacing: 1,
            fontFamily: p.fontFamily,
            fontStyle: 'italic',
          }}
        >
          {book.title}
        </div>
        <div style={{ display: 'flex', gap: sp.md, alignItems: 'center' }}>
          <div
            style={{
              padding: `4px ${sp.md}px`,
              borderRadius: sp.radiusSm,
              background: p.primary,
              color: p.background,
              fontSize: Math.round(height * 0.02),
              fontWeight: 800,
              letterSpacing: 1,
              fontFamily: '-apple-system, "SF Pro Display", sans-serif',
            }}
          >
            ★ {book.rating.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: Math.round(height * 0.02),
              color: p.textSecondary,
              letterSpacing: 3,
              fontFamily: '-apple-system, "SF Pro Display", sans-serif',
            }}
          >
            — {book.author.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ═══ Corner badge ═══ */}
      <div
        style={{
          position: 'absolute',
          top: sp.xl,
          right: sp.xl,
          padding: `${sp.xs}px ${sp.md}px`,
          border: `2px solid ${p.primary}`,
          borderRadius: sp.radiusSm,
          fontSize: Math.round(height * 0.016),
          color: p.primary,
          fontWeight: 700,
          letterSpacing: 3,
          fontFamily: '-apple-system, "SF Pro Display", sans-serif',
        }}
      >
        {badge}
      </div>
    </AbsoluteFill>
  );
};

// ── Generic wrapper that reads from an Episode config ──
export const EpisodeThumbnail: React.FC<{ episode: Episode }> = ({ episode }) => {
  const book: Book = {
    title: episode.book.title,
    author: episode.book.author,
    year: episode.book.year,
    pages: episode.book.pages,
    genre: episode.book.genre,
    rating: episode.book.rating,
    takeaway: '',
    tags: [],
    cover: episode.book.cover,
  };
  const preset = resolvePreset(episode.themePreset, episode.themeOverrides);
  return (
    <Thumbnail
      book={book}
      eyebrow={episode.thumbnail.eyebrow}
      hook={episode.thumbnail.hook}
      subhook={episode.thumbnail.subhook}
      badge={episode.thumbnail.badge}
      preset={preset}
    />
  );
};
