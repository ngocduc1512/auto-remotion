import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CLAMP, useSpacing } from '../../../design-system';
import { resolvePreset, patternStyle } from '../themePresets';
import type { Episode, EssaySlide } from '../episode';

/**
 * EssayFormat — magazine-style typography.
 *
 * Each slide is a full-screen typographic canvas. No character avatars, no
 * emoji grids, no scene stacking — just one thought per slide, held long
 * enough to read. Feels like Aeon / Atlantic Ideas.
 *
 * Reads `episode.essay.slides`. If absent, auto-derives slides from the
 * caption list (one slide per caption).
 */
export const EssayFormat: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps: cfgFps } = useVideoConfig();
  const fps = episode.fps ?? cfgFps;
  const sp = useSpacing();

  const s = (sec: number) => Math.round(sec * fps);
  const totalFrames = s(episode.durationSec);
  const preset = resolvePreset(episode.themePreset, episode.themeOverrides);

  const slides: EssaySlide[] =
    episode.essay?.slides ??
    episode.captions.map((c) => ({
      from: c.from,
      to: c.to,
      text: c.text,
      emphasis: c.emphasis != null,
    }));

  const glowOpacity = preset.lightMode ? 0.06 : 0.10;

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at 30% 20%, ${withA(preset.primary, glowOpacity)} 0%, transparent 55%),
          radial-gradient(ellipse at 70% 80%, ${withA(preset.secondary, glowOpacity * 0.7)} 0%, transparent 55%),
          linear-gradient(160deg, ${preset.background} 0%, ${preset.backgroundAlt} 100%)
        `,
        fontFamily: preset.fontFamily,
        color: preset.textPrimary,
        overflow: 'hidden',
      }}
    >
      {/* Ambient pattern — much subtler than narrative */}
      <div
        style={{
          ...patternStyle(preset.pattern, preset.primary, preset.patternOpacity * 0.6, sp.xxl * 1.5),
          opacity: interpolate(frame, [0, 30], [0, 1], CLAMP),
        }}
      />

      {/* Slides — only the active one renders */}
      {slides.map((slide, i) => (
        <EssayCard key={i} slide={slide} from={s(slide.from)} to={s(slide.to)} preset={preset} />
      ))}

      {/* Byline at very end — book credit as article signature */}
      <ArticleByline episode={episode} preset={preset} enterAt={totalFrames - s(4)} />

      {/* Audio */}
      <Audio src={staticFile(episode.voice.file)} />
      {episode.bgm && (
        <Audio
          src={staticFile(episode.bgm.file)}
          loop
          volume={(f) => {
            const vol = (episode.bgm!.volume ?? 0.08) * 0.7; // gentler in essay
            const fadeF = s(episode.bgm!.fadeSec ?? 1.5);
            const fadeIn = interpolate(f, [0, fadeF], [0, vol], CLAMP);
            const fadeOut = interpolate(f, [totalFrames - fadeF, totalFrames], [vol, 0], CLAMP);
            return Math.min(fadeIn, fadeOut);
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const EssayCard: React.FC<{
  slide: EssaySlide;
  from: number;
  to: number;
  preset: ReturnType<typeof resolvePreset>;
}> = ({ slide, from, to, preset }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sp = useSpacing();

  if (frame < from - 5 || frame > to + 5) return null;

  const local = frame - from;
  const duration = to - from;
  const opacity = interpolate(
    local,
    [-5, 10, duration - 15, duration + 5],
    [0, 1, 1, 0],
    CLAMP,
  );
  const slideY = interpolate(local, [0, 18], [24, 0], CLAMP);

  // Length-adaptive font size
  const len = slide.text.length;
  const bodySize = slide.emphasis
    ? (len < 30 ? height * 0.075 : len < 60 ? height * 0.055 : height * 0.042)
    : (len < 60 ? height * 0.048 : len < 100 ? height * 0.038 : height * 0.030);

  const topInset = Math.round(height * 0.14);
  const bottomInset = Math.round(height * 0.24);
  const leftInset = Math.round(width * 0.08);
  const rightInset = Math.round(width * 0.14);

  return (
    <div
      style={{
        position: 'absolute',
        top: topInset,
        bottom: bottomInset,
        left: leftInset,
        right: rightInset,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        opacity,
        transform: `translateY(${slideY}px)`,
      }}
    >
      {slide.eyebrow && (
        <div
          style={{
            fontSize: Math.round(height * 0.02),
            color: preset.secondary,
            letterSpacing: 6,
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: sp.xl,
            fontFamily: '-apple-system, "SF Pro Display", sans-serif',
            paddingLeft: 6,
            borderLeft: `3px solid ${preset.secondary}`,
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {slide.eyebrow}
        </div>
      )}

      {slide.emphasis && (
        <div
          style={{
            fontSize: Math.round(height * 0.12),
            color: preset.primary,
            lineHeight: 0.5,
            marginBottom: sp.md,
            fontFamily: preset.fontFamily,
          }}
        >
          “
        </div>
      )}

      <div
        style={{
          fontSize: Math.round(bodySize),
          color: preset.textPrimary,
          lineHeight: slide.emphasis ? 1.2 : 1.35,
          fontWeight: slide.emphasis ? 700 : 500,
          fontStyle: slide.emphasis ? 'italic' : 'normal',
          letterSpacing: slide.emphasis ? -0.5 : 0,
          fontFamily: preset.fontFamily,
          textAlign: 'left',
        }}
      >
        {slide.text}
      </div>

      {slide.attribution && (
        <div
          style={{
            marginTop: sp.xl,
            fontSize: Math.round(height * 0.022),
            color: preset.textSecondary,
            letterSpacing: 3,
            textTransform: 'uppercase',
            fontFamily: '-apple-system, "SF Pro Display", sans-serif',
          }}
        >
          — {slide.attribution}
        </div>
      )}
    </div>
  );
};

const ArticleByline: React.FC<{
  episode: Episode;
  preset: ReturnType<typeof resolvePreset>;
  enterAt: number;
}> = ({ episode, preset, enterAt }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const sp = useSpacing();
  void fps;

  const local = frame - enterAt;
  if (local < 0) return null;

  const scale = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });
  const opacity = interpolate(local, [0, 20], [0, 1], CLAMP);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8%',
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontSize: Math.round(height * 0.015),
          color: preset.textSecondary,
          letterSpacing: 5,
          textTransform: 'uppercase',
          marginBottom: sp.xs,
          fontFamily: '-apple-system, "SF Pro Display", sans-serif',
        }}
      >
        Trích từ
      </div>
      <div
        style={{
          fontSize: Math.round(height * 0.03),
          color: preset.textPrimary,
          fontWeight: 700,
          fontStyle: 'italic',
          letterSpacing: 1,
          fontFamily: preset.fontFamily,
        }}
      >
        {episode.book.title}
      </div>
      <div
        style={{
          marginTop: sp.xs,
          fontSize: Math.round(height * 0.018),
          color: preset.textSecondary,
          letterSpacing: 3,
          fontFamily: '-apple-system, "SF Pro Display", sans-serif',
        }}
      >
        — {episode.book.author.toUpperCase()} · ★ {episode.book.rating.toFixed(1)}
      </div>
    </div>
  );
};

function withA(color: string, opacity: number): string {
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
