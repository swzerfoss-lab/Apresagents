/**
 * WorkflowScheduler
 *
 * Manages scheduled execution of weekly content workflows.
 * Triggers the WeeklyWorkflowOrchestrator every Sunday at 8pm.
 */

import { WeeklyWorkflowOrchestrator } from '../agents/WeeklyWorkflowOrchestrator.js';
import { ContentStorage } from '../storage/ContentStorage.js';
import { BrandConfig, SchedulerConfig, WorkflowTrigger, SocialPlatform } from '../types/index.js';

export class WorkflowScheduler {
  private orchestrator: WeeklyWorkflowOrchestrator;
  private storage: ContentStorage;
  private brandConfig: BrandConfig;
  private config: SchedulerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastCheck: Date | null = null;
  private nextScheduledRun: Date | null = null;

  constructor(brandConfig: BrandConfig, config?: Partial<SchedulerConfig>) {
    this.brandConfig = brandConfig;
    this.config = {
      enabled: true,
      dayOfWeek: 0, // Sunday
      hour: 20, // 8pm
      minute: 0,
      timezone: 'America/New_York',
      ...config,
    };
    this.orchestrator = new WeeklyWorkflowOrchestrator(brandConfig);
    this.storage = new ContentStorage();
    this.calculateNextRun();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('🗓️ Starting Workflow Scheduler...');
    console.log(`   Scheduled: Every ${this.getDayName(this.config.dayOfWeek)} at ${this.formatTime(this.config.hour, this.config.minute)}`);
    console.log(`   Next run: ${this.nextScheduledRun?.toLocaleString()}`);

    this.isRunning = true;

    // Check every minute if it's time to run
    this.intervalId = setInterval(() => {
      this.checkAndRun().catch((error) => {
        console.error('Scheduler check failed:', error);
      });
    }, 60000); // Check every minute

    // Also check immediately on start
    this.checkAndRun().catch((error) => {
      console.error('Initial scheduler check failed:', error);
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Workflow Scheduler stopped');
  }

  /**
   * Check if it's time to run and execute if so
   */
  private async checkAndRun(): Promise<void> {
    this.lastCheck = new Date();

    if (!this.config.enabled) {
      return;
    }

    const now = new Date();

    // Check if current time matches scheduled time
    if (this.shouldRunNow(now)) {
      console.log(`\n⏰ Scheduled time reached! Starting weekly workflow...`);
      await this.triggerWorkflow('scheduled');
      this.calculateNextRun();
    }
  }

  /**
   * Determine if workflow should run now
   */
  private shouldRunNow(now: Date): boolean {
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check if it's the right day, hour, and within the first minute
    return (
      dayOfWeek === this.config.dayOfWeek &&
      hour === this.config.hour &&
      minute === this.config.minute
    );
  }

  /**
   * Manually trigger the workflow
   */
  async triggerWorkflow(
    type: 'scheduled' | 'manual',
    options?: {
      platforms?: SocialPlatform[];
      postsPerPlatform?: number;
      skipVideoGeneration?: boolean;
      skipImageGeneration?: boolean;
    }
  ): Promise<void> {
    const trigger: WorkflowTrigger = {
      type,
      triggeredAt: new Date(),
      triggeredBy: type === 'manual' ? 'user' : 'scheduler',
    };

    console.log(`\n📋 Workflow triggered: ${type}`);
    console.log(`   Time: ${trigger.triggeredAt.toLocaleString()}`);

    try {
      const workflow = await this.orchestrator.executeWeeklyWorkflow(undefined, options);
      console.log(`\n✅ Workflow completed successfully!`);
      console.log(`   ID: ${workflow.id}`);
      console.log(`   Posts created: ${workflow.posts.length}`);
    } catch (error) {
      console.error(`\n❌ Workflow failed:`, error);
    }
  }

  /**
   * Calculate the next scheduled run time
   */
  private calculateNextRun(): void {
    const now = new Date();
    const next = new Date(now);

    // Set to the configured time
    next.setHours(this.config.hour, this.config.minute, 0, 0);

    // Calculate days until next scheduled day
    const currentDay = now.getDay();
    let daysUntilNext = this.config.dayOfWeek - currentDay;

    if (daysUntilNext < 0) {
      daysUntilNext += 7;
    } else if (daysUntilNext === 0) {
      // If same day, check if time has passed
      if (now > next) {
        daysUntilNext = 7;
      }
    }

    next.setDate(next.getDate() + daysUntilNext);
    this.nextScheduledRun = next;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    lastCheck: Date | null;
    nextScheduledRun: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastCheck: this.lastCheck,
      nextScheduledRun: this.nextScheduledRun,
    };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.calculateNextRun();
    console.log('📅 Scheduler configuration updated');
    console.log(`   Next run: ${this.nextScheduledRun?.toLocaleString()}`);
  }

  /**
   * Get the orchestrator instance
   */
  getOrchestrator(): WeeklyWorkflowOrchestrator {
    return this.orchestrator;
  }

  // Helper methods

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  private formatTime(hour: number, minute: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
  }
}

export default WorkflowScheduler;
