/**
 * Episode registry — every JSON file next to this one must be imported
 * here so `NarrativeEpisode` compositions get generated for it in
 * `src/Root.tsx`.
 *
 * To add a new episode:
 *   1. Write `episodes/<id>.json` matching the `Episode` shape.
 *   2. Import it below.
 *   3. Push it into the array.
 *   4. Run `npm run auto -- <id>`.
 *
 * The JSON is the single source of truth. Rendering, thumbnail, cover
 * splicing, and voice-gen all read it.
 */

import type { Episode } from '../src/projects/book-review/episode';
import ei from './ei.json';
import eiEssay from './ei-essay.json';
import eiHook from './ei-hook.json';
import sandel from './sandel.json';
import naming from './naming.json';

export const EPISODES: Episode[] = [
  ei as Episode,
  eiEssay as Episode,
  eiHook as Episode,
  sandel as Episode,
  naming as Episode,
];
