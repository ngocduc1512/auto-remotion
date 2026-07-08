# Claude Code Instructions

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project uses [AGENTS.md](AGENTS.md) as the main source of truth for AI coding instructions.

## Primary Reference

Before creating or editing videos, read [AGENTS.md](AGENTS.md).

When a user asks for a new video:

1. Create the video under `src/projects/`.
2. Register the composition in `src/Root.tsx`.
3. Keep the project runnable with `npm run dev`.
4. Tell the user the composition ID, preview command, and render command.

## This repo is customized for a book-review channel

The default use case here is short-form book review videos (TikTok / Reels / Shorts, 9:16, 15–20s).

- Reference project: `src/projects/book-review/` — read `PROJECT.md` inside for brand identity, palette, typography, and constraints.
- The visual language is **editorial / library at dusk**, not tech. Use serif fonts for titles (Georgia), warm gold `#e0b872` for accents, deep navy `#0f0a1c` for background.
- When the user says "làm 1 tập review sách cho cuốn X", the simplest path is to edit `FEATURED_BOOK` in `src/projects/book-review/types.ts`, not to create a new project. Only create a new project when the layout itself needs to change (e.g., "Top 3 sách", "So sánh 2 cuốn").
- For entirely different content (M5 comparison, MIE, etc.) the old projects are still available under `src/projects/`.
