# Image Generation Skill

Generate AI images using Google Imagen 4. Creates premium visual content for Apres Feels brand.

## Usage

```
/image [description] [--style photo|illustration|product] [--aspect 1:1|16:9|9:16]
```

## Instructions

When the user invokes this skill:

1. **Gather Requirements** (if not provided):
   - Ask for image description/concept
   - Ask for style (photo-realistic, illustration, product shot)
   - Ask for aspect ratio (1:1 for Instagram, 9:16 for Stories, 16:9 for landscape)

2. **Generate Image**:
   Run this command in the Apresagents project directory:
   ```bash
   cd ~/Apresagents && node dist/cli.js image \
     --prompt "<DESCRIPTION>" \
     --style <STYLE> \
     --aspect <ASPECT_RATIO> \
     -o ./images
   ```

   If the CLI doesn't have an image command yet, use the API directly:
   ```bash
   cd ~/Apresagents && node -e "
   const { VisualContentAgent } = require('./dist/agents/VisualContentAgent.js');
   const { getBrandConfig } = require('./dist/config/index.js');
   const agent = new VisualContentAgent(getBrandConfig());
   agent.generateImage('<DESCRIPTION>', { outputDirectory: './images' })
     .then(r => console.log(r.success ? 'Saved to: ' + r.data?.filePath : 'Error: ' + r.error));
   "
   ```

3. **Report Results**:
   - Show the generated image path
   - Provide command to open: `open <path>`

## Examples

- `/image skier carving through powder at golden hour` - Action shot
- `/image premium skincare product on marble with mountain backdrop --style product` - Product shot
- `/image cozy lodge fireplace with hot cocoa --aspect 9:16` - Story format

## Requirements

- GEMINI_API_KEY in .env for Imagen access

## Brand Context

Images are for **Apres Feels** - premium winter sports recovery brand. Visual style:
- Mountain cinema aesthetic
- Cool alpine blues, warm amber highlights
- Premium/luxury feel
- Natural ingredients and mountain elements
