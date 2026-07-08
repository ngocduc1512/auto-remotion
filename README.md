# AI Remotion Video Starter — Book Review Channel Edition

Create short-form book-review videos (TikTok / Reels / Shorts) by talking to Claude Code, Codex, or Gemini. You give the AI a book, a rating, and a takeaway line — it edits this project, and Remotion Studio renders the 9:16 MP4.

## 📚 Quick start

```bash
npm install
npm run dev        # opens Remotion Studio at http://localhost:3000
```

Two compositions live under folder **`Book-Review`** in the Studio:

- **`Book-Review-Shorts`** — 18s book card (Atomic Habits demo).
- **`Book-Review-EI-Narrative`** — 62s narrative review, voice-over + BGM baked in.

To render:

```bash
npx remotion render Book-Review-EI-Narrative out/ei.mp4
```

## 🎙 Voice-over pipeline

The narrative composition plays `public/ei-voice.m4a` (ElevenLabs `eleven_v3`, VN native) plus `public/lofi-motivational.mp3` at ~-21 dB. To generate a fresh voice-over for a new script:

1. Put your ElevenLabs settings in `.env` (see `.env.example` — `ELEVENLABS_API_KEY`, `VOICE_ID`, `MODEL`, `STABILITY`, etc.).
2. Save your script as plain text, e.g. `public/ei-script.txt`.
3. Run:
   ```bash
   npm run gen-voice -- public/ei-script.txt ei-voice
   ```
   This writes:
   - `public/ei-voice.mp3` — the audio
   - `public/ei-voice.words.json` — per-word timings
   - `public/ei-voice.srt` — sentence-level SRT (feed this to your beat table)
4. Update the `B` beat table in `src/projects/book-review/EIReview.tsx` with the new SRT timings, then re-render.

## 📝 Making a new episode

- **Same scene, new book**: edit `FEATURED_BOOK` in `src/projects/book-review/types.ts` (for `Book-Review-Shorts`).
- **New narrative script**: drop new script into `public/*-script.txt`, run `gen-voice`, adapt beat table.
- **New layout altogether** (Top 3, comparison, etc.): open Claude Code / Codex in this folder. Read `src/projects/book-review/PROJECT.md` first — it briefs the AI on brand colors, typography, animation style, constraints.

The generic Remotion instructions below still apply.

---

## Choose Your Language

[English Guide](#english-guide) | [Hướng Dẫn Tiếng Việt](#hướng-dẫn-tiếng-việt)

## English Guide

### What This Is

This is a Remotion video project. It is not the full Remotion source-code repository.

Use this project when you want to:

- Create short-form videos for TikTok, YouTube Shorts, or Instagram Reels
- Create landscape explainer videos for YouTube or courses
- Ask an AI coding tool to build animated videos for you
- Reuse the same project structure for many videos

### What You Need

Install these first:

1. [Node.js LTS](https://nodejs.org)
2. An AI coding tool, for example:
   - [Codex](https://help.openai.com/en/articles/11096431)
   - [Claude Code](https://support.claude.com/en/articles/14552382-your-first-day-in-claude-code)
3. A code editor such as [Visual Studio Code](https://code.visualstudio.com), optional but helpful

### Get The Project

If this repository is published as a GitHub template:

1. Open the GitHub repository.
2. Click **Use this template**.
3. Create your own copy.
4. Download or clone your copy to your computer.

If you downloaded the ZIP file:

1. Unzip it.
2. Open the project folder.

### Install And Preview

Open a terminal in the project folder and run:

```bash
npm install
```

Then start Remotion Studio:

```bash
npm run dev
```

Open the local website shown in the terminal. It is usually:

```text
http://localhost:3000
```

### Create A Video With Codex

Install Codex:

```bash
npm install -g @openai/codex
```

Open the project folder in your terminal and run:

```bash
codex
```

Then paste a prompt like this:

```text
Read AGENTS.md first.

Create a new vertical short video about how AI helps small businesses save time.

Make it clear for non-technical viewers. Use bold typography, simple animated scenes, and a friendly modern style.

Add the new video under src/projects, register it in src/Root.tsx, and tell me the composition ID when finished.
```

### Create A Video With Claude Code

Install Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
```

Open the project folder in your terminal and run:

```bash
claude
```

Then paste a prompt like this:

```text
Please read CLAUDE.md and AGENTS.md first.

Create a new vertical Remotion short video about why Vietnamese coffee is special.

Use the existing project structure and design system. Add the new video under src/projects, register it in src/Root.tsx, and tell me how to preview and render it.
```

### Preview The Video

After the AI creates the video, keep Remotion Studio running:

```bash
npm run dev
```

Choose the new composition from the Remotion Studio sidebar.

### Render The Final Video

Ask the AI for the composition ID, then run:

```bash
npx remotion render COMPOSITION_ID out/video.mp4
```

Example:

```bash
npx remotion render My-New-Short out/video.mp4
```

Your rendered video will be saved at:

```text
out/video.mp4
```

### Useful Files

- `AGENTS.md`: main instructions for AI coding tools
- `CLAUDE.md`: Claude Code instructions that point to `AGENTS.md`
- `PROMPTS.md`: copy/paste prompts for creating videos
- `src/Root.tsx`: list of videos available in Remotion Studio
- `src/projects/`: folder for video projects
- `src/design-system/`: reusable visual helpers

### Why Repeat Instructions In The Prompt?

`AGENTS.md` already tells the AI how this project works.

You still repeat the most important request in the prompt because the prompt tells the AI what you want this time. Think of it like this:

- `AGENTS.md` = the house rules
- Your prompt = today's task

So the prompt does not need to repeat everything, but it should include the video topic, format, audience, style, and expected result.

## Hướng Dẫn Tiếng Việt

### Đây Là Gì?

Đây là một dự án Remotion để tạo video bằng code và AI.

Đây không phải là source code gốc đầy đủ của Remotion. Đây là một project mẫu để bạn có thể dùng AI tạo video mới nhanh hơn.

Bạn có thể dùng project này để:

- Tạo video ngắn cho TikTok, YouTube Shorts, Instagram Reels
- Tạo video giải thích dạng ngang cho YouTube hoặc khóa học
- Nhờ AI tạo animation và nội dung video
- Tái sử dụng cùng một cấu trúc cho nhiều video khác nhau

### Bạn Cần Cài Gì?

Hãy cài trước:

1. [Node.js LTS](https://nodejs.org)
2. Một công cụ AI coding:
   - [Codex](https://help.openai.com/en/articles/11096431)
   - [Claude Code](https://support.claude.com/en/articles/14552382-your-first-day-in-claude-code)
3. [Visual Studio Code](https://code.visualstudio.com), không bắt buộc nhưng nên có

### Lấy Project Về Máy

Nếu repo này được để dạng GitHub template:

1. Mở repo trên GitHub.
2. Bấm **Use this template**.
3. Tạo một bản copy riêng của bạn.
4. Tải hoặc clone project về máy.

Nếu bạn tải file ZIP:

1. Giải nén file ZIP.
2. Mở thư mục project.

### Cài Đặt Và Xem Thử

Mở terminal trong thư mục project và chạy:

```bash
npm install
```

Sau đó mở Remotion Studio:

```bash
npm run dev
```

Mở đường link hiện trong terminal. Thường là:

```text
http://localhost:3000
```

### Tạo Video Bằng Codex

Cài Codex:

```bash
npm install -g @openai/codex
```

Mở terminal trong thư mục project và chạy:

```bash
codex
```

Sau đó dán prompt này:

```text
Read AGENTS.md first.

Create a new vertical short video about how AI helps small businesses save time.

Make it clear for non-technical viewers. Use bold typography, simple animated scenes, and a friendly modern style.

Add the new video under src/projects, register it in src/Root.tsx, and tell me the composition ID when finished.
```

### Tạo Video Bằng Claude Code

Cài Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
```

Mở terminal trong thư mục project và chạy:

```bash
claude
```

Sau đó dán prompt này:

```text
Please read CLAUDE.md and AGENTS.md first.

Create a new vertical Remotion short video about why Vietnamese coffee is special.

Use the existing project structure and design system. Add the new video under src/projects, register it in src/Root.tsx, and tell me how to preview and render it.
```

### Xem Thử Video

Sau khi AI tạo video xong, chạy:

```bash
npm run dev
```

Sau đó chọn video mới trong Remotion Studio.

### Xuất Video Cuối Cùng

Hỏi AI composition ID của video, rồi chạy:

```bash
npx remotion render COMPOSITION_ID out/video.mp4
```

Ví dụ:

```bash
npx remotion render My-New-Short out/video.mp4
```

Video sẽ nằm ở:

```text
out/video.mp4
```

### Các File Quan Trọng

- `AGENTS.md`: hướng dẫn chính cho AI coding tool
- `CLAUDE.md`: hướng dẫn cho Claude Code, trỏ về `AGENTS.md`
- `PROMPTS.md`: các prompt mẫu để copy/paste
- `src/Root.tsx`: danh sách video trong Remotion Studio
- `src/projects/`: nơi chứa các video project
- `src/design-system/`: các helper về giao diện và style

### Vì Sao Vẫn Nên Nhắc Lại Trong Prompt?

`AGENTS.md` đã có quy tắc chung cho AI.

Nhưng prompt vẫn cần nói rõ bạn muốn tạo video gì trong lần này. Hiểu đơn giản:

- `AGENTS.md` = luật chung của project
- Prompt = việc cần làm hôm nay

Vì vậy prompt nên có: chủ đề video, dạng ngang hay dọc, người xem là ai, phong cách mong muốn, và kết quả cần nhận.

## Publishing Checklist

Before sharing this repository publicly:

- Make sure `node_modules/`, `out/`, `.env`, and `.DS_Store` are not committed.
- Add a clear GitHub repository description.
- Turn on **Template repository** in GitHub settings if you want learners to click **Use this template**.
- Keep `AGENTS.md`, `CLAUDE.md`, and `PROMPTS.md` in the repository.
- Mention that Remotion has its own license terms: https://www.remotion.dev/license

## License

This starter project is released under the MIT License. Remotion itself has separate license terms. Please review the Remotion license if you use Remotion commercially.
