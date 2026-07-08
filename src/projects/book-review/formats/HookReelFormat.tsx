import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { whoosh, ding } from '@remotion/sfx';
import { CLAMP, useSpacing } from '../../../design-system';
import { resolvePreset, patternStyle } from '../themePresets';
import type { Episode, HookSlide } from '../episode';

/**
 * HookReelFormat — 15–30s punchy text slides.
 *
 * No book middle, no character avatars, no CTA card. Just 4–6 big-text slides
 * that hit fast. Meant for feed hooks / trailer clips that link back to the
 * long-form episode.
 *
 * Reads `episode.hookReel.slides`.
 */
export const HookReelFormat: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps: cfgFps } = useVideoConfig();
  const fps = episode.fps ?? cfgFps;
  const sp = useSpacing();

  const s = (sec: number) => Math.round(sec * fps);
  const totalFrames = s(episode.durationSec);
  const preset = resolvePreset(episode.themePreset, episode.themeOverrides);

  const slides: HookSlide[] = episode.hookReel?.slides ?? [];
  const endCta = episode.hookReel?.endCta;

  // Slide-in gradient — moves each 5 seconds for pace
  const bgShift = interpolate(frame, [0, totalFrames], [0, 100], CLAMP);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${135 + bgShift * 0.5}deg, ${preset.background} 0%, ${preset.backgroundAlt} 100%)`,
        fontFamily: preset.fontFamily,
        color: preset.textPrimary,
        overflow: 'hidden',
      }}
    >
      {/* Bold pattern — more visible than in narrative for kinetic feel */}
      <div
        style={{
          ...patternStyle(preset.pattern, preset.primary, preset.patternOpacity * 1.8, sp.xxl),
        }}
      />

      {/* Slide index counter — tiny top-right */}
      <SlideCounter slides={slides} fps={fps} preset={preset} />

      {/* Slides */}
      {slides.map((slide, i) => (
        <HookCard
          key={i}
          slide={slide}
          from={s(slide.from)}
          to={s(slide.to)}
          preset={preset}
          index={i + 1}
        />
      ))}

      {/* End CTA */}
      {endCta && (
        <EndCta
          text={endCta}
          from={slides.length > 0 ? s(slides[slides.length - 1].to) : 0}
          totalFrames={totalFrames}
          preset={preset}
        />
      )}

      {/* Audio */}
      <Audio src={staticFile(episode.voice.file)} />
      {episode.bgm && (
        <Audio
          src={staticFile(episode.bgm.file)}
          loop
          volume={(f) => {
            const vol = (episode.bgm!.volume ?? 0.09) * 1.3; // slightly louder for reel
            const fadeF = s(episode.bgm!.fadeSec ?? 0.8);
            const fadeIn = interpolate(f, [0, fadeF], [0, vol], CLAMP);
            const fadeOut = interpolate(f, [totalFrames - fadeF, totalFrames], [vol, 0], CLAMP);
            return Math.min(fadeIn, fadeOut);
          }}
        />
      )}

      {/* Sharp SFX on every slide entry */}
      {slides.map((slide, i) => (
        <Sequence key={i} from={s(slide.from)} layout="none">
          <Audio src={i % 2 === 0 ? whoosh : ding} volume={0.28} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const HookCard: React.FC<{
  slide: HookSlide;
  from: number;
  to: number;
  preset: ReturnType<typeof resolvePreset>;
  index: number;
}> = ({ slide, from, to, preset, index }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const sp = useSpacing();

  if (frame < from - 5 || frame > to + 5) return null;

  const local = frame - from;
  const duration = to - from;

  // Punchy in, hard out — hook-reel style
  const inScale = spring({
    frame: local,
    fps,
    config: { damping: 8, stiffness: 220, mass: 0.5 },
  });
  const opacity = interpolate(
    local,
    [-2, 6, duration - 8, duration + 2],
    [0, 1, 1, 0],
    CLAMP,
  );

  // Length-adaptive size — hook slides should be BIG
  const len = slide.text.length;
  const textSize =
    len < 15 ? height * 0.16
    : len < 25 ? height * 0.12
    : len < 40 ? height * 0.09
    : height * 0.07;

  // Emphasis split
  const parts =
    slide.emphasis && slide.text.includes(slide.emphasis)
      ? slide.text.split(new RegExp(`(${slide.emphasis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`))
      : [slide.text];

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: `0 ${Math.round(width * 0.08)}px`,
        opacity,
        transform: `scale(${inScale})`,
      }}
    >
      <div
        style={{
          fontSize: textSize,
          fontWeight: 900,
          color: preset.textPrimary,
          lineHeight: 1.0,
          letterSpacing: -2,
          textAlign: 'center',
          fontFamily: preset.fontFamily,
          textShadow: preset.lightMode
            ? '0 3px 8px rgba(0,0,0,0.2)'
            : '0 6px 24px rgba(0,0,0,0.7)',
          maxWidth: '100%',
        }}
      >
        {parts.map((part, i) =>
          part === slide.emphasis ? (
            <span key={i} style={{ color: preset.primary, fontStyle: 'italic' }}>
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </div>

      {slide.kicker && (
        <div
          style={{
            marginTop: sp.xl,
            fontSize: Math.round(height * 0.028),
            color: preset.textSecondary,
            fontStyle: 'italic',
            letterSpacing: 2,
            textAlign: 'center',
            maxWidth: '85%',
          }}
        >
          {slide.kicker}
        </div>
      )}
    </AbsoluteFill>
  );
};

const SlideCounter: React.FC<{
  slides: HookSlide[];
  fps: number;
  preset: ReturnType<typeof resolvePreset>;
}> = ({ slides, fps, preset }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const sp = useSpacing();

  const currentIdx = slides.reduce(
    (acc, slide, i) => (frame >= Math.round(slide.from * fps) ? i : acc),
    -1,
  );

  if (currentIdx < 0 || slides.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '8%',
        right: sp.xxl,
        padding: `${sp.xs}px ${sp.md}px`,
        border: `2px solid ${preset.primary}`,
        borderRadius: sp.radiusSm,
        fontSize: Math.round(height * 0.016),
        color: preset.primary,
        fontWeight: 800,
        letterSpacing: 3,
        fontFamily: '-apple-system, "SF Pro Display", sans-serif',
      }}
    >
      {String(currentIdx + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
    </div>
  );
};

const EndCta: React.FC<{
  text: string;
  from: number;
  totalFrames: number;
  preset: ReturnType<typeof resolvePreset>;
}> = ({ text, from, totalFrames, preset }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const sp = useSpacing();

  const local = frame - from;
  if (local < 0) return null;

  const scale = spring({
    frame: local,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.6 },
  });
  const opacity = interpolate(local, [0, 15], [0, 1], CLAMP);
  const pulse = 1 + Math.sin(local / 8) * 0.04;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `0 ${Math.round(width * 0.08)}px`,
      }}
    >
      <div
        style={{
          padding: `${sp.lg}px ${sp.xxl}px`,
          border: `3px solid ${preset.primary}`,
          borderRadius: sp.radiusLg,
          background: preset.background + 'cc',
          fontSize: Math.round(height * 0.05),
          color: preset.textPrimary,
          fontWeight: 800,
          letterSpacing: 1,
          textAlign: 'center',
          transform: `scale(${scale * pulse})`,
          opacity,
          fontFamily: preset.fontFamily,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
