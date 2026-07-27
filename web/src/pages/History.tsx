import { useState } from 'react';
import {
  History as HistoryIcon,
  PenTool,
  Video,
  Megaphone,
  CalendarDays,
  Search,
  Filter,
  Trash2,
  Eye,
  Copy,
  Check,
} from 'lucide-react';

type ContentType = 'content' | 'video' | 'campaign' | 'calendar';

interface HistoryItem {
  id: string;
  type: ContentType;
  title: string;
  platform: string;
  createdAt: string;
  preview: string;
}

// Mock data - in real app would come from API
const mockHistory: HistoryItem[] = [
  {
    id: '1',
    type: 'content',
    title: 'Post-ski recovery routine',
    platform: 'instagram',
    createdAt: '2024-02-08T10:30:00Z',
    preview: 'After a long day on the slopes, your muscles need some serious TLC...',
  },
  {
    id: '2',
    type: 'video',
    title: 'Powder Day Adventure',
    platform: 'tiktok',
    createdAt: '2024-02-07T14:15:00Z',
    preview: 'Cinematic video of fresh powder skiing with product reveal',
  },
  {
    id: '3',
    type: 'campaign',
    title: 'Winter Launch Campaign',
    platform: 'multi-platform',
    createdAt: '2024-02-06T09:00:00Z',
    preview: 'Brand awareness campaign for new product line',
  },
  {
    id: '4',
    type: 'content',
    title: 'Summit Shield ingredients spotlight',
    platform: 'facebook',
    createdAt: '2024-02-05T11:45:00Z',
    preview: 'Highlighting the natural alpine ingredients in our face cream...',
  },
  {
    id: '5',
    type: 'calendar',
    title: '7-Day Content Calendar',
    platform: 'multi-platform',
    createdAt: '2024-02-04T16:20:00Z',
    preview: 'Weekly content schedule for Instagram and TikTok',
  },
];

const typeIcons: Record<ContentType, typeof PenTool> = {
  content: PenTool,
  video: Video,
  campaign: Megaphone,
  calendar: CalendarDays,
};

const typeColors: Record<ContentType, string> = {
  content: 'from-blue-500 to-cyan-500',
  video: 'from-purple-500 to-pink-500',
  campaign: 'from-orange-500 to-red-500',
  calendar: 'from-green-500 to-emerald-500',
};

export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHistory = mockHistory.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.preview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCopy = (id: string, preview: string) => {
    navigator.clipboard.writeText(preview);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700">
            <HistoryIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Content History</h1>
        </div>
        <p className="text-slate-600">
          View and manage all previously generated content
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-alpine-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ContentType | 'all')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-alpine-500"
            >
              <option value="all">All Types</option>
              <option value="content">Content</option>
              <option value="video">Video</option>
              <option value="campaign">Campaign</option>
              <option value="calendar">Calendar</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <button className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
              Delete ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Content List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4">
            <HistoryIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No content found</h3>
          <p className="text-slate-500">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Generated content will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredHistory.map((item) => {
              const Icon = typeIcons[item.type];
              const colorClass = typeColors[item.type];

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-alpine-600 focus:ring-alpine-500"
                  />

                  {/* Type Icon */}
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex-shrink-0`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 truncate">
                        {item.title}
                      </h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                        {item.platform}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">
                      {item.preview}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(item.id, item.preview)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Copy"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <p>Showing {filteredHistory.length} of {mockHistory.length} items</p>
        <p>Total storage: 0 MB</p>
      </div>
    </div>
  );
}
