import React from 'react';
import type { Episode } from './episode';
import { NarrativeFormat } from './formats/NarrativeFormat';
import { EssayFormat } from './formats/EssayFormat';
import { DocumentaryFormat } from './formats/DocumentaryFormat';
import { HookReelFormat } from './formats/HookReelFormat';

/**
 * NarrativeEpisode — top-level composition entry.
 *
 * Dispatches to a structural format based on `episode.format`. Each format is
 * a fundamentally different composition (not just a different color preset)
 * so the same channel can ship variety instead of one template dressed 5 ways.
 *
 *   narrative   — captions + centered scenes + book middle + payoff card (default)
 *   essay       — magazine style, each slide full-screen typography
 *   documentary — chapter cards + stats + quotes, Vox-style
 *   hook-reel   — 4-5 punchy text slides, 15-30s total
 */
export const NarrativeEpisode: React.FC<{ episode: Episode }> = ({ episode }) => {
  switch (episode.format ?? 'narrative') {
    case 'essay':
      return <EssayFormat episode={episode} />;
    case 'documentary':
      return <DocumentaryFormat episode={episode} />;
    case 'hook-reel':
      return <HookReelFormat episode={episode} />;
    case 'narrative':
    default:
      return <NarrativeFormat episode={episode} />;
  }
};
