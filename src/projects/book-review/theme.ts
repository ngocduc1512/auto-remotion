import type { ProjectTheme } from '../../design-system';

/**
 * Book-Review theme — warm literary palette
 *
 * Inspired by a cozy library at dusk: deep navy background,
 * warm gold for ratings/highlights, cream for text, terracotta
 * for the featured book spine. Feels editorial, not tech-y.
 */
export const theme: ProjectTheme = {
  name: 'Book Review Channel',

  colors: {
    primary:    '#e0b872',  // Warm gold — stars, badges, key highlights
    secondary:  '#c66c4e',  // Terracotta — book spine, CTA accents

    positive:   '#7fb069',  // Sage green — "Đáng đọc"
    warning:    '#e07a5f',  // Muted coral — "Hơi khó"
    negative:   '#a63a50',  // Wine — "Bỏ qua"
    highlight:  '#f2cc8f',  // Cream gold — inline word highlights

    textPrimary:   '#f5ead6',  // Cream — headings, book title
    textSecondary: '#c9b78d',  // Soft parchment — author, subtitle
    textMuted:     '#8a7a5c',  // Dim gold — metadata, page count

    surface:       'rgba(30, 22, 45, 0.85)',  // Deep purple-navy frosted
    background:    '#0f0a1c',                  // Midnight navy — page
    backgroundAlt: '#1e162d',                  // Deep plum — gradient mid
  },

  gradients: {
    title:    'linear-gradient(135deg, #f5ead6 0%, #e0b872 100%)',
    subtitle: 'linear-gradient(135deg, #c9b78d 0%, #8a7a5c 100%)',
    spine:    'linear-gradient(135deg, #c66c4e 0%, #a63a50 100%)',
    gold:     'linear-gradient(135deg, #f2cc8f 0%, #e0b872 100%)',
  },

  fontFamily: '"Georgia", "Times New Roman", "PT Serif", serif',
};
