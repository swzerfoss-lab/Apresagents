import {
  PenTool,
  Video,
  Image,
  Megaphone,
  TrendingUp,
  Calendar,
  Instagram,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const stats = [
  { name: 'Content Generated', value: '0', change: '+0%', icon: PenTool },
  { name: 'Videos Created', value: '0', change: '+0%', icon: Video },
  { name: 'Images Generated', value: '0', change: '+0%', icon: Image },
  { name: 'Active Campaigns', value: '0', change: '+0%', icon: Megaphone },
];

const quickActions = [
  {
    title: 'Generate Content',
    description: 'Create posts for Instagram, TikTok, Facebook, Pinterest',
    href: '/content',
    icon: PenTool,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Create Video',
    description: 'Generate video concepts with Veo 3',
    href: '/video',
    icon: Video,
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Plan Campaign',
    description: 'Build multi-platform ad campaigns',
    href: '/campaigns',
    icon: Megaphone,
    color: 'from-orange-500 to-red-500',
  },
  {
    title: 'Content Calendar',
    description: 'Schedule and plan your content',
    href: '/calendar',
    icon: Calendar,
    color: 'from-green-500 to-emerald-500',
  },
];

const agents = [
  { name: 'Social Media Manager', status: 'ready', description: 'Main orchestrator for all content' },
  { name: 'Content Strategy', status: 'ready', description: 'Plans themes and content pillars' },
  { name: 'Copywriting', status: 'ready', description: 'Writes captions and copy' },
  { name: 'Visual Content', status: 'ready', description: 'Generates images with Gemini' },
  { name: 'Video Content', status: 'ready', description: 'Creates videos with Veo 3' },
  { name: 'Ad Campaign', status: 'ready', description: 'Builds advertising campaigns' },
];

export default function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-slate-600 mt-1">
          Your AI-powered content studio for Apres Feels
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-6 border border-slate-200 card-hover"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-alpine-50">
                <stat.icon className="w-6 h-6 text-alpine-600" />
              </div>
              <span className="flex items-center text-sm font-medium text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-600">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="group relative overflow-hidden bg-white rounded-xl p-6 border border-slate-200 card-hover"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`}
              />
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} mb-4`}
              >
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{action.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{action.description}</p>
              <span className="inline-flex items-center text-sm font-medium text-alpine-600 group-hover:text-alpine-700">
                Get started
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Agents Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-alpine-500 to-purple-600">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">AI Agents</h2>
                <p className="text-sm text-slate-500">Your content creation team</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="flex h-2.5 w-2.5 mt-1.5">
                  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <div>
                  <h3 className="font-medium text-slate-900">{agent.name}</h3>
                  <p className="text-sm text-slate-500">{agent.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Brand Profile</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Brand</p>
              <p className="font-medium text-slate-900">Apres Feels</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Target Audience</p>
              <p className="font-medium text-slate-900">Winter sports enthusiasts, 28-55</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Brand Tone</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {['Premium', 'Adventurous', 'Fun', 'Luxurious'].map((tone) => (
                  <span
                    key={tone}
                    className="px-2.5 py-1 bg-alpine-50 text-alpine-700 text-xs font-medium rounded-full"
                  >
                    {tone}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Platforms</p>
              <div className="flex items-center gap-3 mt-2">
                <Instagram className="w-5 h-5 text-pink-500" />
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
                </svg>
              </div>
            </div>
            <Link
              to="/brand"
              className="inline-flex items-center text-sm font-medium text-alpine-600 hover:text-alpine-700 mt-2"
            >
              View brand guidelines
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
