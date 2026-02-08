import { useState } from 'react';
import {
  Megaphone,
  Target,
  Users,
  DollarSign,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Plus,
} from 'lucide-react';

const objectives = [
  { id: 'awareness', name: 'Brand Awareness', icon: Users, description: 'Reach new audiences' },
  { id: 'engagement', name: 'Engagement', icon: Target, description: 'Drive likes, comments, shares' },
  { id: 'traffic', name: 'Website Traffic', icon: ArrowRight, description: 'Send visitors to site' },
  { id: 'conversions', name: 'Conversions', icon: TrendingUp, description: 'Drive specific actions' },
  { id: 'sales', name: 'Sales', icon: DollarSign, description: 'Increase purchases' },
];

const platforms = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'pinterest', name: 'Pinterest' },
];

const products = [
  { id: 'alpine-recovery-balm', name: 'Alpine Recovery Muscle Balm' },
  { id: 'summit-shield-cream', name: 'Summit Shield Face Cream' },
  { id: 'apres-glow-oil', name: 'Après Glow Body Oil' },
  { id: 'powder-day-lip', name: 'Powder Day Lip Treatment' },
];

interface AdCreative {
  platform: string;
  format: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  visualDescription: string;
  visualPrompt: string;
}

interface Campaign {
  name: string;
  objective: string;
  platforms: string[];
  ads: AdCreative[];
  estimatedReach: string;
  suggestedBudgetAllocation: Record<string, number>;
  recommendations: string[];
}

export default function Campaigns() {
  const [objective, setObjective] = useState('awareness');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'facebook']);
  const [budget, setBudget] = useState('1000');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

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
      const response = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          platforms: selectedPlatforms,
          budget: parseInt(budget),
          productId: selectedProduct || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCampaign(data.campaign);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
        </div>
        <p className="text-slate-600">
          Create and manage multi-platform advertising campaigns for Apres Feels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaign Builder */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-8">
            <h2 className="font-semibold text-slate-900 mb-4">Campaign Settings</h2>

            {/* Objective */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Campaign Objective
              </label>
              <div className="space-y-2">
                {objectives.map((obj) => {
                  const Icon = obj.icon;
                  return (
                    <button
                      key={obj.id}
                      onClick={() => setObjective(obj.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        objective === obj.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          objective === obj.id ? 'text-orange-600' : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            objective === obj.id ? 'text-orange-900' : 'text-slate-900'
                          }`}
                        >
                          {obj.name}
                        </p>
                        <p className="text-xs text-slate-500">{obj.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platforms */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Platforms
              </label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Budget ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Product */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product (optional)
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">General brand campaign</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || selectedPlatforms.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-medium rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Creating Campaign...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Campaign
                </>
              )}
            </button>
          </div>
        </div>

        {/* Campaign Output */}
        <div className="lg:col-span-2">
          {!campaign ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No campaign created yet
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Set your objective, select platforms, and create your first
                ad campaign for Apres Feels
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Campaign Header */}
              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
                <h2 className="text-xl font-bold mb-2">{campaign.name}</h2>
                <div className="flex flex-wrap gap-4 text-orange-100">
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {campaign.objective}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {campaign.estimatedReach}
                  </span>
                </div>
              </div>

              {/* Budget Allocation */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Suggested Budget Allocation
                </h3>
                <div className="space-y-3">
                  {Object.entries(campaign.suggestedBudgetAllocation).map(
                    ([platform, percentage]) => (
                      <div key={platform} className="flex items-center gap-4">
                        <span className="w-24 text-sm text-slate-600 capitalize">
                          {platform}
                        </span>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-12 text-sm font-medium text-slate-900 text-right">
                          {percentage}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Ad Creatives */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">Ad Creatives</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {campaign.ads.map((ad, index) => (
                    <div key={index} className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full capitalize">
                          {ad.platform}
                        </span>
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                          {ad.format}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-2">
                        {ad.headline}
                      </h4>
                      <p className="text-slate-600 text-sm mb-4">{ad.primaryText}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 font-medium rounded-lg">
                          {ad.callToAction}
                        </span>
                      </div>
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                        <p className="text-xs font-medium text-purple-700 mb-1">
                          Visual Prompt:
                        </p>
                        <p className="text-sm text-purple-800">{ad.visualPrompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Recommendations</h3>
                <ul className="space-y-3">
                  {campaign.recommendations.map((rec, index) => (
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
      </div>
    </div>
  );
}
