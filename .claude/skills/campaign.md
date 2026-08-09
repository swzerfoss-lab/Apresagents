# Campaign Generation Skill

Create a complete content campaign with videos, images, and social posts for Apres Feels.

## Usage

```
/campaign [theme] [--platforms instagram,tiktok] [--duration 1week|2weeks|month] [--season winter|spring|summer|fall]
```

## Instructions

When the user invokes this skill:

1. **Gather Requirements** (if not provided):
   - Campaign theme/objective
   - Target platforms
   - Campaign duration
   - Season/timing context
   - Any specific products to feature

2. **Generate Campaign Strategy**:
   Run the campaign command:
   ```bash
   cd ~/Apresagents && node dist/cli.js video-campaign \
     --theme "<THEME>" \
     --platforms <PLATFORMS> \
     --count <NUMBER_OF_VIDEOS>
   ```

3. **Generate Assets**:
   For each piece of content in the campaign:
   
   **Videos** (hero content):
   ```bash
   node dist/cli.js video-veo --topic "<VIDEO_TOPIC>" -d 30s --generate --fast -o ./campaign_assets
   ```
   
   **Images** (supporting content):
   ```bash
   node dist/cli.js image --prompt "<IMAGE_PROMPT>" -o ./campaign_assets
   ```
   
   **Social Copy**:
   ```bash
   node dist/cli.js generate --topic "<POST_TOPIC>" --platforms <PLATFORM>
   ```

4. **Create Content Calendar**:
   Suggest posting schedule based on:
   - Platform best practices
   - Content type (video vs image vs text)
   - Campaign duration

5. **Report Results**:
   - List all generated assets
   - Provide content calendar
   - Show posting recommendations

## Examples

- `/campaign powder season launch` - Winter product campaign
- `/campaign summer training --platforms instagram,tiktok --duration 2weeks`
- `/campaign holiday gift guide --season winter`

## Campaign Types

**Product Launch**:
- 1 hero video (30-60s)
- 3-5 supporting videos (15s)
- 5-10 images
- Daily posts for 1-2 weeks

**Seasonal**:
- 2-3 hero videos
- Weekly content themes
- User-generated content prompts

**Awareness**:
- Educational content focus
- Tips and how-tos
- Influencer collaboration hooks

## Content Mix Recommendations

| Platform  | Videos | Images | Text Posts |
|-----------|--------|--------|------------|
| Instagram | 40%    | 40%    | 20%        |
| TikTok    | 80%    | 10%    | 10%        |
| Facebook  | 30%    | 40%    | 30%        |
| Pinterest | 20%    | 70%    | 10%        |

## Brand Context

**Apres Feels** campaigns should:
- Lead with mountain lifestyle imagery
- Showcase product benefits naturally
- Include user testimonial angles
- End with clear CTAs to apresfeels.com
