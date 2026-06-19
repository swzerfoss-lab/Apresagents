import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  X,
  Image,
  Video,
  FileText,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import StageCountdown from '../components/StageCountdown';
import AssetCountdown from '../components/AssetCountdown';

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

interface PlannedPost {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  platform: string;
  contentType: string;
  category: string;
  topic: string;
  briefDescription: string;
  priority: string;
}

interface GeneratedAsset {
  id: string;
  postId: string;
  type: 'image' | 'video';
  prompt: string;
  url?: string;
  filePath?: string;
  status: string;
  generatedAt?: string;
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
  images: GeneratedAsset[];
  videos: GeneratedAsset[];
  platformFormatting?: {
    formattedCaption: string;
    formattedHashtags: string;
    characterCount: number;
    hashtagCount: number;
    aspectRatio: string;
    isWithinLimits: boolean;
  };
}

interface WorkflowDetail {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  currentStage: string;
  createdAt: string;
  completedAt?: string;
  awaitingApproval: boolean;
  stageApprovals: Array<{ stage: string; approved: boolean; approvedAt?: string }>;
  strategy?: {
    weekNumber: number;
    year: number;
    theme: string;
    goals: string[];
    posts: PlannedPost[];
  };
  posts: ReadyPost[];
  metrics: {
    totalPosts: number;
    postsCompleted: number;
    imagesGenerated: number;
    videosGenerated: number;
  };
  errors: Array<{ stage: string; message: string; timestamp: string }>;
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

const STAGES = [
  { id: 'strategy', name: 'Content Calendar', icon: Calendar, description: 'Plan weekly content topics and schedule' },
  { id: 'copywriting', name: 'Copywriting', icon: FileText, description: 'Generate captions and prompts' },
  { id: 'image-generation', name: 'Image Generation', icon: Image, description: 'Create visuals from prompts' },
  { id: 'video-generation', name: 'Video Generation', icon: Video, description: 'Generate videos with Veo 3' },
  { id: 'assembly', name: 'Final Assembly', icon: Sparkles, description: 'Format and review posts' },
];

export default function Workflow() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [workflowDetail, setWorkflowDetail] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [approving, setApproving] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['strategy']));
  const [editingItem, setEditingItem] = useState<{ type: string; id: string } | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [regeneratingAsset, setRegeneratingAsset] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState<string>('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll workflow detail every 3 seconds when a workflow is active
  useEffect(() => {
    if (!selectedWorkflowId) return;
    fetchWorkflowDetail(selectedWorkflowId);
    const isActive = !workflowDetail || (workflowDetail.status !== 'completed' && workflowDetail.status !== 'failed');
    if (!isActive) return;
    const interval = setInterval(() => fetchWorkflowDetail(selectedWorkflowId), 3000);
    return () => clearInterval(interval);
  }, [selectedWorkflowId, workflowDetail?.status]);

  const fetchData = async () => {
    try {
      const [schedulerRes, workflowsRes] = await Promise.all([
        fetch('/api/workflow/scheduler/status'),
        fetch('/api/workflow/list'),
      ]);

      const schedulerData = await schedulerRes.json();
      const workflowsData = await workflowsRes.json();

      if (schedulerData.success) setSchedulerStatus(schedulerData.scheduler);
      if (workflowsData.success) {
        setWorkflows(workflowsData.workflows);
        if (!selectedWorkflowId && workflowsData.workflows.length > 0) {
          setSelectedWorkflowId(workflowsData.workflows[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Separately poll workflow detail so content updates in real-time
  const fetchWorkflowDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/workflow/${id}`);
      const data = await res.json();
      if (data.success) {
        setWorkflowDetail(data.workflow);
        if (data.workflow.currentStage) {
          setExpandedStages(prev => new Set([...prev, data.workflow.currentStage]));
        }
      }
    } catch (error) {
      console.error('Error fetching workflow detail:', error);
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
          postsPerPlatform: 3,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Wait a moment for the workflow to be created, then fetch and auto-select
        setTimeout(async () => {
          const workflowsRes = await fetch('/api/workflow/list');
          const workflowsData = await workflowsRes.json();
          if (workflowsData.success && workflowsData.workflows.length > 0) {
            setWorkflows(workflowsData.workflows);
            // Auto-select the newest workflow
            setSelectedWorkflowId(workflowsData.workflows[0].id);
            // Expand the strategy stage
            setExpandedStages(new Set(['strategy']));
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error triggering workflow:', error);
      alert('Failed to trigger workflow');
    } finally {
      setTriggering(false);
    }
  };

  const approveStage = async () => {
    if (!workflowDetail) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/workflow/${workflowDetail.id}/approve-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedStage: workflowDetail.currentStage }),
      });
      const data = await res.json();
      if (data.success) {
        fetchWorkflowDetail(workflowDetail.id);
        fetchData();
      } else {
        console.error('API error:', data.error);
        alert(`Error: ${data.error || 'Failed to approve stage'}`);
      }
    } catch (error) {
      console.error('Error approving stage:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to approve stage'}`);
    } finally {
      setApproving(false);
    }
  };

  const saveCalendarEdit = async (postId: string) => {
    if (!workflowDetail) return;
    try {
      const res = await fetch(`/api/workflow/${workflowDetail.id}/calendar/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: editForm.topic,
          briefDescription: editForm.briefDescription,
          scheduledTime: editForm.scheduledTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        setEditForm({});
        fetchWorkflowDetail(workflowDetail.id);
      }
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  const savePostEdit = async (postId: string) => {
    if (!workflowDetail) return;
    try {
      const res = await fetch(`/api/workflow/${workflowDetail.id}/post/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: editForm.caption,
          hashtags: editForm.hashtags?.split(',').map((h: string) => h.trim()),
          callToAction: editForm.callToAction,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        setEditForm({});
        fetchWorkflowDetail(workflowDetail.id);
      }
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  const regenerateAsset = async (assetId: string, postId: string, type: 'image' | 'video') => {
    if (!workflowDetail || !newPrompt) return;
    setRegeneratingAsset(assetId);
    try {
      const res = await fetch(`/api/workflow/${workflowDetail.id}/asset/${assetId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, newPrompt, type }),
      });
      const data = await res.json();
      if (data.success) {
        setNewPrompt('');
        fetchWorkflowDetail(workflowDetail.id);
      }
    } catch (error) {
      console.error('Error regenerating asset:', error);
    } finally {
      setRegeneratingAsset(null);
    }
  };

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const getStageStatus = (stageId: string): 'pending' | 'current' | 'completed' | 'awaiting' => {
    if (!workflowDetail) return 'pending';

    const stageIndex = STAGES.findIndex(s => s.id === stageId);
    const currentIndex = STAGES.findIndex(s => s.id === workflowDetail.currentStage);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) {
      return workflowDetail.awaitingApproval ? 'awaiting' : 'current';
    }
    return 'pending';
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      instagram: '📸', tiktok: '🎵', facebook: '👥', pinterest: '📌',
    };
    return emojis[platform] || '📱';
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader className="w-8 h-8 animate-spin text-alpine-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Workflow</h1>
          <p className="text-gray-600">Stage-by-stage content generation with approval</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={triggerWorkflow}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 bg-alpine-600 text-white rounded-lg hover:bg-alpine-700 disabled:opacity-50"
          >
            {triggering ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            New Workflow
          </button>
        </div>
      </div>

      {/* Scheduler Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-alpine-600" />
              <span className="font-medium">Auto-Schedule:</span>
              <span className={`px-2 py-0.5 rounded text-sm ${schedulerStatus?.isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {schedulerStatus?.isRunning ? 'Active' : 'Off'}
              </span>
            </div>
            {schedulerStatus?.nextScheduledRun && (
              <span className="text-sm text-gray-500">
                Next: {formatDateTime(schedulerStatus.nextScheduledRun)}
              </span>
            )}
          </div>
          <button
            onClick={toggleScheduler}
            className={`p-2 rounded-lg ${schedulerStatus?.isRunning ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
          >
            {schedulerStatus?.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-6">
        {/* Workflow List Sidebar */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Workflows</h2>
            {workflows.length === 0 ? (
              <p className="text-sm text-gray-500">No workflows yet</p>
            ) : (
              <div className="space-y-2">
                {workflows.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorkflowId(w.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedWorkflowId === w.id
                        ? 'border-alpine-500 bg-alpine-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {new Date(w.weekStartDate).toLocaleDateString()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        w.status === 'completed' ? 'bg-green-100 text-green-700' :
                        w.status === 'awaiting-approval' ? 'bg-yellow-100 text-yellow-700' :
                        w.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        w.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {w.status === 'awaiting-approval' ? 'Review' : w.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {w.totalPosts} posts • Stage: {w.currentStage}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stage Detail Area */}
        <div className="col-span-9">
          {!workflowDetail ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Select a workflow or start a new one</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workflow Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Week of {new Date(workflowDetail.weekStartDate).toLocaleDateString()}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {workflowDetail.metrics.totalPosts} posts planned •
                      {workflowDetail.metrics.imagesGenerated} images •
                      {workflowDetail.metrics.videosGenerated} videos
                    </p>
                  </div>
                  {workflowDetail.awaitingApproval && (
                    <button
                      onClick={approveStage}
                      disabled={approving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {approving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve & Continue
                    </button>
                  )}
                </div>
              </div>

              {/* Stage Progress */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  {STAGES.map((stage, idx) => {
                    const status = getStageStatus(stage.id);
                    return (
                      <div key={stage.id} className="flex items-center">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                          status === 'completed' ? 'bg-green-100 text-green-700' :
                          status === 'awaiting' ? 'bg-yellow-100 text-yellow-700' :
                          status === 'current' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                           status === 'awaiting' ? <AlertCircle className="w-4 h-4" /> :
                           status === 'current' ? <Loader className="w-4 h-4 animate-spin" /> :
                           <stage.icon className="w-4 h-4" />}
                          <span className="text-sm font-medium">{stage.name}</span>
                        </div>
                        {idx < STAGES.length - 1 && (
                          <ArrowRight className="w-4 h-4 mx-2 text-gray-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expandable Stages */}
              <div className="space-y-3">
                {STAGES.map(stage => {
                  const status = getStageStatus(stage.id);
                  const isExpanded = expandedStages.has(stage.id);
                  const hasContent = status !== 'pending';

                  return (
                    <div key={stage.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* Stage Header */}
                      <button
                        onClick={() => toggleStage(stage.id)}
                        className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 ${
                          status === 'awaiting' ? 'bg-yellow-50' : ''
                        }`}
                        disabled={!hasContent}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            status === 'completed' ? 'bg-green-100 text-green-600' :
                            status === 'awaiting' ? 'bg-yellow-100 text-yellow-600' :
                            status === 'current' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            <stage.icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-gray-900">{stage.name}</h3>
                            <p className="text-sm text-gray-500">{stage.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {status === 'awaiting' && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                              Awaiting Approval
                            </span>
                          )}
                          {hasContent && (
                            isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Stage Content */}
                      {isExpanded && hasContent && (
                        <div className="border-t border-gray-200 p-4">
                          {/* Strategy Stage - Calendar */}
                          {stage.id === 'strategy' && (
                            <div>
                              {(status === 'current' || status === 'awaiting') && !workflowDetail.strategy && (
                                <StageCountdown
                                  stageId="strategy"
                                  isActive={true}
                                  title="Generating Content Calendar..."
                                  subtitle="Planning weekly topics and schedule"
                                />
                              )}
                              {workflowDetail.strategy && (
                                <>
                                  <div className="mb-4">
                                    <p className="text-sm text-gray-600">
                                      <strong>Theme:</strong> {workflowDetail.strategy.theme}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <strong>Goals:</strong> {workflowDetail.strategy.goals.join(', ')}
                                    </p>
                                  </div>
                                  <div className="space-y-3">
                                    {workflowDetail.strategy.posts.map(post => (
                                  <div key={post.id} className="border border-gray-200 rounded-lg p-3">
                                    {editingItem?.type === 'calendar' && editingItem?.id === post.id ? (
                                      <div className="space-y-3">
                                        <input
                                          type="text"
                                          value={editForm.topic || ''}
                                          onChange={e => setEditForm({ ...editForm, topic: e.target.value })}
                                          className="w-full p-2 border border-gray-300 rounded"
                                          placeholder="Topic"
                                        />
                                        <textarea
                                          value={editForm.briefDescription || ''}
                                          onChange={e => setEditForm({ ...editForm, briefDescription: e.target.value })}
                                          className="w-full p-2 border border-gray-300 rounded"
                                          placeholder="Description"
                                          rows={2}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => saveCalendarEdit(post.id)}
                                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm"
                                          >
                                            <Save className="w-3 h-3" /> Save
                                          </button>
                                          <button
                                            onClick={() => { setEditingItem(null); setEditForm({}); }}
                                            className="flex items-center gap-1 px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                                          >
                                            <X className="w-3 h-3" /> Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{getPlatformEmoji(post.platform)}</span>
                                            <span className="font-medium">{post.topic}</span>
                                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{post.contentType}</span>
                                          </div>
                                          <p className="text-sm text-gray-600">{post.briefDescription}</p>
                                          <p className="text-xs text-gray-400 mt-1">
                                            {new Date(post.scheduledDate).toLocaleDateString()} at {post.scheduledTime}
                                          </p>
                                        </div>
                                        {status === 'awaiting' && (
                                          <button
                                            onClick={() => {
                                              setEditingItem({ type: 'calendar', id: post.id });
                                              setEditForm({ topic: post.topic, briefDescription: post.briefDescription, scheduledTime: post.scheduledTime });
                                            }}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Copywriting Stage */}
                          {stage.id === 'copywriting' && (
                            <>
                              {(status === 'current' || status === 'awaiting') && workflowDetail.posts.length === 0 && (
                                <StageCountdown
                                  stageId="copywriting"
                                  isActive={true}
                                  title="Writing Copy & Prompts..."
                                  subtitle="Creating captions for each post"
                                />
                              )}
                              {workflowDetail.posts.length > 0 && (
                            <div className="space-y-4">
                              {workflowDetail.posts.map(post => (
                                <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                                  {editingItem?.type === 'post' && editingItem?.id === post.id ? (
                                    <div className="space-y-3">
                                      <textarea
                                        value={editForm.caption || ''}
                                        onChange={e => setEditForm({ ...editForm, caption: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded"
                                        placeholder="Caption"
                                        rows={4}
                                      />
                                      <input
                                        type="text"
                                        value={editForm.hashtags || ''}
                                        onChange={e => setEditForm({ ...editForm, hashtags: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded"
                                        placeholder="Hashtags (comma-separated)"
                                      />
                                      <input
                                        type="text"
                                        value={editForm.callToAction || ''}
                                        onChange={e => setEditForm({ ...editForm, callToAction: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded"
                                        placeholder="Call to Action"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => savePostEdit(post.id)}
                                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm"
                                        >
                                          <Save className="w-3 h-3" /> Save
                                        </button>
                                        <button
                                          onClick={() => { setEditingItem(null); setEditForm({}); }}
                                          className="flex items-center gap-1 px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                                        >
                                          <X className="w-3 h-3" /> Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{getPlatformEmoji(post.platform)}</span>
                                          <span className="font-medium capitalize">{post.platform}</span>
                                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{post.category}</span>
                                        </div>
                                        {(status === 'awaiting' || status === 'completed') && (
                                          <button
                                            onClick={() => {
                                              setEditingItem({ type: 'post', id: post.id });
                                              setEditForm({
                                                caption: post.caption,
                                                hashtags: post.hashtags.join(', '),
                                                callToAction: post.callToAction,
                                              });
                                            }}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-gray-700 mb-2">{post.caption}</p>
                                      <p className="text-sm text-blue-600 mb-2">{post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>
                                      {post.callToAction && (
                                        <p className="text-sm text-gray-500 mb-3">CTA: {post.callToAction}</p>
                                      )}
                                      {/* Image Prompts */}
                                      {post.images.length > 0 && (
                                        <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                                          <p className="text-xs font-medium text-purple-700 mb-1">Image Prompt:</p>
                                          <p className="text-sm text-purple-900">{post.images[0].prompt}</p>
                                        </div>
                                      )}
                                      {/* Video Prompts */}
                                      {post.videos.length > 0 && (
                                        <div className="mt-2 p-3 bg-pink-50 rounded-lg">
                                          <p className="text-xs font-medium text-pink-700 mb-1">Video Prompt:</p>
                                          <p className="text-sm text-pink-900">{post.videos[0].prompt}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                              </div>
                              )}
                            </>
                          )}

                          {/* Image Generation Stage */}
                          {stage.id === 'image-generation' && (
                            <>
                              {(status === 'current' || status === 'awaiting') && workflowDetail.posts.every(p => p.images.every(i => i.status === 'pending')) && (
                                <StageCountdown
                                  stageId="image-generation"
                                  isActive={true}
                                  title="Generating Images..."
                                  subtitle="Creating visuals from prompts"
                                />
                              )}
                              {workflowDetail.posts.some(p => p.images.length > 0) && (
                                <div className="space-y-6">
                                  {workflowDetail.posts.map(post => (
                                    post.images.length > 0 && (
                                      <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                          <span className="text-lg">{getPlatformEmoji(post.platform)}</span>
                                          <span className="font-medium capitalize">{post.platform}</span>
                                          <span className="text-xs text-gray-500">- {post.category}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                          {post.images.map(image => (
                                            <div key={image.id} className="space-y-3">
                                              {/* Image Viewer */}
                                              <div className="relative group">
                                                {image.url ? (
                                                  <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                    <img
                                                      src={image.url}
                                                      alt={`Generated for ${post.platform}`}
                                                      className="w-full h-auto max-h-96 object-contain cursor-pointer"
                                                      onClick={() => window.open(image.url, '_blank')}
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                                    {image.status === 'generating' ? (
                                                      <AssetCountdown type="image" isGenerating={true} />
                                                    ) : image.status === 'failed' ? (
                                                      <div className="text-center">
                                                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                                                        <p className="text-sm text-red-500">Generation failed</p>
                                                      </div>
                                                    ) : (
                                                      <div className="text-center">
                                                        <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-400">Pending</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                {/* Status Badge */}
                                                <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${
                                                  image.status === 'completed' ? 'bg-green-500 text-white' :
                                                  image.status === 'generating' ? 'bg-blue-500 text-white' :
                                                  image.status === 'failed' ? 'bg-red-500 text-white' :
                                                  'bg-gray-500 text-white'
                                                }`}>
                                                  {image.status}
                                                </span>
                                              </div>

                                              {/* Prompt Display */}
                                              <div className="p-3 bg-purple-50 rounded-lg">
                                                <p className="text-xs font-medium text-purple-700 mb-1">Prompt:</p>
                                                <p className="text-sm text-purple-900">{image.prompt}</p>
                                              </div>

                                              {/* Re-prompt Controls */}
                                              {(status === 'awaiting' || status === 'completed') && (
                                                <div className="space-y-2">
                                                  <textarea
                                                    placeholder="Enter new prompt to regenerate this image..."
                                                    value={regeneratingAsset === image.id ? newPrompt : ''}
                                                    onChange={e => { setNewPrompt(e.target.value); setRegeneratingAsset(image.id); }}
                                                    onFocus={() => { if (regeneratingAsset !== image.id) { setRegeneratingAsset(image.id); setNewPrompt(''); }}}
                                                    className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                                                    rows={3}
                                                  />
                                                  <button
                                                    onClick={() => regenerateAsset(image.id, post.id, 'image')}
                                                    disabled={regeneratingAsset !== image.id || !newPrompt}
                                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                  >
                                                    <RotateCcw className="w-4 h-4" /> Regenerate Image
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {/* Video Generation Stage */}
                          {stage.id === 'video-generation' && (
                            <>
                              {(status === 'current' || status === 'awaiting') && workflowDetail.posts.every(p => p.videos.every(v => v.status === 'pending')) && (
                                <StageCountdown
                                  stageId="video-generation"
                                  isActive={true}
                                  title="Generating Videos..."
                                  subtitle="Creating videos with Veo 3 (may take several minutes)"
                                />
                              )}
                              {workflowDetail.posts.some(p => p.videos.length > 0) && (
                                <div className="space-y-6">
                                  {workflowDetail.posts.map(post => (
                                    post.videos.length > 0 && (
                                      <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                          <span className="text-lg">{getPlatformEmoji(post.platform)}</span>
                                          <span className="font-medium capitalize">{post.platform}</span>
                                          <span className="text-xs text-gray-500">- {post.category}</span>
                                        </div>
                                        <div className="p-4 space-y-4">
                                          {post.videos.map(video => (
                                            <div key={video.id} className="space-y-3">
                                              {/* Video Player */}
                                              <div className="relative">
                                                {video.url ? (
                                                  <div className="bg-black rounded-lg overflow-hidden border border-gray-200">
                                                    <video
                                                      src={video.url}
                                                      controls
                                                      playsInline
                                                      preload="metadata"
                                                      className="w-full max-h-[500px]"
                                                      style={{ aspectRatio: '16/9' }}
                                                    >
                                                      Your browser does not support the video tag.
                                                    </video>
                                                  </div>
                                                ) : (
                                                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center border border-gray-200">
                                                    {video.status === 'generating' ? (
                                                      <AssetCountdown type="video" isGenerating={true} />
                                                    ) : video.status === 'failed' ? (
                                                      <div className="text-center">
                                                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                                                        <p className="text-sm text-red-400">Video generation failed</p>
                                                      </div>
                                                    ) : (
                                                      <div className="text-center">
                                                        <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                                        <p className="text-sm text-gray-400">Pending generation</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                {/* Status Badge */}
                                                <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${
                                                  video.status === 'completed' ? 'bg-green-500 text-white' :
                                                  video.status === 'generating' ? 'bg-blue-500 text-white' :
                                                  video.status === 'failed' ? 'bg-red-500 text-white' :
                                                  'bg-gray-500 text-white'
                                                }`}>
                                                  {video.status}
                                                </span>
                                              </div>

                                              {/* Prompt Display */}
                                              <div className="p-3 bg-pink-50 rounded-lg">
                                                <p className="text-xs font-medium text-pink-700 mb-1">Prompt:</p>
                                                <p className="text-sm text-pink-900">{video.prompt}</p>
                                              </div>

                                              {/* Re-prompt Controls */}
                                              {(status === 'awaiting' || status === 'completed') && (
                                                <div className="space-y-2">
                                                  <textarea
                                                    placeholder="Enter new prompt to regenerate this video..."
                                                    value={regeneratingAsset === video.id ? newPrompt : ''}
                                                    onChange={e => { setNewPrompt(e.target.value); setRegeneratingAsset(video.id); }}
                                                    onFocus={() => { if (regeneratingAsset !== video.id) { setRegeneratingAsset(video.id); setNewPrompt(''); }}}
                                                    className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                                                    rows={3}
                                                  />
                                                  <button
                                                    onClick={() => regenerateAsset(video.id, post.id, 'video')}
                                                    disabled={regeneratingAsset !== video.id || !newPrompt}
                                                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                  >
                                                    <RotateCcw className="w-4 h-4" /> Regenerate Video
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {/* Assembly Stage */}
                          {stage.id === 'assembly' && workflowDetail.posts.length > 0 && (
                            <div className="space-y-4">
                              {workflowDetail.posts.map(post => (
                                <div key={post.id} className={`border rounded-lg p-4 ${
                                  post.status === 'ready' ? 'border-green-300 bg-green-50' :
                                  post.status === 'approved' ? 'border-purple-300 bg-purple-50' :
                                  'border-gray-200'
                                }`}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">{getPlatformEmoji(post.platform)}</span>
                                        <span className="font-medium capitalize">{post.platform}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                          post.status === 'ready' ? 'bg-green-200 text-green-800' :
                                          post.status === 'approved' ? 'bg-purple-200 text-purple-800' :
                                          post.status === 'draft' ? 'bg-yellow-200 text-yellow-800' :
                                          'bg-gray-200 text-gray-800'
                                        }`}>
                                          {post.status}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(post.scheduledDate).toLocaleDateString()} at {post.scheduledTime}
                                        </span>
                                      </div>
                                      <p className="text-gray-700 mb-2">{post.caption}</p>
                                      <p className="text-sm text-blue-600 mb-2">
                                        {post.hashtags.slice(0, 10).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
                                        {post.hashtags.length > 10 && ` +${post.hashtags.length - 10} more`}
                                      </p>
                                      {post.platformFormatting && (
                                        <div className="text-xs text-gray-500 flex gap-4">
                                          <span>{post.platformFormatting.characterCount} chars</span>
                                          <span>{post.platformFormatting.hashtagCount} hashtags</span>
                                          <span>{post.platformFormatting.aspectRatio} aspect</span>
                                          {post.platformFormatting.isWithinLimits ? (
                                            <span className="text-green-600">Within limits</span>
                                          ) : (
                                            <span className="text-red-600">Over limits</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                      {post.images.filter(i => i.status === 'completed').map(img => (
                                        <div key={img.id} className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                                          <img src={img.url || img.filePath} alt="" className="w-full h-full object-cover" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Errors */}
              {workflowDetail.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Errors
                  </h3>
                  <ul className="space-y-1">
                    {workflowDetail.errors.map((err, idx) => (
                      <li key={idx} className="text-sm text-red-600">
                        [{err.stage}] {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
