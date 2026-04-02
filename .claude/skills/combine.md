# Video Combine Skill

Combine multiple video clips into a single final video using ffmpeg.

## Usage

```
/combine [--directory ./videos] [--output final_video.mp4] [--transition none|fade]
```

## Instructions

When the user invokes this skill:

1. **Check Prerequisites**:
   - Verify ffmpeg is installed: `ffmpeg -version`
   - If not installed, tell user: `brew install ffmpeg`

2. **Find Clips**:
   - Look for clips in the specified directory (default: ./videos)
   - Clips should be named: `clip_1_xxx.mp4`, `clip_2_xxx.mp4`, etc.
   - Sort by clip number

3. **Combine Clips**:
   Run this command:
   ```bash
   cd ~/Apresagents && node dist/cli.js video-combine \
     -d <DIRECTORY> \
     -o <OUTPUT_FILENAME> \
     -t <TRANSITION>
   ```

   Or use ffmpeg directly:
   ```bash
   cd <DIRECTORY>
   # Create file list
   for f in clip_*.mp4; do echo "file '$f'" >> list.txt; done
   # Combine
   ffmpeg -f concat -safe 0 -i list.txt -c copy final_video.mp4
   rm list.txt
   ```

4. **Report Results**:
   - Show final video path
   - Show total duration
   - Show file size
   - Provide command to open: `open <path>`

## Examples

- `/combine` - Combine clips in ./videos folder
- `/combine --directory ./campaign1 --output hero_video.mp4` - Custom paths
- `/combine --transition fade` - Add fade transitions between clips

## Transition Options

- `none` - Simple cut between clips (fastest, smallest file)
- `fade` - Fade to black between clips (requires re-encoding)

## Requirements

- ffmpeg installed (`brew install ffmpeg`)
- Video clips named with `clip_N_` prefix
- All clips should have same resolution/codec for best results
