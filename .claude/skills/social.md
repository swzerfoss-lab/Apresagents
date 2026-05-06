# Social Media Post Generation Skill

Generate social media posts for Apres Feels across Instagram, TikTok, Facebook, and Pinterest.

## Usage

```
/social [topic] [--platform instagram|tiktok|facebook|pinterest|all] [--type post|story|reel]
```

## Instructions

When the user invokes this skill:

1. **Gather Requirements** (if not provided):
   - Ask for post topic/theme
   - Ask for platform(s) to target
   - Ask for content type (regular post, story, reel)

2. **Generate Social Content**:
   Run this command in the Apresagents project directory:
   ```bash
   cd ~/Apresagents && node dist/cli.js generate \
     --topic "<TOPIC>" \
     --platforms <PLATFORM> \
     --count 1
   ```

   For interactive mode:
   ```bash
   cd ~/Apresagents && node dist/cli.js generate -i
   ```

3. **Report Results**:
   - Show the generated caption/copy
   - Show recommended hashtags
   - Show posting recommendations (best time, etc.)
   - If image/video needed, suggest using `/image` or `/video` skills

## Examples

- `/social powder day vibes` - Generate post about skiing
- `/social product launch --platform instagram` - Instagram-specific post
- `/social recovery tips --platform all` - Cross-platform content

## Platform Guidelines

**Instagram**: 
- 2,200 char limit, 30 hashtags max
- Hook in first line, emojis encouraged
- Best times: 11am-1pm, 7pm-9pm

**TikTok**:
- 2,200 char limit
- Trend-aware, casual tone
- Hashtag challenges encouraged

**Facebook**:
- Longer form OK, link-friendly
- Community engagement focus
- Best for older demographics

**Pinterest**:
- SEO-optimized descriptions
- Keyword-rich, evergreen content
- Link to product pages

## Brand Voice

**Apres Feels** tone:
- Work hard, play hard
- Adventurous and fun
- Premium but approachable
- Authentic mountain lifestyle
