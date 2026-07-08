/**
 * Episode schema — every book-review episode is described by an object
 * matching this shape (usually loaded from `episodes/<id>.json`).
 *
 * Adding a new episode is: write a JSON file matching `Episode`, drop a
 * script.txt + voice files in `public/`, and `npm run auto -- <id>`.
 * No code changes required.
 */

export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'positive'
  | 'warning'
  | 'negative'
  | 'highlight'
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted';

export type CaptionSize = 'body' | 'subtitle' | 'heading' | 'title' | 'hero';
export type CaptionAlign = 'top' | 'center' | 'bottom';

export type EpisodeCaption = {
  /** Absolute start time in seconds (or frame number when `unit: "frames"`). */
  from: number;
  /** Absolute end time in seconds (or frame number). */
  to: number;
  /** Text to display. */
  text: string;
  /** Optional word/phrase to color-highlight. */
  emphasis?: string;
  /** Type scale. Default: 'heading'. */
  size?: CaptionSize;
  /** Placement inside the safe zone. Default: 'center'. */
  align?: CaptionAlign;
};

export type EpisodeBook = {
  title: string;
  author: string;
  year: number;
  pages: number;
  genre: string;
  /** 0..5, halves allowed. */
  rating: number;
  cover: {
    /** Spine base color (hex). */
    base: string;
    /** Text + motif color (hex). */
    accent: string;
    /** Small emoji / single char rendered as cover motif. */
    motif: string;
  };
};

/** A pair of animated character figures — the "smart-but-abrasive vs likable" story beat. */
export type StoryCharacter = {
  label: string;
  /** Ring / halo color. */
  color: ColorRole | string;
  /** Emoji icons that orbit the head — max 3 looks best. */
  icons: string[];
  /** Absolute seconds. */
  enterAt: number;
  /** When the mood flips (wilt / rise). Optional. */
  flipAt?: number;
  wilts?: boolean;
  rises?: boolean;
  /** Horizontal offset from center in px (-540..540 for 9:16 1080). */
  x: number;
};

export type EpisodeScene =
  | {
      type: 'story';
      from: number;
      to: number;
      characters: StoryCharacter[];
      /** Frame at which the vignette darkens for the "do you see yourself?" moment. */
      mirrorAt?: number;
    }
  | {
      type: 'book';
      from: number;
      to: number;
    }
  | {
      type: 'emotions';
      from: number;
      to: number;
      emojis: string[];
    }
  | {
      type: 'headHeart';
      from: number;
      to: number;
    }
  | {
      type: 'payoff';
      from: number;
      to: number;
      leftCard: PayoffCard;
      rightCard: PayoffCard;
      /** Time (seconds) when the CTA card fades in. */
      ctaAt: number;
    }
  | {
      /** Big pull-quote card. Great for standalone punchlines. */
      type: 'quote';
      from: number;
      to: number;
      /** Quote body — will be wrapped in “ ” and italicized. Keep short. */
      quote: string;
      /** Attribution (e.g. author, character name). Optional. */
      attribution?: string;
    }
  | {
      /** Big statistic — one number + short label. E.g. "17 năm / kinh hoàng". */
      type: 'statCard';
      from: number;
      to: number;
      value: string;
      label: string;
      /** Optional caption below the label. */
      caption?: string;
    }
  | {
      /**
       * AI-generated image as full-frame background with Ken Burns motion.
       * Use for evocative scene-setting (a lonely office, a courtroom bench,
       * a mind at war with itself). Captions render on top with a dark overlay
       * so they stay readable.
       *
       * Image is rendered by `scripts/gen-images.mjs` — either from an explicit
       * `prompt` you write, or auto-derived from the captions in this scene's
       * time range when `autoPrompt: true`.
       *
       * File is saved to `public/<episode-id>-images/scene-<index>.jpg` — the
       * renderer looks up by scene index, no need to set imageFile manually.
       */
      type: 'imageScene';
      from: number;
      to: number;
      /**
       * Explicit English image prompt. Descriptive, camera-language-friendly.
       * E.g. "young Vietnamese office worker at his desk, colleagues walking
       * past without acknowledging him, warm editorial illustration".
       */
      prompt?: string;
      /** When true, LLM derives a prompt from captions overlapping this scene. */
      autoPrompt?: boolean;
      /** Override the auto-computed public/<id>-images/scene-N.jpg path. */
      imageFile?: string;
      /** Motion during the scene. Default 'zoomIn'. */
      kenBurns?: 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight' | 'none';
      /** Dim layer so on-top captions stay readable. Default 'dark'. */
      overlay?: 'dark' | 'light' | 'none';
      /** Pollinations seed — same seed = deterministic reproducibility. */
      seed?: number;
    };

export type PayoffCard = {
  label: string;
  verb: string;
  icon: string;
  color: ColorRole | string;
};

export type EpisodeThumbnail = {
  eyebrow: string;
  hook: string;
  subhook?: string;
  /** Corner badge (e.g. "SÁCH HAY · 60s"). Optional. */
  badge?: string;
};

export type EpisodeSfx = {
  /** Seconds. */
  at: number;
  /** Name from @remotion/sfx: whoosh | uiSwitch | ding | pageTurn. */
  sound: 'whoosh' | 'uiSwitch' | 'ding' | 'pageTurn';
  /** 0..1. Default 0.25. */
  volume?: number;
};

import type { PatternKind } from './themePresets';

export type Episode = {
  /** URL-safe short id — matches file basenames and the auto-command target. */
  id: string;
  /** Composition base title for the Remotion Studio folder. */
  title: string;
  /** Total video duration in seconds (must be > voice length). */
  durationSec: number;
  /** Frames per second. Default 30. */
  fps?: number;

  /**
   * Structural format — decides the overall composition, not just colors.
   *  narrative    (default) — captions + centered scenes + book middle + payoff card
   *  essay        — magazine style, each slide full-screen typography
   *  documentary  — chapter cards + stats + quotes, Vox-style
   *  hook-reel    — 4-5 punchy text slides, 15-30s total
   */
  format?: 'narrative' | 'essay' | 'documentary' | 'hook-reel';

  /**
   * Visual mood preset. Each preset picks a different bg, primary accent,
   * font and background pattern. Defaults to 'library'.
   */
  themePreset?: 'library' | 'courtroom' | 'morning' | 'neon' | 'mono';

  /** Fine-grained overrides on top of the preset. */
  themeOverrides?: {
    background?: string;
    backgroundAlt?: string;
    primary?: string;
    secondary?: string;
    textPrimary?: string;
    textSecondary?: string;
    pattern?: PatternKind;
    patternOpacity?: number;
    fontFamily?: string;
    lightMode?: boolean;
  };

  voice: {
    /** File under public/. E.g. "ei-voice.m4a". */
    file: string;
    /** Optional — informational only. */
    durationSec?: number;
  };

  bgm?: {
    file: string;
    /** 0..1. Default 0.09 (~-21 dB). */
    volume?: number;
    /** Fade duration in seconds at start + end. Default 1.5. */
    fadeSec?: number;
  };

  book: EpisodeBook;
  thumbnail: EpisodeThumbnail;

  captions: EpisodeCaption[];
  scenes: EpisodeScene[];
  sfx?: EpisodeSfx[];

  /** Final CTA line at the payoff — "Follow để ...". */
  ctaText?: string;

  /**
   * Global style suffix appended to every AI image prompt. Keeps the whole
   * episode visually cohesive. E.g. "editorial illustration, warm palette,
   * subtle grain, 9:16 vertical composition".
   *
   * Superseded by `styleBible` when both are set — kept for backwards compat.
   */
  imageStyle?: string;

  /**
   * Recurring visual identity for the whole episode — passed to the LLM
   * when it auto-writes image prompts, and appended verbatim to every
   * final Flux prompt. Solves the "5 images from same episode look like
   * they're from 5 different shows" problem.
   *
   * Fields (all optional):
   *   protagonist  — physical description of the main person that recurs
   *                  across scenes. LLM will keep them consistent.
   *   style        — art direction: medium, lighting, palette, era.
   *   avoid        — negative prompt bits (things that break style, e.g.
   *                  "no text, no logos, no 3D render").
   */
  styleBible?: {
    protagonist?: string;
    style?: string;
    avoid?: string;
  };

  /** ─── Format-specific configs (only read by the matching format) ─── */

  /** Data for format: "essay" — full-screen typographic slides. */
  essay?: {
    slides: EssaySlide[];
  };

  /** Data for format: "documentary" — chapter dividers over scenes. */
  documentary?: {
    chapters: DocumentaryChapter[];
  };

  /** Data for format: "hook-reel" — punchy text-only slides. */
  hookReel?: {
    slides: HookSlide[];
    /** End card CTA — appears after the last slide. */
    endCta?: string;
  };
};

export type EssaySlide = {
  from: number;
  to: number;
  /** Small chapter/section label above the body. */
  eyebrow?: string;
  /** Main text. Renders large serif. Keep < 120 chars. */
  text: string;
  /** Optional attribution below. */
  attribution?: string;
  /** Big pull-quote treatment (with quotes + oversized quote mark). */
  emphasis?: boolean;
};

export type DocumentaryChapter = {
  /** Absolute seconds when the chapter card enters. */
  at: number;
  /** "PHẦN 1" / "PART 01" — the number/tag. */
  number: string;
  /** "Đặt vấn đề" — the section name. */
  title: string;
  /** Duration of the card on screen. Default 2.5s. */
  holdSec?: number;
};

export type HookSlide = {
  from: number;
  to: number;
  /** Hero text — very short, all caps typical. */
  text: string;
  /** Kicker below — smaller supporting line. */
  kicker?: string;
  /** Optional emphasis word within `text` (renders in accent color). */
  emphasis?: string;
};
