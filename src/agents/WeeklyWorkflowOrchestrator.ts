/**
 * WeeklyWorkflowOrchestrator
 *
 * Coordinates the end-to-end weekly content creation pipeline:
 * 1. Strategy Agent generates weekly plan (Sunday 8pm)
 * 2. Copywriting Agent writes posts and generates prompts
 * 3. Visual Content Agent generates images from prompts
 * 4. Video Content Agent generates videos from prompts
 * 5. Assembly phase formats posts for each platform
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { ContentStrategyAgent } from './ContentStrategyAgent.js';
import { CopywritingAgent } from './CopywritingAgent.js';
import { VisualContentAgent } from './VisualContentAgent.js';
import { VideoContentAgent } from './VideoContentAgent.js';
import { BrandVoiceAgent } from './BrandVoiceAgent.js';
import { InstagramAgent } from './platforms/InstagramAgent.js';
import { TikTokAgent } from './platforms/TikTokAgent.js';
import { FacebookAgent } from './platforms/FacebookAgent.js';
import { PinterestAgent } from './platforms/PinterestAgent.js';
import {
  BrandConfig,
  WeeklyWorkflow,
  PlannedPost,
  GeneratedAsset,
  ReadyPost,
  PlatformFormatting,
  WorkflowStage,
  SocialPlatform,
  ContentType,
  CalendarEntry,
  ContentEditRequest,
  CalendarEditRequest,
  AssetRegenerateRequest,
} from '../types/index.js';
import { ContentStorage } from '../storage/ContentStorage.js';
import { parallelLimit } from '../utils/async.js';

export class WeeklyWorkflowOrchestrator {
  private strategyAgent: ContentStrategyAgent;
  private copywritingAgent: CopywritingAgent;
  private visualAgent: VisualContentAgent;
  private videoAgent: VideoContentAgent;
  private brandVoiceAgent: BrandVoiceAgent;
  private platformAgents: {
    instagram: InstagramAgent;
    tiktok: TikTokAgent;
    facebook: FacebookAgent;
    pinterest: PinterestAgent;
  };
  private storage: ContentStorage;
  private brandConfig: BrandConfig;
  private currentWorkflow: WeeklyWorkflow | null = null;
  private assetsDir: string;

  constructor(brandConfig: BrandConfig) {
    this.brandConfig = brandConfig;
    this.strategyAgent = new ContentStrategyAgent(brandConfig);
    this.copywritingAgent = new CopywritingAgent(brandConfig);
    this.visualAgent = new VisualContentAgent(brandConfig);
    this.videoAgent = new VideoContentAgent(brandConfig);
    this.brandVoiceAgent = new BrandVoiceAgent(brandConfig);
    this.platformAgents = {
      instagram: new InstagramAgent(brandConfig),
      tiktok: new TikTokAgent(brandConfig),
      facebook: new FacebookAgent(brandConfig),
      pinterest: new PinterestAgent(brandConfig),
    };
    this.storage = new ContentStorage();

    // Setup assets directory for generated images and videos
    this.assetsDir = path.join(process.cwd(), 'data', 'assets');
    fs.mkdirSync(path.join(this.assetsDir, 'images'), { recursive: true });
    fs.mkdirSync(path.join(this.assetsDir, 'videos'), { recursive: true });
  }

  /**
   * Execute the complete weekly workflow
   */
  async executeWeeklyWorkflow(
    weekStartDate?: Date,
    options?: {
      platforms?: SocialPlatform[];
      postsPerPlatform?: number;
      skipVideoGeneration?: boolean;
      skipImageGeneration?: boolean;
    }
  ): Promise<WeeklyWorkflow> {
    const startDate = weekStartDate || this.getNextMondayDate();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Initialize workflow
    this.currentWorkflow = {
      id: uuidv4(),
      weekStartDate: startDate,
      weekEndDate: endDate,
      status: 'running',
      currentStage: 'strategy',
      createdAt: new Date(),
      posts: [],
      errors: [],
      metrics: {
        totalPosts: 0,
        postsCompleted: 0,
        imagesGenerated: 0,
        videosGenerated: 0,
        startTime: new Date(),
      },
      stageApprovals: [],
      awaitingApproval: false,
    };

    console.log(`\n🚀 Starting Weekly Workflow for week of ${startDate.toDateString()}`);
    console.log(`Workflow ID: ${this.currentWorkflow.id}\n`);

    // Save immediately so workflow appears in UI
    await this.storage.saveWorkflow(this.currentWorkflow);

    try {
      // Stage 1: Generate Content Strategy
      console.log('📋 Stage 1: Generating Content Strategy...');
      await this.executeStrategyStage(startDate, endDate, options);
      this.currentWorkflow.status = 'awaiting-approval';
      this.currentWorkflow.awaitingApproval = true;
      await this.storage.saveWorkflow(this.currentWorkflow);
      console.log('✅ Strategy complete - awaiting approval\n');

      // Workflow pauses here - user must approve to continue
      return this.currentWorkflow;
    } catch (error) {
      this.currentWorkflow.status = 'failed';
      this.addError(
        this.currentWorkflow.currentStage,
        `Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false
      );
      await this.storage.saveWorkflow(this.currentWorkflow);
      throw error;
    }
  }

  /**
   * Approve current stage and continue to next stage
   */
  async approveStageAndContinue(
    workflowId: string,
    options?: {
      skipVideoGeneration?: boolean;
      skipImageGeneration?: boolean;
    }
  ): Promise<WeeklyWorkflow> {
    // Load workflow if not current
    if (!this.currentWorkflow || this.currentWorkflow.id !== workflowId) {
      const workflow = await this.storage.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      this.currentWorkflow = workflow;
    }

    if (!this.currentWorkflow.awaitingApproval) {
      throw new Error('Workflow is not awaiting approval');
    }

    const currentStage = this.currentWorkflow.currentStage;

    // Record approval
    this.currentWorkflow.stageApprovals.push({
      stage: currentStage,
      approved: true,
      approvedAt: new Date(),
    });
    this.currentWorkflow.awaitingApproval = false;

    try {
      // Determine next stage and execute
      if (currentStage === 'strategy') {
        this.currentWorkflow.status = 'strategy-complete';
        await this.storage.saveWorkflow(this.currentWorkflow);

        console.log('✍️ Stage 2: Generating Copy and Prompts...');
        this.currentWorkflow.currentStage = 'copywriting';
        this.currentWorkflow.status = 'running';
        await this.storage.saveWorkflow(this.currentWorkflow);

        await this.executeCopywritingStage();
        this.currentWorkflow.status = 'awaiting-approval';
        this.currentWorkflow.awaitingApproval = true;
        await this.storage.saveWorkflow(this.currentWorkflow);
        console.log('✅ Copywriting complete - awaiting approval\n');

      } else if (currentStage === 'copywriting') {
        this.currentWorkflow.status = 'copywriting-complete';
        await this.storage.saveWorkflow(this.currentWorkflow);

        if (!options?.skipImageGeneration) {
          console.log('🎨 Stage 3: Generating Images...');
          this.currentWorkflow.currentStage = 'image-generation';
          this.currentWorkflow.status = 'running';
          await this.storage.saveWorkflow(this.currentWorkflow);

          await this.executeImageGenerationStage();
          this.currentWorkflow.status = 'awaiting-approval';
          this.currentWorkflow.awaitingApproval = true;
          await this.storage.saveWorkflow(this.currentWorkflow);
          console.log('✅ Images complete - awaiting approval\n');
        } else {
          // Skip to video or assembly
          if (options?.skipVideoGeneration) {
            await this.runAssemblyStageAndPause();
          } else {
            await this.runVideoGenerationStageAndPause();
          }
        }

      } else if (currentStage === 'image-generation') {
        this.currentWorkflow.status = 'images-complete';
        await this.storage.saveWorkflow(this.currentWorkflow);

        if (!options?.skipVideoGeneration) {
          console.log('🎬 Stage 4: Generating Videos...');
          this.currentWorkflow.currentStage = 'video-generation';
          this.currentWorkflow.status = 'running';
          await this.storage.saveWorkflow(this.currentWorkflow);

          await this.executeVideoGenerationStage();
          this.currentWorkflow.status = 'awaiting-approval';
          this.currentWorkflow.awaitingApproval = true;
          await this.storage.saveWorkflow(this.currentWorkflow);
          console.log('✅ Videos complete - awaiting approval\n');
        } else {
          // Skip to assembly
          await this.runAssemblyStageAndPause();
        }

      } else if (currentStage === 'video-generation') {
        this.currentWorkflow.status = 'videos-complete';
        await this.storage.saveWorkflow(this.currentWorkflow);

        console.log('📦 Stage 5: Assembling Ready Posts...');
        this.currentWorkflow.currentStage = 'assembly';
        this.currentWorkflow.status = 'running';
        await this.storage.saveWorkflow(this.currentWorkflow);

        await this.executeAssemblyStage();
        this.currentWorkflow.status = 'awaiting-approval';
        this.currentWorkflow.awaitingApproval = true;
        await this.storage.saveWorkflow(this.currentWorkflow);
        console.log('✅ Assembly complete - awaiting final approval\n');

      } else if (currentStage === 'assembly') {
        // Final stage - mark workflow as complete
        this.currentWorkflow.status = 'completed';
        this.currentWorkflow.awaitingApproval = false;
        this.currentWorkflow.completedAt = new Date();
        this.currentWorkflow.metrics.endTime = new Date();
        this.currentWorkflow.metrics.totalDurationMs =
          this.currentWorkflow.metrics.endTime.getTime() -
          (this.currentWorkflow.metrics.startTime?.getTime() || 0);

        await this.storage.saveWorkflow(this.currentWorkflow);

        console.log('🎉 Weekly Workflow Complete!');
        console.log(`Total Posts: ${this.currentWorkflow.metrics.totalPosts}`);
        console.log(`Images Generated: ${this.currentWorkflow.metrics.imagesGenerated}`);
        console.log(`Videos Generated: ${this.currentWorkflow.metrics.videosGenerated}`);
      }

      return this.currentWorkflow;
    } catch (error) {
      this.currentWorkflow.status = 'failed';
      this.addError(
        this.currentWorkflow.currentStage,
        `Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false
      );
      await this.storage.saveWorkflow(this.currentWorkflow);
      throw error;
    }
  }

  private async runVideoGenerationStageAndPause(): Promise<void> {
    console.log('🎬 Stage 4: Generating Videos...');
    this.currentWorkflow!.currentStage = 'video-generation';
    this.currentWorkflow!.status = 'running';
    await this.storage.saveWorkflow(this.currentWorkflow!);

    await this.executeVideoGenerationStage();
    this.currentWorkflow!.status = 'awaiting-approval';
    this.currentWorkflow!.awaitingApproval = true;
    await this.storage.saveWorkflow(this.currentWorkflow!);
    console.log('✅ Videos complete - awaiting approval\n');
  }

  private async runAssemblyStageAndPause(): Promise<void> {
    console.log('📦 Stage 5: Assembling Ready Posts...');
    this.currentWorkflow!.currentStage = 'assembly';
    this.currentWorkflow!.status = 'running';
    await this.storage.saveWorkflow(this.currentWorkflow!);

    await this.executeAssemblyStage();
    this.currentWorkflow!.status = 'awaiting-approval';
    this.currentWorkflow!.awaitingApproval = true;
    await this.storage.saveWorkflow(this.currentWorkflow!);
    console.log('✅ Assembly complete - awaiting final approval\n');
  }

  /**
   * Edit post content (caption, hashtags, CTA)
   */
  async editPostContent(workflowId: string, edit: ContentEditRequest): Promise<ReadyPost | null> {
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) return null;

    const post = workflow.posts.find(p => p.id === edit.postId);
    if (!post) return null;

    if (edit.caption !== undefined) post.caption = edit.caption;
    if (edit.hashtags !== undefined) post.hashtags = edit.hashtags;
    if (edit.callToAction !== undefined) post.callToAction = edit.callToAction;

    await this.storage.saveWorkflow(workflow);

    // Update current workflow if it's the same
    if (this.currentWorkflow?.id === workflowId) {
      this.currentWorkflow = workflow;
    }

    return post;
  }

  /**
   * Edit planned post in calendar (before copywriting)
   */
  async editCalendarEntry(workflowId: string, edit: CalendarEditRequest): Promise<PlannedPost | null> {
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow || !workflow.strategy) return null;

    const plannedPost = workflow.strategy.posts.find(p => p.id === edit.postId);
    if (!plannedPost) return null;

    if (edit.scheduledDate !== undefined) plannedPost.scheduledDate = edit.scheduledDate;
    if (edit.scheduledTime !== undefined) plannedPost.scheduledTime = edit.scheduledTime;
    if (edit.topic !== undefined) plannedPost.topic = edit.topic;
    if (edit.briefDescription !== undefined) plannedPost.briefDescription = edit.briefDescription;
    if (edit.platform !== undefined) plannedPost.platform = edit.platform;
    if (edit.contentType !== undefined) plannedPost.contentType = edit.contentType;
    if (edit.category !== undefined) plannedPost.category = edit.category;

    await this.storage.saveWorkflow(workflow);

    if (this.currentWorkflow?.id === workflowId) {
      this.currentWorkflow = workflow;
    }

    return plannedPost;
  }

  /**
   * Regenerate an asset with a new prompt
   */
  async regenerateAsset(workflowId: string, request: AssetRegenerateRequest): Promise<GeneratedAsset | null> {
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) return null;

    const post = workflow.posts.find(p => p.id === request.postId);
    if (!post) return null;

    const assets = request.type === 'image' ? post.images : post.videos;
    const asset = assets.find(a => a.id === request.assetId);
    if (!asset) return null;

    // Update prompt and reset status
    asset.prompt = request.newPrompt;
    asset.status = 'pending';
    asset.url = undefined;
    asset.filePath = undefined;
    asset.generatedAt = undefined;

    await this.storage.saveWorkflow(workflow);

    // Now regenerate
    try {
      asset.status = 'generating';
      await this.storage.saveWorkflow(workflow);

      if (request.type === 'image') {
        const aspectRatio = this.getImageAspectRatio(post.platform, post.contentType);
        const imagesDir = path.join(this.assetsDir, 'images');
        const result = await this.visualAgent.generateImage(request.newPrompt, {
          aspectRatio,
          outputDirectory: imagesDir,
        });

        if (result.success && result.data) {
          const fileName = result.data.filePath ? path.basename(result.data.filePath) : `${asset.id}.png`;
          asset.url = `/api/assets/images/${fileName}`;
          asset.filePath = result.data.filePath;
          asset.status = 'completed';
          asset.generatedAt = new Date();
        } else {
          asset.status = 'failed';
        }
      } else {
        const videosDir = path.join(this.assetsDir, 'videos');
        const result = await this.videoAgent.generateVideo(request.newPrompt, {
          duration: 8,
          outputDirectory: videosDir,
        });

        if (result.success && result.data) {
          const fileName = result.data.filePath ? path.basename(result.data.filePath) : `${asset.id}.mp4`;
          asset.url = `/api/assets/videos/${fileName}`;
          asset.filePath = result.data.filePath;
          asset.status = 'completed';
          asset.generatedAt = new Date();
          asset.metadata = { prompt: result.data.prompt };
        } else {
          asset.status = 'failed';
        }
      }
    } catch (_error) {
      asset.status = 'failed';
    }

    await this.storage.saveWorkflow(workflow);

    if (this.currentWorkflow?.id === workflowId) {
      this.currentWorkflow = workflow;
    }

    return asset;
  }

  /**
   * Stage 1: Generate content strategy and weekly plan
   */
  private async executeStrategyStage(
    startDate: Date,
    endDate: Date,
    options?: {
      platforms?: SocialPlatform[];
      postsPerPlatform?: number;
    }
  ): Promise<void> {
    this.currentWorkflow!.currentStage = 'strategy';

    const platforms: SocialPlatform[] = options?.platforms || ['instagram', 'tiktok', 'facebook', 'pinterest'];
    const postsPerPlatform = options?.postsPerPlatform || 5;

    // Generate calendar with ContentStrategyAgent
    const calendarResult = await this.strategyAgent.generateCalendar({
      startDate,
      endDate,
      platforms,
      postsPerWeek: postsPerPlatform * platforms.length,
    });

    if (!calendarResult.success || !calendarResult.data) {
      throw new Error('Failed to generate content calendar');
    }

    const calendar = calendarResult.data;

    // Convert calendar entries to planned posts
    const plannedPosts: PlannedPost[] = calendar.entries.map((entry: CalendarEntry) => ({
      id: uuidv4(),
      scheduledDate: new Date(entry.date),
      scheduledTime: entry.suggestedTime,
      platform: entry.platform,
      contentType: entry.contentType,
      category: entry.category,
      topic: entry.theme,
      briefDescription: entry.briefDescription,
      priority: this.determinePriority(entry),
    }));

    // Create weekly content plan
    const weekNumber = this.getWeekNumber(startDate);
    this.currentWorkflow!.strategy = {
      weekNumber,
      year: startDate.getFullYear(),
      theme: calendar.summary.keyThemes[0] || 'Weekly Content',
      goals: calendar.summary.recommendations,
      posts: plannedPosts,
    };

    this.currentWorkflow!.metrics.totalPosts = plannedPosts.length;
  }

  /**
   * Stage 2: Generate copy and prompts for each planned post
   */
  private async executeCopywritingStage(): Promise<void> {
    this.currentWorkflow!.currentStage = 'copywriting';

    const strategy = this.currentWorkflow!.strategy;
    if (!strategy) {
      throw new Error('No strategy found - run strategy stage first');
    }

    for (const plannedPost of strategy.posts) {
      try {
        // Generate caption using correct method signature
        const captionResult = await this.copywritingAgent.generateCaption(
          plannedPost.platform,
          plannedPost.topic,
          undefined, // product
          plannedPost.briefDescription // additionalContext
        );

        if (!captionResult.success || !captionResult.data) {
          this.addError('copywriting', `Failed to generate caption for post ${plannedPost.id}`, true);
          continue;
        }

        // Generate hashtags using correct method signature
        const hashtagResult = await this.copywritingAgent.generateHashtags(
          plannedPost.topic,
          plannedPost.platform
        );

        // Combine hashtags from all categories
        const allHashtags: string[] = [];
        if (hashtagResult.success && hashtagResult.data) {
          allHashtags.push(
            ...hashtagResult.data.primary,
            ...hashtagResult.data.secondary,
            ...hashtagResult.data.branded
          );
        }

        // Generate image prompt using correct method signature
        const imagePromptResult = await this.visualAgent.generateImagePrompt(
          plannedPost.topic,
          plannedPost.platform
        );

        // Prepare image asset
        const imageAssets: GeneratedAsset[] = [];
        if (imagePromptResult.success && imagePromptResult.data) {
          imageAssets.push({
            id: uuidv4(),
            postId: plannedPost.id,
            type: 'image',
            prompt: imagePromptResult.data.prompt, // Extract the prompt string
            status: 'pending',
          });
        }

        // Generate video prompt if applicable
        const videoAssets: GeneratedAsset[] = [];
        if (this.shouldGenerateVideo(plannedPost)) {
          const videoConcept = await this.videoAgent.generateVideoConcept(
            plannedPost.topic,
            plannedPost.platform,
            this.getVideoDuration(plannedPost.platform)
          );

          if (videoConcept.success && videoConcept.data) {
            videoAssets.push({
              id: uuidv4(),
              postId: plannedPost.id,
              type: 'video',
              prompt: videoConcept.data.veoPrompt,
              status: 'pending',
            });
          }
        }

        // Create ready post structure
        const readyPost: ReadyPost = {
          id: plannedPost.id,
          workflowId: this.currentWorkflow!.id,
          platform: plannedPost.platform,
          contentType: plannedPost.contentType,
          category: plannedPost.category,
          scheduledDate: plannedPost.scheduledDate,
          scheduledTime: plannedPost.scheduledTime,
          status: 'draft',
          caption: captionResult.data.caption,
          hashtags: allHashtags.length > 0 ? allHashtags : captionResult.data.hashtags,
          callToAction: captionResult.data.callToAction || '',
          images: imageAssets,
          videos: videoAssets,
          platformFormatting: await this.getDefaultPlatformFormatting(
            plannedPost.platform,
            captionResult.data.caption,
            allHashtags.length > 0 ? allHashtags : captionResult.data.hashtags
          ),
          createdAt: new Date(),
        };

        this.currentWorkflow!.posts.push(readyPost);
        this.currentWorkflow!.metrics.postsCompleted++;

        // Save progress after each post
        await this.storage.saveWorkflow(this.currentWorkflow!);

        console.log(`  ✓ Generated copy for: ${plannedPost.topic} (${plannedPost.platform})`);
      } catch (error) {
        this.addError(
          'copywriting',
          `Error processing post ${plannedPost.id}: ${error instanceof Error ? error.message : 'Unknown'}`,
          true,
          plannedPost.id
        );
      }
    }
  }

  /**
   * Stage 3: Generate images from prompts
   */
  private async executeImageGenerationStage(): Promise<void> {
    this.currentWorkflow!.currentStage = 'image-generation';

    // Flatten all pending images into a single array for parallel processing
    const pendingImages: Array<{ post: ReadyPost; image: GeneratedAsset }> = [];
    for (const post of this.currentWorkflow!.posts) {
      for (const image of post.images) {
        if (image.status === 'pending') {
          pendingImages.push({ post, image });
        }
      }
    }

    console.log(`  Processing ${pendingImages.length} images in parallel (concurrency: 3)...`);

    // Process images in parallel with concurrency limit of 3
    await parallelLimit(
      pendingImages,
      async ({ post, image }) => {
        try {
          image.status = 'generating';

          const aspectRatio = this.getImageAspectRatio(post.platform, post.contentType);
          const imagesDir = path.join(this.assetsDir, 'images');
          const result = await this.visualAgent.generateImage(image.prompt, {
            aspectRatio,
            outputDirectory: imagesDir,
          });

          if (result.success && result.data) {
            const fileName = result.data.filePath ? path.basename(result.data.filePath) : `${image.id}.png`;
            image.url = `/api/assets/images/${fileName}`;
            image.filePath = result.data.filePath;
            image.status = 'completed';
            image.generatedAt = new Date();
            this.currentWorkflow!.metrics.imagesGenerated++;
            console.log(`  ✓ Generated image for: ${post.id}`);
          } else {
            image.status = 'failed';
            this.addError('image-generation', `Failed to generate image: ${result.error}`, true, post.id);
          }
        } catch (error) {
          image.status = 'failed';
          this.addError(
            'image-generation',
            `Error generating image: ${error instanceof Error ? error.message : 'Unknown'}`,
            true,
            post.id
          );
        }
      },
      3 // Concurrency limit
    );

    // Save progress after all images are processed
    await this.storage.saveWorkflow(this.currentWorkflow!);
  }

  /**
   * Stage 4: Generate videos from prompts
   */
  private async executeVideoGenerationStage(): Promise<void> {
    this.currentWorkflow!.currentStage = 'video-generation';

    // Flatten all pending videos into a single array for parallel processing
    const pendingVideos: Array<{ post: ReadyPost; video: GeneratedAsset }> = [];
    for (const post of this.currentWorkflow!.posts) {
      for (const video of post.videos) {
        if (video.status === 'pending') {
          pendingVideos.push({ post, video });
        }
      }
    }

    console.log(`  Processing ${pendingVideos.length} videos in parallel (concurrency: 2)...`);

    // Process videos in parallel with concurrency limit of 2 (videos are expensive)
    await parallelLimit(
      pendingVideos,
      async ({ post, video }) => {
        try {
          video.status = 'generating';

          const videosDir = path.join(this.assetsDir, 'videos');
          const result = await this.videoAgent.generateVideo(video.prompt, {
            duration: 8,
            outputDirectory: videosDir,
          });

          if (result.success && result.data) {
            const fileName = result.data.filePath ? path.basename(result.data.filePath) : `${video.id}.mp4`;
            video.url = `/api/assets/videos/${fileName}`;
            video.filePath = result.data.filePath;
            video.status = 'completed';
            video.generatedAt = new Date();
            video.metadata = { prompt: result.data.prompt };
            this.currentWorkflow!.metrics.videosGenerated++;
            console.log(`  ✓ Generated video for: ${post.id}`);
          } else {
            video.status = 'failed';
            this.addError('video-generation', `Failed to generate video: ${result.error}`, true, post.id);
          }
        } catch (error) {
          video.status = 'failed';
          this.addError(
            'video-generation',
            `Error generating video: ${error instanceof Error ? error.message : 'Unknown'}`,
            true,
            post.id
          );
        }
      },
      2 // Lower concurrency for videos (expensive operations)
    );

    // Save progress after all videos are processed
    await this.storage.saveWorkflow(this.currentWorkflow!);
  }

  /**
   * Stage 5: Assemble and format ready posts for each platform
   */
  private async executeAssemblyStage(): Promise<void> {
    this.currentWorkflow!.currentStage = 'assembly';

    for (const post of this.currentWorkflow!.posts) {
      try {
        // Get platform-specific formatting
        const platformAgent = this.platformAgents[post.platform];
        const specs = platformAgent.getSpecs();

        // Format caption to platform limits
        const formattedCaption = this.formatCaptionForPlatform(
          post.caption,
          specs.maxCaptionLength
        );

        // Format hashtags
        const formattedHashtags = post.hashtags
          .slice(0, specs.maxHashtags)
          .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
          .join(' ');

        // Update platform formatting
        post.platformFormatting = {
          platform: post.platform,
          formattedCaption,
          formattedHashtags,
          characterCount: formattedCaption.length + formattedHashtags.length,
          hashtagCount: post.hashtags.slice(0, specs.maxHashtags).length,
          aspectRatio: this.getAspectRatio(post.platform, post.contentType),
          additionalNotes: specs.bestPractices,
          isWithinLimits:
            formattedCaption.length <= specs.maxCaptionLength &&
            post.hashtags.length <= specs.maxHashtags,
        };

        // Brand voice review - use correct method signature
        const reviewResult = await this.brandVoiceAgent.reviewContent(
          formattedCaption,
          post.platform
        );

        if (reviewResult.success && reviewResult.data) {
          // reviewContent returns overallScore, not score
          if (reviewResult.data.overallScore >= 70) {
            post.status = 'ready';
          } else {
            post.platformFormatting.additionalNotes.push(
              `Brand review score: ${reviewResult.data.overallScore}/100. ${reviewResult.data.suggestions?.join('. ') || ''}`
            );
            post.status = 'draft'; // Needs review
          }
        } else {
          post.status = 'ready';
        }

        // Save progress after each assembled post
        await this.storage.saveWorkflow(this.currentWorkflow!);

        console.log(`  ✓ Assembled: ${post.platform} post for ${post.scheduledDate.toDateString()}`);
      } catch (error) {
        this.addError(
          'assembly',
          `Error assembling post: ${error instanceof Error ? error.message : 'Unknown'}`,
          true,
          post.id
        );
        post.status = 'failed';
      }
    }
  }

  // Helper methods

  private getNextMondayDate(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }

  private determinePriority(entry: CalendarEntry): 'high' | 'medium' | 'low' {
    if (entry.category === 'promotional' || entry.category === 'seasonal') {
      return 'high';
    }
    if (entry.category === 'product-highlight' || entry.category === 'educational') {
      return 'medium';
    }
    return 'low';
  }

  private shouldGenerateVideo(post: PlannedPost): boolean {
    const videoContentTypes: ContentType[] = ['reel', 'video', 'story'];
    const videoPlatforms: SocialPlatform[] = ['tiktok', 'instagram'];
    return (
      videoContentTypes.includes(post.contentType) ||
      (videoPlatforms.includes(post.platform) && Math.random() > 0.5)
    );
  }

  private getVideoDuration(platform: SocialPlatform): '15s' | '30s' | '60s' {
    if (platform === 'tiktok') return '30s';
    if (platform === 'instagram') return '15s';
    return '30s';
  }

  private getVideoDurationSeconds(platform: SocialPlatform): number {
    const duration = this.getVideoDuration(platform);
    return parseInt(duration.replace('s', ''), 10);
  }

  private getAspectRatio(platform: SocialPlatform, contentType: ContentType): string {
    const ratios: Record<SocialPlatform, Record<string, string>> = {
      instagram: { post: '1:1', reel: '9:16', story: '9:16', carousel: '1:1', video: '9:16', pin: '1:1', ad: '1:1' },
      tiktok: { post: '9:16', reel: '9:16', story: '9:16', carousel: '9:16', video: '9:16', pin: '9:16', ad: '9:16' },
      facebook: { post: '1:1', reel: '9:16', story: '9:16', carousel: '1:1', video: '16:9', pin: '1:1', ad: '1:1' },
      pinterest: { post: '2:3', reel: '2:3', story: '2:3', carousel: '2:3', video: '2:3', pin: '2:3', ad: '2:3' },
    };
    return ratios[platform]?.[contentType] || '1:1';
  }

  private getImageAspectRatio(
    platform: SocialPlatform,
    contentType: ContentType
  ): '1:1' | '9:16' | '16:9' | '3:4' | '4:3' {
    // Map platform+contentType to supported Gemini aspect ratios
    if (platform === 'tiktok' || contentType === 'reel' || contentType === 'story') {
      return '9:16';
    }
    if (platform === 'pinterest') {
      return '3:4'; // Closest to 2:3
    }
    if (contentType === 'video' && platform === 'facebook') {
      return '16:9';
    }
    return '1:1';
  }

  private formatCaptionForPlatform(caption: string, maxLength: number): string {
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength - 3) + '...';
  }

  private async getDefaultPlatformFormatting(
    platform: SocialPlatform,
    caption: string,
    hashtags: string[]
  ): Promise<PlatformFormatting> {
    const platformAgent = this.platformAgents[platform];
    const specs = platformAgent.getSpecs();

    return {
      platform,
      formattedCaption: caption,
      formattedHashtags: hashtags.join(' '),
      characterCount: caption.length,
      hashtagCount: hashtags.length,
      aspectRatio: '1:1',
      additionalNotes: [],
      isWithinLimits:
        caption.length <= specs.maxCaptionLength && hashtags.length <= specs.maxHashtags,
    };
  }

  private addError(
    stage: WorkflowStage,
    message: string,
    recoverable: boolean,
    postId?: string
  ): void {
    this.currentWorkflow!.errors.push({
      stage,
      postId,
      message,
      timestamp: new Date(),
      recoverable,
    });
    console.error(`  ⚠️ Error in ${stage}: ${message}`);
  }

  /**
   * Get current workflow status
   */
  getWorkflowStatus(): WeeklyWorkflow | null {
    return this.currentWorkflow;
  }

  /**
   * Get all workflows from storage
   */
  async getAllWorkflows(): Promise<WeeklyWorkflow[]> {
    return this.storage.getAllWorkflows();
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<WeeklyWorkflow | null> {
    return this.storage.getWorkflow(id);
  }

  /**
   * Get ready posts for a specific date
   */
  async getPostsForDate(date: Date): Promise<ReadyPost[]> {
    if (!this.currentWorkflow) return [];
    return this.currentWorkflow.posts.filter(
      (post) => post.scheduledDate.toDateString() === date.toDateString()
    );
  }

  /**
   * Approve a post for publishing
   */
  async approvePost(postId: string): Promise<boolean> {
    if (!this.currentWorkflow) return false;
    const post = this.currentWorkflow.posts.find((p) => p.id === postId);
    if (post) {
      post.status = 'approved';
      post.approvedAt = new Date();
      await this.storage.saveWorkflow(this.currentWorkflow);
      return true;
    }
    return false;
  }
}
