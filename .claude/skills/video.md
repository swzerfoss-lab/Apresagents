# Video Generation Skill

Generate AI videos using Google Veo 3. Creates multi-clip videos (15s, 30s, or 60s) with focused prompts for each scene.

## Usage

```
/video [topic] [--duration 15s|30s|60s] [--platform instagram|tiktok|facebook] [--fast]
```

## Instructions

When the user invokes this skill:

1. **Gather Requirements** (if not provided):
   - Ask for the video topic/concept
   - Ask for duration (15s = 2 clips, 30s = 4 clips, 60s = 8 clips)
   - Ask for target platform (affects aspect ratio)

2. **Generate Video**:
   Run this command in the Apresagents project directory:
   ```bash
   cd ~/Apresagents && node dist/cli.js video-veo \
     --topic "<TOPIC>" \
     -d <DURATION> \
     -p <PLATFORM> \
     --generate \
     --fast \
     -o ./videos
   ```

3. **Report Results**:
   - Show the generated clip paths
   - Show the final combined video path (if ffmpeg available)
   - Provide the command to open the video: `open <path>`

## Examples

- `/video epic powder day skiing` - Generate a 30s Instagram video about skiing
- `/video product showcase --duration 15s --platform tiktok` - Short TikTok video
- `/video mountain sunset relaxation --duration 60s` - Longer cinematic video

## Requirements

- GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS in .env
- ffmpeg installed for auto-combining clips (`brew install ffmpeg`)

## Brand Context

Videos are for **Apres Feels** - a premium winter sports recovery and skincare brand. Content should capture:
- Mountain adventure and ski culture
- Premium recovery and skincare moments
- The work hard/play hard lifestyle
- Après-ski social scenes
