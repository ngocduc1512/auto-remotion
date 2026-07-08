export type Book = {
  title: string;
  author: string;
  year: number;
  pages: number;
  genre: string;
  /** 0–5, may be half. Rendered as gold stars. */
  rating: number;
  /** One-line hook shown after the cover reveal. */
  takeaway: string;
  /** Two–three tag chips shown under the title. */
  tags: string[];
  /** Colors for the fake cover. */
  cover: {
    /** Base spine color */
    base: string;
    /** Accent shape / typography color */
    accent: string;
    /** Small motif rendered on the cover (emoji works well). */
    motif: string;
  };
};

export const FEATURED_BOOK: Book = {
  title: 'Atomic Habits',
  author: 'James Clear',
  year: 2018,
  pages: 320,
  genre: 'Self-Help',
  rating: 4.5,
  takeaway: 'Bạn không vươn lên tầm mục tiêu — bạn rơi xuống tầm hệ thống của mình.',
  tags: ['Thói quen', 'Năng suất', 'Đọc nhanh'],
  cover: {
    base: '#c66c4e',
    accent: '#f5ead6',
    motif: '⚛',
  },
};
