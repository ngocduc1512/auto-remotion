# Background Music Library

Every video plays one of the tracks here as BGM under the voice-over,
at roughly -21 dB (0.09 volume) so it stays under the narration.

## How episodes pick a track

In `episodes/<id>.json`:

```json
"bgm": {
  "file": "bgm/lofi-motivational.mp3",
  "volume": 0.09,
  "fadeSec": 1.5
}
```

The path is relative to `public/`. Fade seconds control the in/out ramp at
the very start and end of the video.

## Recommended tracks per format

Rotate BGM per episode so the channel doesn't sound identical every time.

| Format         | Mood                      | Track kind to look for                          |
|----------------|---------------------------|-------------------------------------------------|
| narrative      | Cozy, warm, thoughtful    | Lo-fi hip-hop, mellow piano, warm jazz          |
| essay          | Contemplative, cinematic  | Cinematic ambient, slow strings                 |
| documentary    | Serious, weighty          | Documentary piano, dark ambient, minimal drums  |
| hook-reel      | Punchy, energetic         | Trailer bass, upbeat electronic                 |

## Free / royalty-free sources for Vietnamese creators

- **[YouTube Audio Library](https://studio.youtube.com/channel/UC/music)** — free, filter by "No attribution required". Best selection.
- **[Pixabay Music](https://pixabay.com/music/)** — free, no signup. Filter by mood + duration.
- **[Free Music Archive](https://freemusicarchive.org/)** — verify individual track's Creative Commons license.
- **[Uppbeat](https://uppbeat.io/browse/music)** — free tier gives 10 downloads/month. Higher quality.
- **[Purple Planet](https://www.purple-planet.com/)** — free with attribution.

## Adding a new track

1. Download the MP3 (or convert to MP3 at 128–192 kbps if you got a WAV).
2. Rename with kebab-case + a descriptive suffix: `cinematic-drone.mp3`, `piano-melancholic.mp3`, `trailer-bass.mp3`.
3. Save to `public/bgm/`.
4. Reference it from any episode JSON with `"file": "bgm/<name>.mp3"`.

## Length considerations

Tracks are looped automatically if shorter than the video, so **20-40s tracks
are ideal** — long enough that the loop point isn't jarring, short enough that
you can preview quickly. Trim in QuickTime / Audacity if needed.
