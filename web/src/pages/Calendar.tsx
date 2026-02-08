import { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const platforms = [
  { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
  { id: 'tiktok', name: 'TikTok', color: 'bg-slate-900' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
  { id: 'pinterest', name: 'Pinterest', color: 'bg-red-600' },
];

interface CalendarEntry {
  date: string;
  dayOfWeek: string;
  platform: string;
  contentType: string;
  category: string;
  theme: string;
  briefDescription: string;
  suggestedTime: string;
}

interface ContentCalendar {
  entries: CalendarEntry[];
  summary: {
    totalPosts: number;
    postsByPlatform: Record<string, number>;
    recommendations: string[];
  };
}

export default function Calendar() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram',
    'tiktok',
  ]);
  const [days, setDays] = useState(7);
  const [postsPerWeek, setPostsPerWeek] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [calendar, setCalendar] = useState<ContentCalendar | null>(null);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days,
          platforms: selectedPlatforms,
          postsPerWeek,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCalendar(data.calendar);
      }
    } catch (error) {
      console.error('Error generating calendar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPlatformColor = (platformId: string) => {
    return platforms.find((p) => p.id === platformId)?.color || 'bg-slate-500';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Content Calendar</h1>
          </div>
          <p className="text-slate-600">
            Plan and schedule your content across all platforms
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <div className="flex flex-wrap items-end gap-6">
          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Platforms
            </label>
            <div className="flex gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedPlatforms.includes(platform.id)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Days to Plan
            </label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          {/* Posts per week */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Posts per Week
            </label>
            <select
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {[3, 5, 7, 10, 14].map((n) => (
                <option key={n} value={n}>
                  {n} posts
                </option>
              ))}
            </select>
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedPlatforms.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Calendar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      {!calendar ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No calendar generated yet
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            Select platforms, set your preferences, and generate a content
            calendar for Apres Feels
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Posts</p>
              <p className="text-2xl font-bold text-slate-900">
                {calendar.summary.totalPosts}
              </p>
            </div>
            {Object.entries(calendar.summary.postsByPlatform).map(
              ([platform, count]) => (
                <div
                  key={platform}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                >
                  <p className="text-sm text-slate-500 capitalize">{platform}</p>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                </div>
              )
            )}
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Content Schedule</h3>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {calendar.entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  {/* Date */}
                  <div className="w-20 flex-shrink-0">
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-500">{entry.dayOfWeek}</p>
                  </div>

                  {/* Platform Badge */}
                  <div
                    className={`w-2 h-2 rounded-full ${getPlatformColor(
                      entry.platform
                    )} mt-2`}
                  />

                  {/* Content Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 capitalize">
                        {entry.platform}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        {entry.contentType}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{entry.theme}</p>
                    <p className="text-xs text-slate-500">
                      {entry.briefDescription}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-slate-900">
                      {entry.suggestedTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Recommendations</h3>
            <ul className="space-y-3">
              {calendar.summary.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-sm text-slate-700">{rec}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
