import { useState } from 'react';
import {
  PenTool,
  Instagram,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Image,
  Hash,
} from 'lucide-react';

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram },
  { id: 'tiktok', name: 'TikTok', icon: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  )},
  { id: 'facebook', name: 'Facebook', icon: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )},
  { id: 'pinterest', name: 'Pinterest', icon: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  )},
];

const categories = [
  'product-highlight',
  'ingredient-spotlight',
  'skincare-routine',
  'self-care-tips',
  'behind-the-scenes',
  'seasonal',
  'trending',
];

const products = [
  { id: 'alpine-recovery-balm', name: 'Alpine Recovery Muscle Balm', price: 48 },
  { id: 'summit-shield-cream', name: 'Summit Shield Face Cream', price: 65 },
  { id: 'apres-glow-oil', name: 'Après Glow Body Oil', price: 52 },
  { id: 'powder-day-lip', name: 'Powder Day Lip Treatment', price: 24 },
  { id: 'peak-recovery-soak', name: 'Peak Performance Recovery Soak', price: 38 },
  { id: 'frostbite-defense-hand', name: 'Frostbite Defense Hand Cream', price: 28 },
];

interface GeneratedContent {
  platform: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
  visualDescription: string;
  visualPrompt: string;
}

export default function ContentGenerator() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('product-highlight');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, GeneratedContent>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleGenerate = async () => {
    if (!topic || selectedPlatforms.length === 0) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          platforms: selectedPlatforms,
          category,
          productId: selectedProduct || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.content || {});
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
            <PenTool className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Content Generator</h1>
        </div>
        <p className="text-slate-600">
          Create engaging social media content for Apres Feels across all platforms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-8">
            <h2 className="font-semibold text-slate-900 mb-4">Content Settings</h2>

            {/* Platforms */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Platforms
              </label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-alpine-500 bg-alpine-50 text-alpine-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon />
                      {platform.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Topic / Theme
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Post-ski recovery routine, Winter skincare tips..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-alpine-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-alpine-500 focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Product */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Feature Product (optional)
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-alpine-500 focus:border-transparent"
              >
                <option value="">No product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (${product.price})
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic || selectedPlatforms.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-alpine-600 to-purple-600 text-white font-medium rounded-lg hover:from-alpine-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Content
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Content */}
        <div className="lg:col-span-2">
          {Object.keys(generatedContent).length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4">
                <PenTool className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No content generated yet
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Select platforms, enter a topic, and click Generate to create
                engaging content for Apres Feels
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(generatedContent).map(([platformId, content]) => {
                const platform = platforms.find((p) => p.id === platformId);
                if (!platform) return null;
                const Icon = platform.icon;

                return (
                  <div
                    key={platformId}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    {/* Platform Header */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <Icon />
                      <span className="font-semibold text-slate-900">
                        {platform.name}
                      </span>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Caption */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">
                            Caption
                          </label>
                          <button
                            onClick={() => copyToClipboard(content.caption, `${platformId}-caption`)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                          >
                            {copiedField === `${platformId}-caption` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                          {content.caption}
                        </div>
                      </div>

                      {/* Hashtags */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="w-4 h-4 text-slate-400" />
                          <label className="text-sm font-medium text-slate-700">
                            Hashtags
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {content.hashtags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-alpine-50 text-alpine-700 text-sm rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Visual Prompt */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Image className="w-4 h-4 text-slate-400" />
                          <label className="text-sm font-medium text-slate-700">
                            Image Prompt
                          </label>
                          <button
                            onClick={() => copyToClipboard(content.visualPrompt, `${platformId}-prompt`)}
                            className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                          >
                            {copiedField === `${platformId}-prompt` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg text-sm text-purple-800 border border-purple-100">
                          {content.visualPrompt}
                        </div>
                      </div>

                      {/* CTA */}
                      {content.callToAction && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                          <span className="text-sm font-medium text-green-800">
                            CTA: {content.callToAction}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
