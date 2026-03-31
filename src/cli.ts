#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { SocialMediaManagerAgent, VideoContentAgent } from './agents/index.js';
import { getBrandConfig, sampleProducts, validateConfig } from './config/index.js';
import type { SocialPlatform, CampaignObjective } from './types/index.js';

// Initialize video agent
const videoAgent = new VideoContentAgent(getBrandConfig());

const program = new Command();

// Validate configuration
const configCheck = validateConfig();
if (!configCheck.valid) {
  console.error(
    chalk.red(`Missing required environment variables: ${configCheck.missing.join(', ')}`)
  );
  console.log(chalk.yellow('Please create a .env file based on .env.example'));
  process.exit(1);
}

// Initialize brand config and manager
const brandConfig = getBrandConfig();
const manager = new SocialMediaManagerAgent(brandConfig);

program
  .name('apresagents')
  .description('AI-powered social media content agents for skincare brands')
  .version('1.0.0');

/**
 * Generate content command
 */
program
  .command('generate')
  .description('Generate social media content')
  .option('-t, --topic <topic>', 'Content topic')
  .option(
    '-p, --platforms <platforms>',
    'Platforms (comma-separated: instagram,tiktok,facebook,pinterest)',
    'instagram'
  )
  .option('--product <productId>', 'Product ID to feature')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    let topic = options.topic;
    let platforms: SocialPlatform[] = options.platforms.split(',') as SocialPlatform[];
    let product = options.product ? sampleProducts.find((p) => p.id === options.product) : undefined;

    if (options.interactive || !topic) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'topic',
          message: 'What topic should the content be about?',
          default: topic || 'hydration tips for winter skin',
        },
        {
          type: 'checkbox',
          name: 'platforms',
          message: 'Which platforms?',
          choices: ['instagram', 'tiktok', 'facebook', 'pinterest'],
          default: platforms,
        },
        {
          type: 'list',
          name: 'product',
          message: 'Feature a product?',
          choices: [
            { name: 'No product', value: null },
            ...sampleProducts.map((p) => ({ name: `${p.name} ($${p.price})`, value: p.id })),
          ],
        },
      ]);

      topic = answers.topic;
      platforms = answers.platforms;
      product = answers.product ? sampleProducts.find((p) => p.id === answers.product) : undefined;
    }

    const spinner = ora('Generating content package...').start();

    try {
      const result = await manager.generateContentPackage(topic, platforms, product);

      spinner.stop();

      if (result.success && result.data) {
        console.log(chalk.green('\n✨ Content Package Generated!\n'));
        console.log(chalk.blue('Topic:'), topic);
        console.log(chalk.blue('Brand Voice Score:'), `${result.data.brandVoiceCheck.score}/100`);

        for (const [platform, content] of Object.entries(result.data.content)) {
          console.log(chalk.yellow(`\n--- ${platform.toUpperCase()} ---`));
          console.log(chalk.white('Caption:'));
          console.log(content.caption);
          console.log(chalk.gray('\nHashtags:'), content.hashtags.map((h) => `#${h}`).join(' '));
          console.log(chalk.gray('CTA:'), content.callToAction);
          console.log(chalk.gray('Visual:'), content.visualDescription);
        }

        console.log(chalk.magenta('\n--- AI IMAGE PROMPTS ---'));
        result.data.visualPrompts.forEach((prompt, i) => {
          console.log(chalk.gray(`\n${i + 1}. ${prompt}`));
        });
      } else {
        console.log(chalk.red('Failed to generate content:'), result.error);
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error:'), error);
    }
  });

/**
 * Create campaign command
 */
program
  .command('campaign')
  .description('Create an ad campaign')
  .option('-o, --objective <objective>', 'Campaign objective (awareness, engagement, traffic, conversions, sales)')
  .option('-p, --platforms <platforms>', 'Platforms (comma-separated)', 'instagram,facebook')
  .option('-b, --budget <budget>', 'Campaign budget in dollars')
  .option('--product <productId>', 'Product ID to promote')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    let objective: CampaignObjective = options.objective || 'awareness';
    let platforms: SocialPlatform[] = options.platforms.split(',') as SocialPlatform[];
    let budget = options.budget ? parseInt(options.budget) : undefined;
    let product = options.product ? sampleProducts.find((p) => p.id === options.product) : undefined;

    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'objective',
          message: 'Campaign objective?',
          choices: ['awareness', 'engagement', 'traffic', 'conversions', 'sales'],
          default: objective,
        },
        {
          type: 'checkbox',
          name: 'platforms',
          message: 'Which platforms?',
          choices: ['instagram', 'tiktok', 'facebook', 'pinterest'],
          default: platforms,
        },
        {
          type: 'number',
          name: 'budget',
          message: 'Campaign budget ($)?',
          default: budget || 1000,
        },
        {
          type: 'list',
          name: 'product',
          message: 'Product to promote?',
          choices: [
            { name: 'General brand campaign', value: null },
            ...sampleProducts.map((p) => ({ name: `${p.name} ($${p.price})`, value: p.id })),
          ],
        },
      ]);

      objective = answers.objective;
      platforms = answers.platforms;
      budget = answers.budget;
      product = answers.product ? sampleProducts.find((p) => p.id === answers.product) : undefined;
    }

    const spinner = ora('Creating ad campaign...').start();

    try {
      const result = await manager.createAdCampaign({
        objective,
        platforms,
        budget,
        product,
        targetAudience: {
          ageRange: [25, 45],
          gender: 'female',
          interests: ['skincare', 'beauty', 'self-care', 'wellness'],
        },
      });

      spinner.stop();

      if (result.success && result.data) {
        const campaign = result.data;
        console.log(chalk.green('\n🎯 Ad Campaign Created!\n'));
        console.log(chalk.blue('Campaign Name:'), campaign.name);
        console.log(chalk.blue('Objective:'), campaign.objective);
        console.log(chalk.blue('Platforms:'), campaign.platforms.join(', '));
        console.log(chalk.blue('Estimated Reach:'), campaign.estimatedReach);

        console.log(chalk.yellow('\n--- AD CREATIVES ---'));
        campaign.ads.forEach((ad, i) => {
          console.log(chalk.cyan(`\nAd ${i + 1} (${ad.platform} - ${ad.format})`));
          console.log(chalk.white('Headline:'), ad.headline);
          console.log(chalk.white('Copy:'), ad.primaryText);
          console.log(chalk.white('CTA:'), ad.callToAction);
          console.log(chalk.gray('Visual:'), ad.visualDescription);
        });

        console.log(chalk.yellow('\n--- BUDGET ALLOCATION ---'));
        if (campaign.suggestedBudgetAllocation) {
          for (const [platform, percentage] of Object.entries(campaign.suggestedBudgetAllocation)) {
            console.log(`${platform}: ${percentage}%`);
          }
        }

        console.log(chalk.yellow('\n--- RECOMMENDATIONS ---'));
        campaign.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. ${rec}`);
        });
      } else {
        console.log(chalk.red('Failed to create campaign:'), result.error);
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error:'), error);
    }
  });

/**
 * Content calendar command
 */
program
  .command('calendar')
  .description('Generate a content calendar')
  .option('-d, --days <days>', 'Number of days to plan', '7')
  .option('-p, --platforms <platforms>', 'Platforms (comma-separated)', 'instagram,tiktok')
  .option('-f, --frequency <freq>', 'Posts per week', '7')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    let days = parseInt(options.days);
    let platforms: SocialPlatform[] = options.platforms.split(',') as SocialPlatform[];
    let postsPerWeek = parseInt(options.frequency);

    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'number',
          name: 'days',
          message: 'How many days to plan?',
          default: days,
        },
        {
          type: 'checkbox',
          name: 'platforms',
          message: 'Which platforms?',
          choices: ['instagram', 'tiktok', 'facebook', 'pinterest'],
          default: platforms,
        },
        {
          type: 'number',
          name: 'postsPerWeek',
          message: 'Posts per week?',
          default: postsPerWeek,
        },
      ]);

      days = answers.days;
      platforms = answers.platforms;
      postsPerWeek = answers.postsPerWeek;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const spinner = ora('Generating content calendar...').start();

    try {
      const result = await manager.createDetailedCalendar({
        startDate,
        endDate,
        platforms,
        postsPerWeek,
      });

      spinner.stop();

      if (result.success && result.data) {
        const calendar = result.data;
        console.log(chalk.green('\n📅 Content Calendar Generated!\n'));
        console.log(chalk.blue('Period:'), `${startDate.toDateString()} - ${endDate.toDateString()}`);
        console.log(chalk.blue('Total Posts:'), calendar.summary.totalPosts);

        console.log(chalk.yellow('\n--- CALENDAR ENTRIES ---'));
        calendar.entries.forEach((entry) => {
          const dateStr = typeof entry.date === 'string' ? entry.date : new Date(entry.date).toDateString();
          console.log(
            chalk.cyan(`\n${dateStr} (${entry.dayOfWeek}) - ${entry.platform.toUpperCase()}`)
          );
          console.log(chalk.white('Type:'), entry.contentType);
          console.log(chalk.white('Theme:'), entry.theme);
          console.log(chalk.gray('Description:'), entry.briefDescription);
          console.log(chalk.gray('Best Time:'), entry.suggestedTime);
        });

        console.log(chalk.yellow('\n--- SUMMARY ---'));
        console.log('Posts by Platform:');
        for (const [platform, count] of Object.entries(calendar.summary.postsByPlatform)) {
          console.log(`  ${platform}: ${count}`);
        }

        console.log(chalk.yellow('\n--- RECOMMENDATIONS ---'));
        calendar.summary.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. ${rec}`);
        });
      } else {
        console.log(chalk.red('Failed to generate calendar:'), result.error);
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error:'), error);
    }
  });

/**
 * Video content command
 */
program
  .command('video')
  .description('Create video content (Reel/TikTok)')
  .option('-t, --topic <topic>', 'Video topic')
  .option('-p, --platform <platform>', 'Platform (instagram or tiktok)', 'instagram')
  .option('--product <productId>', 'Product ID to feature')
  .action(async (options) => {
    const topic = options.topic || 'morning skincare routine';
    const platform = options.platform as 'instagram' | 'tiktok';
    const product = options.product ? sampleProducts.find((p) => p.id === options.product) : undefined;

    const spinner = ora(`Creating ${platform} video content...`).start();

    try {
      const result = await manager.createVideoContent(topic, platform, product);

      spinner.stop();

      if (result.success && result.data) {
        console.log(chalk.green(`\n🎬 ${platform.toUpperCase()} Video Content Created!\n`));
        console.log(chalk.blue('Topic:'), topic);

        console.log(chalk.yellow('\n--- SCRIPT ---'));
        console.log(JSON.stringify(result.data.script, null, 2));

        console.log(chalk.yellow('\n--- VISUAL CONCEPT ---'));
        console.log(JSON.stringify(result.data.visualConcept, null, 2));

        console.log(chalk.yellow('\n--- CAPTION ---'));
        console.log(result.data.caption.caption);
        console.log(chalk.gray('\nHashtags:'), result.data.caption.hashtags.map((h) => `#${h}`).join(' '));
      } else {
        console.log(chalk.red('Failed to create video content:'), result.error);
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error:'), error);
    }
  });

/**
 * Veo 3 Video generation command
 */
program
  .command('video-veo')
  .description('Generate AI video with Google Veo 3')
  .option('-t, --topic <topic>', 'Video topic or concept')
  .option('-p, --platform <platform>', 'Platform (instagram, tiktok, facebook, pinterest)', 'instagram')
  .option('-s, --style <style>', 'Video style (cinematic, documentary, dynamic, lifestyle, commercial)', 'cinematic')
  .option('--product <productId>', 'Product ID to feature')
  .option('-d, --duration <duration>', 'Video duration (15s, 30s, 60s)', '30s')
  .option('-o, --output <directory>', 'Output directory for generated videos')
  .option('--generate', 'Actually generate the video (requires Gemini API key)')
  .option('--fast', 'Use fast model (quicker but lower quality)')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    let topic = options.topic;
    let platform = options.platform as SocialPlatform;
    let style = options.style as 'cinematic' | 'documentary' | 'dynamic' | 'lifestyle' | 'commercial';
    let duration = options.duration as '15s' | '30s' | '60s';
    let product = options.product ? sampleProducts.find((p) => p.id === options.product) : undefined;

    if (options.interactive || !topic) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'topic',
          message: 'What should the video be about?',
          default: topic || 'Epic powder day skiing with après recovery',
        },
        {
          type: 'list',
          name: 'platform',
          message: 'Target platform?',
          choices: ['instagram', 'tiktok', 'facebook', 'pinterest'],
          default: platform,
        },
        {
          type: 'list',
          name: 'style',
          message: 'Video style?',
          choices: ['cinematic', 'documentary', 'dynamic', 'lifestyle', 'commercial'],
          default: style,
        },
        {
          type: 'list',
          name: 'duration',
          message: 'Video duration?',
          choices: ['15s', '30s', '60s'],
          default: duration,
        },
        {
          type: 'list',
          name: 'product',
          message: 'Feature a product?',
          choices: [
            { name: 'No product', value: null },
            ...sampleProducts.map((p) => ({ name: `${p.name} ($${p.price})`, value: p.id })),
          ],
        },
        {
          type: 'confirm',
          name: 'generate',
          message: 'Generate actual video with Veo 3?',
          default: false,
        },
      ]);

      topic = answers.topic;
      platform = answers.platform;
      style = answers.style;
      duration = answers.duration;
      product = answers.product ? sampleProducts.find((p) => p.id === answers.product) : undefined;
      options.generate = answers.generate;
    }

    // Check if video generation is available
    if (options.generate && !videoAgent.isVideoGenerationAvailable()) {
      console.log(chalk.yellow('\nVideo generation requires GEMINI_API_KEY in your .env file.'));
      console.log(chalk.gray('Continuing with concept generation only...\n'));
      options.generate = false;
    }

    const spinner = ora('Generating video concept with Veo 3...').start();

    try {
      let result;

      if (product) {
        // Generate product video
        result = await videoAgent.generateProductVideo(
          product,
          style === 'cinematic' ? 'hero' : style === 'lifestyle' ? 'lifestyle' : 'action-recovery',
          platform
        );
      } else {
        // Generate general video concept
        result = await videoAgent.generateVideoConcept(topic, platform, duration, product);
      }

      if (result.success && result.data) {
        spinner.text = 'Video concept ready!';
        spinner.succeed();

        console.log(chalk.green(`\n🎬 Veo 3 Video Concept Generated!\n`));
        console.log(chalk.blue('Title:'), result.data.title);
        console.log(chalk.blue('Platform:'), result.data.platform);
        console.log(chalk.blue('Duration:'), result.data.duration);

        console.log(chalk.yellow('\n--- HOOK ---'));
        console.log(result.data.hook);

        console.log(chalk.yellow('\n--- NARRATIVE ---'));
        console.log(result.data.narrative);

        console.log(chalk.yellow('\n--- SCENES ---'));
        result.data.scenes.forEach((scene) => {
          console.log(chalk.cyan(`\nScene ${scene.sceneNumber} (${scene.timestamp})`));
          console.log(chalk.white('Visual:'), scene.visual);
          console.log(chalk.white('Action:'), scene.action);
          if (scene.text) console.log(chalk.gray('Text:'), scene.text);
          if (scene.audio) console.log(chalk.gray('Audio:'), scene.audio);
        });

        console.log(chalk.yellow('\n--- VISUAL STYLE ---'));
        console.log(result.data.visualStyle);

        console.log(chalk.yellow('\n--- AUDIO DIRECTION ---'));
        console.log(result.data.audioDirection);

        console.log(chalk.yellow('\n--- CALL TO ACTION ---'));
        console.log(result.data.callToAction);

        console.log(chalk.magenta('\n--- VEO 3 PROMPT ---'));
        console.log(chalk.gray(result.data.veoPrompt));

        // Generate actual video if requested
        if (options.generate) {
          console.log();
          const videoSpinner = ora('Generating video with Veo 3 (this may take a moment)...').start();

          const videoResult = await videoAgent.generateVideo(result.data.veoPrompt, {
            aspectRatio: platform === 'facebook' ? '16:9' : '9:16',
            duration: duration === '15s' ? 4 : 8,
            style,
            outputDirectory: options.output,
            withAudio: true,
            useFastModel: options.fast,
          });

          if (videoResult.success && videoResult.data) {
            videoSpinner.succeed('Video generated successfully!');
            console.log(chalk.green('\n✨ Video Generated!'));
            if (videoResult.data.videoUrl) {
              console.log(chalk.blue('Video URL:'), videoResult.data.videoUrl);
            }
            if (videoResult.data.filePath) {
              console.log(chalk.blue('Saved to:'), videoResult.data.filePath);
            }
            console.log(chalk.gray('Duration:'), `${videoResult.data.duration}s`);
            console.log(chalk.gray('Has Audio:'), videoResult.data.hasAudio ? 'Yes' : 'No');
          } else {
            videoSpinner.fail('Video generation failed');
            console.log(chalk.red('Error:'), videoResult.error);
          }
        }
      } else {
        spinner.fail('Failed to generate video concept');
        console.log(chalk.red('Error:'), result.error);
      }
    } catch (error) {
      spinner.fail('Error generating video');
      console.error(chalk.red('Error:'), error);
    }
  });

/**
 * Video campaign command
 */
program
  .command('video-campaign')
  .description('Generate a video campaign with multiple Veo 3 concepts')
  .option('-t, --theme <theme>', 'Campaign theme')
  .option('-s, --season <season>', 'Season (early-season, peak-season, spring-skiing, off-season)')
  .option('-n, --count <count>', 'Number of videos', '5')
  .option('-p, --platforms <platforms>', 'Platforms (comma-separated)', 'instagram,tiktok')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (options) => {
    let theme = options.theme;
    let season = options.season as 'early-season' | 'peak-season' | 'spring-skiing' | 'off-season' | undefined;
    let count = parseInt(options.count);
    let platforms: SocialPlatform[] = options.platforms.split(',') as SocialPlatform[];

    if (options.interactive || (!theme && !season)) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'campaignType',
          message: 'Campaign type?',
          choices: [
            { name: 'Seasonal campaign', value: 'seasonal' },
            { name: 'Custom theme', value: 'custom' },
          ],
        },
        {
          type: 'list',
          name: 'season',
          message: 'Which season?',
          choices: ['early-season', 'peak-season', 'spring-skiing', 'off-season'],
          when: (ans) => ans.campaignType === 'seasonal',
        },
        {
          type: 'input',
          name: 'theme',
          message: 'Campaign theme?',
          default: 'Mountain recovery and wellness',
          when: (ans) => ans.campaignType === 'custom',
        },
        {
          type: 'number',
          name: 'count',
          message: 'Number of videos?',
          default: count,
          when: (ans) => ans.campaignType === 'custom',
        },
        {
          type: 'checkbox',
          name: 'platforms',
          message: 'Target platforms?',
          choices: ['instagram', 'tiktok', 'facebook', 'pinterest'],
          default: platforms,
        },
      ]);

      theme = answers.theme;
      season = answers.season;
      count = answers.count || count;
      platforms = answers.platforms;
    }

    const spinner = ora('Generating video campaign...').start();

    try {
      interface VideoCampaignResult {
        campaignName: string;
        theme: string;
        videos: Array<{
          title: string;
          platform: SocialPlatform;
          duration: string;
          hook: string;
          narrative: string;
          veoPrompt: string;
        }>;
        releaseSchedule: Array<{
          week: number;
          video: string;
          platform: SocialPlatform;
        }>;
      }

      let result: { success: boolean; data?: VideoCampaignResult; error?: string };

      if (season) {
        const seasonResult = await videoAgent.generateSeasonalVideoCampaign(season);
        if (seasonResult.success && seasonResult.data) {
          result = {
            success: true,
            data: {
              campaignName: seasonResult.data.campaignName,
              theme: seasonResult.data.theme,
              videos: seasonResult.data.videos,
              releaseSchedule: seasonResult.data.releaseSchedule,
            },
          };
        } else {
          result = { success: false, error: seasonResult.error };
        }
      } else {
        const campaignVideos = await videoAgent.generateCampaignVideos(theme || 'Mountain lifestyle', platforms, count);
        if (campaignVideos.success && campaignVideos.data) {
          result = {
            success: true,
            data: {
              campaignName: `${theme} Campaign`,
              theme: theme || 'Mountain lifestyle',
              videos: campaignVideos.data,
              releaseSchedule: campaignVideos.data.map((v, i) => ({
                week: Math.floor(i / 2) + 1,
                video: v.title,
                platform: v.platform,
              })),
            },
          };
        } else {
          result = { success: false, error: campaignVideos.error };
        }
      }

      spinner.stop();

      if (result.success && result.data) {
        console.log(chalk.green('\n🎬 Video Campaign Generated!\n'));
        console.log(chalk.blue('Campaign:'), result.data.campaignName);
        console.log(chalk.blue('Theme:'), result.data.theme);
        console.log(chalk.blue('Total Videos:'), result.data.videos.length);

        console.log(chalk.yellow('\n--- VIDEOS ---'));
        result.data.videos.forEach((video, i) => {
          console.log(chalk.cyan(`\n${i + 1}. ${video.title}`));
          console.log(chalk.white('Platform:'), video.platform);
          console.log(chalk.white('Duration:'), video.duration);
          console.log(chalk.white('Hook:'), video.hook);
          console.log(chalk.gray('Narrative:'), video.narrative);
          console.log(chalk.magenta('Veo 3 Prompt:'), video.veoPrompt);
        });

        console.log(chalk.yellow('\n--- RELEASE SCHEDULE ---'));
        result.data.releaseSchedule.forEach((entry) => {
          console.log(`Week ${entry.week}: ${entry.video} (${entry.platform})`);
        });
      } else {
        console.log(chalk.red('Failed to generate video campaign:'), result.error);
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error:'), error);
    }
  });

/**
 * Brand guidelines command
 */
program
  .command('brand')
  .description('Generate brand guidelines')
  .action(async () => {
    const spinner = ora('Generating brand guidelines...').start();

    try {
      const result = await manager.generateBrandGuidelines();

      spinner.stop();

      if (result.success && result.data) {
        console.log(chalk.green('\n📋 Brand Guidelines Generated!\n'));

        console.log(chalk.yellow('--- VOICE GUIDELINES ---'));
        console.log(JSON.stringify(result.data.voiceGuidelines, null, 2));

        console.log(chalk.yellow('\n--- VISUAL GUIDELINES ---'));
        console.log(result.data.visualGuidelines);
      } else {
        console.log(chalk.red('Failed to generate guidelines'));
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error:'), error);
    }
  });

/**
 * List products command
 */
program
  .command('products')
  .description('List available sample products')
  .action(() => {
    console.log(chalk.green('\n📦 Available Products:\n'));
    sampleProducts.forEach((product) => {
      console.log(chalk.cyan(`${product.id}: ${product.name}`));
      console.log(chalk.gray(`  ${product.description}`));
      console.log(chalk.gray(`  Price: $${product.price} | Category: ${product.category}`));
      console.log(chalk.gray(`  Key Ingredients: ${product.keyIngredients.join(', ')}`));
      console.log();
    });
  });

program.parse();
