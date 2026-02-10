import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader,
  Settings,
  RefreshCw,
  Eye,
  ThumbsUp,
} from 'lucide-react';

interface SchedulerStatus {
  isRunning: boolean;
  config: {
    enabled: boolean;
    dayOfWeek: number;
    hour: number;
    minute: number;
    timezone: string;
  };
  lastCheck: string | null;
  nextScheduledRun: string | null;
}

interface WorkflowSummary {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  currentStage: string;
  createdAt: string;
  completedAt?: string;
  totalPosts: number;
  metrics: {
    totalPosts: number;
    postsCompleted: number;
    imagesGenerated: number;
    videosGenerated: number;
  };
}

interface ReadyPost {
  id: string;
  platform: string;
  contentType: string;
  category: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  images: { status: string }[];
  videos: { status: string }[];
}

interface Stats {
  totalWorkflows: number;
  totalPosts: number;
  postsByStatus: Record<string, number>;
  totalImages: number;
  totalVideos: number;
}

export default function Workflow() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [readyPosts, setReadyPosts] = useState<ReadyPost[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [schedulerRes, workflowsRes, postsRes, statsRes] = await Promise.all([
        fetch('/api/workflow/scheduler/status'),
        fetch('/api/workflow/list'),
        fetch('/api/workflow/ready-posts'),
        fetch('/api/workflow/stats'),
      ]);

      const schedulerData = await schedulerRes.json();
      const workflowsData = await workflowsRes.json();
      const postsData = await postsRes.json();
      const statsData = await statsRes.json();

      if (schedulerData.success) setSchedulerStatus(schedulerData.scheduler);
      if (workflowsData.success) setWorkflows(workflowsData.workflows);
      if (postsData.success) setReadyPosts([...postsData.readyPosts, ...postsData.approvedPosts]);
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduler = async () => {
    try {
      const endpoint = schedulerStatus?.isRunning
        ? '/api/workflow/scheduler/stop'
        : '/api/workflow/scheduler/start';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling scheduler:', error);
    }
  };

  const triggerWorkflow = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/workflow/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: ['instagram', 'tiktok', 'facebook', 'pinterest'],
          postsPerPlatform: 5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Workflow triggered! Check back in a few minutes.');
        fetchData();
      }
    } catch (error) {
      console.error('Error triggering workflow:', error);
    } finally {
      setTriggering(false);
    }
  };

  const approvePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/workflow/posts/${postId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Error approving post:', error);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'text-green-600 bg-green-100',
      running: 'text-blue-600 bg-blue-100',
      failed: 'text-red-600 bg-red-100',
      scheduled: 'text-gray-600 bg-gray-100',
      ready: 'text-green-600 bg-green-100',
      approved: 'text-purple-600 bg-purple-100',
      draft: 'text-yellow-600 bg-yellow-100',
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      instagram: '📸',
      tiktok: '🎵',
      facebook: '👥',
      pinterest: '📌',
    };
    return emojis[platform] || '📱';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader className="w-8 h-8 animate-spin text-alpine-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Workflow</h1>
          <p className="text-gray-600">Automated content generation pipeline</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Scheduler Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-alpine-600" />
            Scheduler
          </h2>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                schedulerStatus?.isRunning
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {schedulerStatus?.isRunning ? 'Active' : 'Stopped'}
            </span>
            <button
              onClick={toggleScheduler}
              className={`p-2 rounded-lg ${
                schedulerStatus?.isRunning
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              {schedulerStatus?.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Schedule</p>
            <p className="text-lg font-semibold text-gray-900">
              Every {schedulerStatus?.config ? dayNames[schedulerStatus.config.dayOfWeek] : 'Sunday'} at{' '}
              {schedulerStatus?.config
                ? `${schedulerStatus.config.hour % 12 || 12}:${String(schedulerStatus.config.minute).padStart(2, '0')} ${schedulerStatus.config.hour >= 12 ? 'PM' : 'AM'}`
                : '8:00 PM'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Next Run</p>
            <p className="text-lg font-semibold text-gray-900">
              {schedulerStatus?.nextScheduledRun
                ? formatDateTime(schedulerStatus.nextScheduledRun)
                : 'Not scheduled'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Manual Trigger</p>
            <button
              onClick={triggerWorkflow}
              disabled={triggering}
              className="mt-1 px-4 py-2 bg-alpine-600 text-white rounded-lg hover:bg-alpine-700 disabled:opacity-50 flex items-center gap-2"
            >
              {triggering ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Workflows</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalWorkflows}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Ready to Post</p>
            <p className="text-2xl font-bold text-green-600">
              {(stats.postsByStatus.ready || 0) + (stats.postsByStatus.approved || 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Images Generated</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalImages}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Videos Generated</p>
            <p className="text-2xl font-bold text-pink-600">{stats.totalVideos}</p>
          </div>
        </div>
      )}

      {/* Workflow History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-alpine-600" />
          Workflow History
        </h2>

        {workflows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No workflows yet. Trigger one manually or wait for the scheduled run.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedWorkflow(selectedWorkflow === workflow.id ? null : workflow.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {workflow.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : workflow.status === 'running' ? (
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : workflow.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        Week of {new Date(workflow.weekStartDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {workflow.totalPosts} posts • Created {formatDateTime(workflow.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workflow.status)}`}>
                      {workflow.status}
                    </span>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {selectedWorkflow === workflow.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Stage</p>
                      <p className="font-medium">{workflow.currentStage}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Posts Completed</p>
                      <p className="font-medium">{workflow.metrics.postsCompleted} / {workflow.metrics.totalPosts}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Images</p>
                      <p className="font-medium">{workflow.metrics.imagesGenerated}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Videos</p>
                      <p className="font-medium">{workflow.metrics.videosGenerated}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ready Posts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Ready to Post ({readyPosts.length})
        </h2>

        {readyPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No ready posts yet. Run a workflow to generate content.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {readyPosts.slice(0, 10).map((post) => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getPlatformEmoji(post.platform)}</span>
                      <span className="font-medium text-gray-900 capitalize">{post.platform}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(post.scheduledDate).toLocaleDateString()} at {post.scheduledTime}
                      </span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">{post.caption}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span>{post.hashtags.length} hashtags</span>
                      <span>{post.images.filter((i) => i.status === 'completed').length} images</span>
                      <span>{post.videos.filter((v) => v.status === 'completed').length} videos</span>
                    </div>
                  </div>
                  {post.status === 'ready' && (
                    <button
                      onClick={() => approvePost(post.id)}
                      className="ml-4 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Pipeline Explanation */}
      <div className="bg-gradient-to-br from-alpine-50 to-powder-50 rounded-xl border border-alpine-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-alpine-600" />
          How the Weekly Workflow Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { num: 1, title: 'Strategy', desc: 'Content calendar & topics generated' },
            { num: 2, title: 'Copywriting', desc: 'Captions & prompts created' },
            { num: 3, title: 'Images', desc: 'Visuals generated from prompts' },
            { num: 4, title: 'Videos', desc: 'Videos created with Veo 3' },
            { num: 5, title: 'Assembly', desc: 'Posts formatted per platform' },
          ].map((step, idx) => (
            <div key={step.num} className="relative">
              <div className="bg-white rounded-lg p-4 border border-alpine-200">
                <div className="w-8 h-8 bg-alpine-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                  {step.num}
                </div>
                <p className="font-medium text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
              {idx < 4 && (
                <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-alpine-300" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
