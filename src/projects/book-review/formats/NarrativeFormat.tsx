import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { whoosh, uiSwitch, ding, pageTurn } from '@remotion/sfx';
import {
  useTypography,
  useSpacing,
  CLAMP,
  glassCard,
  glowSpots,
  animatedGradientBg,
} from '../../../design-system';
import { theme } from '../theme';
import { BookCover } from '../BookCover';
import { StarRating } from '../StarRating';
import { NarrativeCaption } from '../NarrativeCaption';
import { CharacterFigure } from '../CharacterFigure';
import { resolvePreset, patternStyle } from '../themePresets';
import type {
  ColorRole,
  Episode,
  EpisodeScene,
  StoryCharacter,
  PayoffCard,
} from '../episode';

/**
 * NarrativeEpisode — data-driven Remotion composition.
 *
 * The whole episode (book, captions, scenes, audio, SFX) comes from a
 * JSON file. See `src/projects/book-review/episode.ts` for the shape
 * and `episodes/ei.json` for the reference episode.
 *
 * All times in the episode config are seconds; this component converts
 * them to frame numbers via `episode.fps` (default 30).
 */

const SFX_MAP = { whoosh, uiSwitch, ding, pageTurn } as const;

function resolveColor(role: ColorRole | string): string {
  if (role.startsWith('#') || role.startsWith('rgb')) return role;
  const key = role as ColorRole;
  return (theme.colors as unknown as Record<string, string>)[key] ?? role;
}

export const NarrativeFormat: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps: cfgFps } = useVideoConfig();
  const fps = episode.fps ?? cfgFps;
  const sp = useSpacing();

  const s = (sec: number) => Math.round(sec * fps);
  const totalFrames = s(episode.durationSec);

  // ── Preset-driven look ──
  const preset = resolvePreset(episode.themePreset, episode.themeOverrides);

  const gradientAngle = interpolate(frame, [0, totalFrames], [0, 360], CLAMP);
  const glowOpacity = preset.lightMode ? 0.06 : 0.10;
  const bgGlows = glowSpots([
    { x: '20%', y: '15%', color: preset.primary,   opacity: glowOpacity },
    { x: '80%', y: '55%', color: preset.secondary, opacity: glowOpacity * 0.9 },
    { x: '50%', y: '90%', color: preset.primary,   opacity: glowOpacity * 0.6 },
  ]);
  const bgGradient = animatedGradientBg(gradientAngle, [
    [preset.background,    '0%'],
    [preset.backgroundAlt, '50%'],
    [preset.background,    '100%'],
  ]);

  return (
    <AbsoluteFill
      style={{
        background: `${bgGlows}, ${bgGradient}`,
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

      {/* ═══ Visual scenes ═══ */}
      {episode.scenes.map((sc, i) => (
        <SceneGate key={i} from={s(sc.from)} to={s(sc.to)}>
          <SceneRenderer scene={sc} episode={episode} fps={fps} />
        </SceneGate>
      ))}

      {/* ═══ Captions ═══ */}
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

      {/* ═══ Audio ═══ */}
      <Audio src={staticFile(episode.voice.file)} />
      {episode.bgm && (
        <Audio
          src={staticFile(episode.bgm.file)}
          loop
          volume={(f) => {
            const vol = episode.bgm!.volume ?? 0.09;
            const fadeF = s(episode.bgm!.fadeSec ?? 1.5);
            const fadeIn = interpolate(f, [0, fadeF], [0, vol], CLAMP);
            const fadeOut = interpolate(
              f,
              [totalFrames - fadeF, totalFrames],
              [vol, 0],
              CLAMP,
            );
            return Math.min(fadeIn, fadeOut);
          }}
        />
      )}

      {/* ═══ SFX ═══ */}
      {(episode.sfx ?? []).map((sx, i) => (
        <Sequence key={i} from={s(sx.at)} layout="none">
          <Audio src={SFX_MAP[sx.sound]} volume={sx.volume ?? 0.25} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────
// Scene renderer — dispatches on `type`
// ─────────────────────────────────────────────────────

/**
 * Exported so other formats (e.g. DocumentaryFormat) can reuse the scene
 * dispatcher without duplicating the switch + sub-components.
 */
export const SceneRenderer: React.FC<{
  scene: EpisodeScene;
  episode: Episode;
  fps: number;
}> = ({ scene, episode, fps }) => {
  const s = (sec: number) => Math.round(sec * fps);
  const preset = resolvePreset(episode.themePreset, episode.themeOverrides);
  switch (scene.type) {
    case 'story':
      return <StoryScene chars={scene.characters} mirrorFrame={scene.mirrorAt != null ? s(scene.mirrorAt) : undefined} fps={fps} />;
    case 'book':
      return <BookScene book={episode.book} enterAt={s(scene.from)} />;
    case 'emotions':
      return <EmotionsScene startFrame={s(scene.from)} emojis={scene.emojis} />;
    case 'headHeart':
      return <HeadHeartScene startFrame={s(scene.from)} />;
    case 'payoff':
      return (
        <PayoffScene
          startFrame={s(scene.from)}
          ctaAt={s(scene.ctaAt)}
          leftCard={scene.leftCard}
          rightCard={scene.rightCard}
          ctaText={episode.ctaText ?? ''}
          preset={preset}
        />
      );
    case 'quote':
      return (
        <QuoteScene
          startFrame={s(scene.from)}
          quote={scene.quote}
          attribution={scene.attribution}
          preset={preset}
        />
      );
    case 'statCard':
      return (
        <StatCardScene
          startFrame={s(scene.from)}
          value={scene.value}
          label={scene.label}
          caption={scene.caption}
          preset={preset}
        />
      );
    case 'imageScene': {
      const idx = episode.scenes.indexOf(scene);
      const imgPath = scene.imageFile
        ?? `${episode.id}-images/scene-${String(idx).padStart(2, '0')}.jpg`;
      return (
        <ImageScene
          src={imgPath}
          startFrame={s(scene.from)}
          durationFrames={s(scene.to) - s(scene.from)}
          kenBurns={scene.kenBurns ?? 'zoomIn'}
          overlay={scene.overlay ?? 'dark'}
        />
      );
    }
  }
};

const ImageScene: React.FC<{
  src: string;
  startFrame: number;
  durationFrames: number;
  kenBurns: 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight' | 'none';
  overlay: 'dark' | 'light' | 'none';
}> = ({ src, startFrame, durationFrames, kenBurns, overlay }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const t = Math.max(0, Math.min(1, local / Math.max(1, durationFrames)));

  // 8% zoom + gentle drift — subtle enough to feel cinematic, not cheesy
  const zoomAmount = 0.08;
  const driftPx = 40;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  switch (kenBurns) {
    case 'zoomIn':   scale = 1 + zoomAmount * t; break;
    case 'zoomOut':  scale = 1 + zoomAmount - zoomAmount * t; break;
    case 'panLeft':  scale = 1 + zoomAmount * 0.4; tx = -driftPx * t; break;
    case 'panRight': scale = 1 + zoomAmount * 0.4; tx = driftPx * t; break;
    case 'none':     break;
  }

  const fadeIn = interpolate(local, [0, 12], [0, 1], CLAMP);
  const fadeOut = interpolate(local, [durationFrames - 12, durationFrames], [1, 0], CLAMP);
  const opacity = Math.min(fadeIn, fadeOut);

  const overlayBg =
    overlay === 'dark'
      ? 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)'
      : overlay === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.35) 100%)'
      : 'transparent';

  // ImageScene isn't wrapped in the SceneGate the other scenes use — it
  // fades in/out based on its own [startFrame..durationFrames] window.
  if (local < -8 || local > durationFrames + 8) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          transformOrigin: 'center center',
        }}
      />
      {overlay !== 'none' && (
        <AbsoluteFill style={{ background: overlayBg, pointerEvents: 'none' }} />
      )}
    </AbsoluteFill>
  );
};

export const SceneGate: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({
  from,
  to,
  children,
}) => {
  const frame = useCurrentFrame();
  const showFrom = from - 5;
  const showTo = to + 5;
  if (frame < showFrom || frame > showTo) return null;
  const fade = interpolate(
    frame,
    [from - 5, from + 5, to - 10, to + 5],
    [0, 1, 1, 0],
    CLAMP,
  );
  return (
    <AbsoluteFill style={{ opacity: fade, pointerEvents: 'none' }}>{children}</AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────
// Scene components — same visuals as the old EIReview
// ─────────────────────────────────────────────────────

const StoryScene: React.FC<{
  chars: StoryCharacter[];
  mirrorFrame?: number;
  fps: number;
}> = ({ chars, mirrorFrame, fps }) => {
  const frame = useCurrentFrame();
  const s = (sec: number) => Math.round(sec * fps);
  return (
    <AbsoluteFill>
      {chars.map((c, i) => (
        <CharacterFigure
          key={i}
          enterFrame={s(c.enterAt)}
          moodFlipFrame={c.flipAt != null ? s(c.flipAt) : undefined}
          x={c.x}
          y={80}
          label={c.label}
          color={resolveColor(c.color)}
          icons={c.icons}
          wiltsAfter={c.wilts}
          risesAfter={c.rises}
        />
      ))}
      {mirrorFrame != null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(15,10,28,0.55) 100%)',
            opacity: interpolate(frame, [mirrorFrame, mirrorFrame + 15], [0, 1], CLAMP),
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const BookScene: React.FC<{ book: Episode['book']; enterAt: number }> = ({ book, enterAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = useSpacing();
  const font = useTypography();

  const local = frame - enterAt;
  const scale = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.9 },
  });

  // BookCover was built for the richer `Book` type — synthesize an
  // adapter object with the empty fields it doesn't visually use.
  const bookForCover = { ...book, takeaway: '', tags: [] };

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: sp.xxl,
      }}
    >
      <div style={{ transform: `scale(${scale})` }}>
        <BookCover book={bookForCover} enterFrame={enterAt} />
      </div>
      <div style={{ marginTop: sp.xl, opacity: interpolate(local, [15, 30], [0, 1], CLAMP) }}>
        <StarRating rating={book.rating} enterFrame={enterAt + 15} size={sp.space(12)} />
        <div
          style={{
            marginTop: sp.md,
            fontSize: font.body,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            letterSpacing: 2,
          }}
        >
          {book.rating.toFixed(1)} / 5 · {book.pages} trang · {book.genre}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EmotionsScene: React.FC<{ startFrame: number; emojis: string[] }> = ({
  startFrame,
  emojis,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(emojis.length))));
  const rows = Math.ceil(emojis.length / cols);

  return (
    <AbsoluteFill
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 20,
        padding: '20% 12% 32%',
        placeItems: 'center',
      }}
    >
      {emojis.map((emo, i) => {
        const delay = startFrame + i * 4;
        const local = frame - delay;
        const scale = spring({
          frame: local,
          fps,
          config: { damping: 10, stiffness: 180, mass: 0.6 },
        });
        const opacity = interpolate(local, [0, 15], [0, 1], CLAMP);
        const bob = Math.sin((frame - delay) / 22 + i) * 6;
        return (
          <div
            key={i}
            style={{
              fontSize: 88,
              transform: `scale(${scale}) translateY(${bob}px)`,
              opacity,
              filter: `drop-shadow(0 6px 18px ${theme.colors.primary}44)`,
            }}
          >
            {emo}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const HeadHeartScene: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = useSpacing();

  const local = frame - startFrame;
  const headScale = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 140, mass: 0.7 },
  });
  const heartLocal = local - 60;
  const heartScale = spring({
    frame: heartLocal,
    fps,
    config: { damping: 10, stiffness: 160, mass: 0.6 },
  });
  const heartBeat = 1 + Math.sin(heartLocal / 5) * 0.06;
  const headFadeOut = interpolate(local, [60, 90], [1, 0.35], CLAMP);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sp.xxl,
        flexDirection: 'column',
        padding: sp.xxl,
      }}
    >
      <div
        style={{
          fontSize: 300,
          transform: `scale(${headScale})`,
          opacity: headFadeOut,
          filter: `drop-shadow(0 12px 30px ${theme.colors.textMuted}88)`,
        }}
      >
        🧠
      </div>
      <div
        style={{
          fontSize: 300,
          transform: `scale(${heartScale * (heartLocal > 0 ? heartBeat : 1)})`,
          filter: `drop-shadow(0 12px 40px ${theme.colors.secondary}aa)`,
        }}
      >
        ❤
      </div>
    </AbsoluteFill>
  );
};

const PayoffScene: React.FC<{
  startFrame: number;
  ctaAt: number;
  leftCard: PayoffCard;
  rightCard: PayoffCard;
  ctaText: string;
  preset: ReturnType<typeof resolvePreset>;
}> = ({ ctaAt, leftCard, rightCard, ctaText, preset }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const font = useTypography();
  const sp = useSpacing();

  const ctaLocal = frame - ctaAt;
  const ctaScale = spring({
    frame: ctaLocal,
    fps,
    config: { damping: 12, stiffness: 130, mass: 0.7 },
  });
  const ctaOpacity = interpolate(ctaLocal, [0, 15], [0, 1], CLAMP);
  const ctaPulse = 1 + Math.sin(ctaLocal / 8) * 0.03;

  const topInset = Math.round(height * 0.14);
  const bottomInset = Math.round(height * 0.26);
  const leftInset = Math.round(width * 0.06);
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
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: sp.xl,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: sp.lg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SplitCard card={leftCard} delay={0} />
        <div style={{ fontSize: 60, color: theme.colors.primary }}>→</div>
        <SplitCard card={rightCard} delay={30} />
      </div>

      {ctaText && (
        <div
          style={{
            padding: `${sp.md}px ${sp.xl}px`,
            ...glassCard({
              bg: theme.colors.surface,
              borderColor: theme.colors.primary + 'aa',
              borderWidth: 3,
              borderRadius: sp.radiusLg,
            }),
            transform: `scale(${ctaScale * ctaPulse})`,
            opacity: ctaOpacity,
          }}
        >
          <div
            style={{
              fontSize: font.subtitle,
              color: theme.colors.textPrimary,
              fontWeight: 700,
              letterSpacing: 2,
              textAlign: 'center',
              fontFamily: '-apple-system, "SF Pro Display", sans-serif',
            }}
          >
            {ctaText}
          </div>
        </div>
      )}
    </div>
  );
};

const SplitCard: React.FC<{ card: PayoffCard; delay: number }> = ({ card, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = useSpacing();
  const font = useTypography();

  const local = frame - delay;
  const scale = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 140, mass: 0.7 },
  });
  const opacity = interpolate(local, [0, 15], [0, 1], CLAMP);
  const color = resolveColor(card.color);

  return (
    <div
      style={{
        ...glassCard({
          bg: 'rgba(30,22,45,0.75)',
          borderColor: color + '77',
          borderWidth: 2,
          borderRadius: sp.radiusMd,
        }),
        padding: sp.lg,
        minWidth: 260,
        transform: `scale(${scale})`,
        opacity,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 80, marginBottom: sp.sm }}>{card.icon}</div>
      <div
        style={{
          fontSize: font.caption,
          color: theme.colors.textSecondary,
          letterSpacing: 2,
          fontFamily: '-apple-system, "SF Pro Display", sans-serif',
        }}
      >
        {card.label}
      </div>
      <div
        style={{
          fontSize: font.heading,
          fontWeight: 800,
          color,
          fontStyle: 'italic',
          marginTop: sp.xs,
        }}
      >
        {card.verb}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// QuoteScene — big pull-quote card
// ─────────────────────────────────────────────────────

const QuoteScene: React.FC<{
  startFrame: number;
  quote: string;
  attribution?: string;
  preset: ReturnType<typeof resolvePreset>;
}> = ({ startFrame, quote, attribution, preset }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const sp = useSpacing();
  const local = frame - startFrame;

  const scale = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 90, mass: 0.9 },
  });
  const opacity = interpolate(local, [0, 15], [0, 1], CLAMP);

  const topInset = Math.round(height * 0.14);
  const bottomInset = Math.round(height * 0.26);
  const leftInset = Math.round(width * 0.06);
  const rightInset = Math.round(width * 0.14);

  // Big quote fills the viewport — auto-scale font by quote length.
  const qLen = quote.length;
  const quoteSize =
    qLen < 30 ? Math.round(height * 0.075)
    : qLen < 60 ? Math.round(height * 0.055)
    : Math.round(height * 0.042);

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
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
      }}
    >
      <div
        style={{
          fontSize: Math.round(height * 0.15),
          color: preset.primary,
          lineHeight: 0.6,
          marginBottom: sp.md,
          fontFamily: preset.fontFamily,
        }}
      >
        “
      </div>
      <div
        style={{
          fontSize: quoteSize,
          color: preset.textPrimary,
          fontStyle: 'italic',
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.25,
          letterSpacing: -0.5,
          textShadow: preset.lightMode
            ? '0 2px 8px rgba(0,0,0,0.15)'
            : '0 4px 24px rgba(0,0,0,0.5)',
          fontFamily: preset.fontFamily,
        }}
      >
        {quote}
      </div>
      {attribution && (
        <div
          style={{
            marginTop: sp.xl,
            fontSize: Math.round(height * 0.024),
            color: preset.textSecondary,
            letterSpacing: 3,
            textTransform: 'uppercase',
            fontFamily: '-apple-system, "SF Pro Display", sans-serif',
          }}
        >
          — {attribution}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// StatCardScene — big number + label
// ─────────────────────────────────────────────────────

const StatCardScene: React.FC<{
  startFrame: number;
  value: string;
  label: string;
  caption?: string;
  preset: ReturnType<typeof resolvePreset>;
}> = ({ startFrame, value, label, caption, preset }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const sp = useSpacing();
  const local = frame - startFrame;

  const valueScale = spring({
    frame: local,
    fps,
    config: { damping: 10, stiffness: 130, mass: 0.8 },
  });
  const labelOpacity = interpolate(local, [25, 45], [0, 1], CLAMP);
  const labelSlide = interpolate(local, [25, 45], [16, 0], {
    ...CLAMP,
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `0 ${Math.round(width * 0.06)}px`,
      }}
    >
      <div
        style={{
          fontSize: Math.round(height * 0.22),
          color: preset.primary,
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: -4,
          transform: `scale(${valueScale})`,
          fontFamily: preset.fontFamily,
          textShadow: preset.lightMode ? undefined : '0 8px 40px rgba(0,0,0,0.4)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: sp.md,
          fontSize: Math.round(height * 0.028),
          color: preset.textSecondary,
          letterSpacing: 4,
          textTransform: 'uppercase',
          opacity: labelOpacity,
          transform: `translateY(${labelSlide}px)`,
          fontFamily: '-apple-system, "SF Pro Display", sans-serif',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
      {caption && (
        <div
          style={{
            marginTop: sp.sm,
            fontSize: Math.round(height * 0.022),
            color: preset.textSecondary,
            opacity: labelOpacity * 0.8,
            transform: `translateY(${labelSlide}px)`,
            textAlign: 'center',
            fontStyle: 'italic',
            fontFamily: preset.fontFamily,
          }}
        >
          {caption}
        </div>
      )}
    </AbsoluteFill>
  );
};
