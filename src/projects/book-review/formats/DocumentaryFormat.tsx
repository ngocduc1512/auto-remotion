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
import { whoosh, uiSwitch, ding, pageTurn } from '@remotion/sfx';
import { CLAMP, useSpacing, animatedGradientBg } from '../../../design-system';
import { resolvePreset, patternStyle } from '../themePresets';
import { NarrativeCaption } from '../NarrativeCaption';
import { SceneRenderer, SceneGate } from './NarrativeFormat';
import type { Episode, DocumentaryChapter } from '../episode';

/**
 * DocumentaryFormat — Vox / Kurzgesagt style.
 *
 * Between each major beat, an animated chapter card takes over the frame
 * ("PHẦN 1 · Câu chuyện David"). This gives strong pacing beats and makes
 * the video feel researched rather than emotional.
 *
 * Reuses the caption + scene rendering of narrative but overlays chapter
 * cards at declared timestamps.
 */

const SFX_MAP = { whoosh, uiSwitch, ding, pageTurn } as const;

export const DocumentaryFormat: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps: cfgFps } = useVideoConfig();
  const fps = episode.fps ?? cfgFps;
  const sp = useSpacing();

  const s = (sec: number) => Math.round(sec * fps);
  const totalFrames = s(episode.durationSec);
  const preset = resolvePreset(episode.themePreset, episode.themeOverrides);
  const chapters = episode.documentary?.chapters ?? [];

  const gradientAngle = interpolate(frame, [0, totalFrames], [0, 360], CLAMP);
  const bgGradient = animatedGradientBg(gradientAngle, [
    [preset.background,    '0%'],
    [preset.backgroundAlt, '50%'],
    [preset.background,    '100%'],
  ]);

  return (
    <AbsoluteFill
      style={{
        background: bgGradient,
        fontFamily: preset.fontFamily,
        color: preset.textPrimary,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          ...patternStyle(preset.pattern, preset.primary, preset.patternOpacity, sp.xxl),
          opacity: interpolate(frame, [0, 30], [0, 1], CLAMP),
        }}
      />

      {/* Visual scenes — same dispatcher as NarrativeFormat.
          Chapter cards render on top of these, so the scene is the
          background of the chapter beat. */}
      {episode.scenes.map((sc, i) => (
        <SceneGate key={`scene-${i}`} from={s(sc.from)} to={s(sc.to)}>
          <SceneRenderer scene={sc} episode={episode} fps={fps} />
        </SceneGate>
      ))}

      {/* Base captions — but shifted down so chapter progress fits at top */}
      {episode.captions.map((c, i) => (
        <NarrativeCaption
          key={i}
          text={c.text}
          from={s(c.from)}
          to={s(c.to)}
          emphasis={c.emphasis}
          size={c.size ?? 'heading'}
          align={c.align ?? 'center'}
        />
      ))}

      {/* Chapter progress bar at top — always visible */}
      <ChapterProgress
        chapters={chapters}
        preset={preset}
        fps={fps}
      />

      {/* Chapter cards — fullscreen takeover at each chapter start */}
      {chapters.map((ch, i) => (
        <ChapterCard
          key={i}
          chapter={ch}
          index={i + 1}
          preset={preset}
          fps={fps}
        />
      ))}

      {/* Audio */}
      <Audio src={staticFile(episode.voice.file)} />
      {episode.bgm && (
        <Audio
          src={staticFile(episode.bgm.file)}
          loop
          volume={(f) => {
            const vol = episode.bgm!.volume ?? 0.08;
            const fadeF = s(episode.bgm!.fadeSec ?? 1.5);
            const fadeIn = interpolate(f, [0, fadeF], [0, vol], CLAMP);
            const fadeOut = interpolate(f, [totalFrames - fadeF, totalFrames], [vol, 0], CLAMP);
            return Math.min(fadeIn, fadeOut);
          }}
        />
      )}

      {/* SFX */}
      {(episode.sfx ?? []).map((sx, i) => (
        <Sequence key={i} from={s(sx.at)} layout="none">
          <Audio src={SFX_MAP[sx.sound]} volume={sx.volume ?? 0.25} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const ChapterProgress: React.FC<{
  chapters: DocumentaryChapter[];
  preset: ReturnType<typeof resolvePreset>;
  fps: number;
}> = ({ chapters, preset, fps }) => {
  const frame = useCurrentFrame();

  if (chapters.length === 0) return null;

  const currentIndex = chapters.reduce(
    (acc, ch, i) => (frame >= Math.round(ch.at * fps) ? i : acc),
    -1,
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: '6%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        padding: '0 8%',
      }}
    >
      {chapters.map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            background:
              i <= currentIndex
                ? preset.primary
                : preset.textSecondary + '33',
            borderRadius: 2,
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );
};

const ChapterCard: React.FC<{
  chapter: DocumentaryChapter;
  index: number;
  preset: ReturnType<typeof resolvePreset>;
  fps: number;
}> = ({ chapter, preset, fps }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sp = useSpacing();
  void height;

  const from = Math.round(chapter.at * fps);
  const holdSec = chapter.holdSec ?? 2.5;
  const to = Math.round((chapter.at + holdSec) * fps);

  if (frame < from - 5 || frame > to + 5) return null;

  const local = frame - from;
  const duration = to - from;

  const numberScale = spring({
    frame: local,
    fps,
    config: { damping: 10, stiffness: 130, mass: 0.6 },
  });
  const titleSlide = interpolate(local, [12, 30], [30, 0], CLAMP);
  const titleOpacity = interpolate(local, [12, 30], [0, 1], CLAMP);

  const fadeOut = interpolate(
    local,
    [duration - 20, duration],
    [1, 0],
    CLAMP,
  );

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${preset.background}f0, ${preset.backgroundAlt}f0)`,
        opacity: fadeOut,
        padding: `0 ${Math.round(width * 0.06)}px`,
      }}
    >
      <div
        style={{
          width: Math.round(width * 0.6),
          height: 2,
          background: preset.primary,
          marginBottom: sp.xl,
          transform: `scaleX(${numberScale})`,
          transformOrigin: 'left',
        }}
      />
      <div
        style={{
          fontSize: Math.round(height * 0.024),
          color: preset.secondary,
          letterSpacing: 8,
          textTransform: 'uppercase',
          fontWeight: 800,
          transform: `scale(${numberScale})`,
          fontFamily: '-apple-system, "SF Pro Display", sans-serif',
        }}
      >
        {chapter.number}
      </div>
      <div
        style={{
          marginTop: sp.lg,
          fontSize: Math.round(height * 0.055),
          color: preset.textPrimary,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.1,
          letterSpacing: -0.5,
          fontFamily: preset.fontFamily,
          opacity: titleOpacity,
          transform: `translateY(${titleSlide}px)`,
          maxWidth: '85%',
        }}
      >
        {chapter.title}
      </div>
      <div
        style={{
          marginTop: sp.xl,
          width: Math.round(width * 0.6),
          height: 2,
          background: preset.primary,
          transform: `scaleX(${numberScale})`,
          transformOrigin: 'right',
        }}
      />
    </AbsoluteFill>
  );
};
