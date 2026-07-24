import { useState } from 'react';
import {
  Palette,
  Sparkles,
  RefreshCw,
  Check,
  MessageCircle,
  Eye,
  Target,
  Heart,
} from 'lucide-react';

const brandInfo = {
  name: 'Apres Feels',
  tagline: 'Premium Recovery for Mountain Athletes',
  website: 'apresfeels.com',
  targetAudience: 'Winter sports enthusiasts aged 28-55',
  tone: ['Premium', 'Adventurous', 'Fun', 'Luxurious', 'Work Hard Play Hard'],
  contentThemes: [
    'Ski culture and mountain lifestyle',
    'International ski destinations',
    'Après-ski social scenes',
    'Mountain recovery rituals',
    'Premium self-care',
    'Athletic performance',
  ],
  products: [
    'Alpine Recovery Muscle Balm',
    'Summit Shield Face Cream',
    'Après Glow Body Oil',
    'Powder Day Lip Treatment',
    'Peak Performance Recovery Soak',
    'Frostbite Defense Hand Cream',
  ],
};

interface VoiceGuidelines {
  voiceAttributes: string[];
  toneByPlatform: Record<string, string>;
  doSay: string[];
  dontSay: string[];
  hashtagStrategy: string[];
  captionFormulas: string[];
}

export default function BrandVoice() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [guidelines, setGuidelines] = useState<VoiceGuidelines | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/brand/guidelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setGuidelines(data.voiceGuidelines);
      }
    } catch (error) {
      console.error('Error generating guidelines:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Brand Voice</h1>
        </div>
        <p className="text-slate-600">
          Brand guidelines and voice settings for Apres Feels content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Brand Profile */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-8">
            <h2 className="font-semibold text-slate-900 mb-4">Brand Profile</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Brand Name</p>
                <p className="font-semibold text-slate-900">{brandInfo.name}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Tagline</p>
                <p className="text-slate-700">{brandInfo.tagline}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Website</p>
                <a
                  href={`https://${brandInfo.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-alpine-600 hover:text-alpine-700"
                >
                  {brandInfo.website}
                </a>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Target Audience</p>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-700">{brandInfo.targetAudience}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Brand Tone</p>
                <div className="flex flex-wrap gap-2">
                  {brandInfo.tone.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Content Themes</p>
                <ul className="space-y-1">
                  {brandInfo.contentThemes.map((theme, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <Heart className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                      {theme}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-lg hover:from-violet-700 hover:to-purple-700 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Voice Guidelines
                </>
              )}
            </button>
          </div>
        </div>

        {/* Guidelines */}
        <div className="lg:col-span-2">
          {!guidelines ? (
            <div className="space-y-6">
              {/* Products */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Product Line</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {brandInfo.products.map((product) => (
                    <div
                      key={product}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-alpine-500 to-purple-500 rounded-lg" />
                      <span className="text-sm font-medium text-slate-700">
                        {product}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Placeholder */}
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Generate Voice Guidelines
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Click the button to generate detailed brand voice guidelines
                  for all your content creation
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Voice Attributes */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-violet-500" />
                  Voice Attributes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {guidelines.voiceAttributes.map((attr) => (
                    <span
                      key={attr}
                      className="px-3 py-1.5 bg-violet-50 text-violet-700 text-sm font-medium rounded-lg"
                    >
                      {attr}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tone by Platform */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-violet-500" />
                  Tone by Platform
                </h3>
                <div className="space-y-4">
                  {Object.entries(guidelines.toneByPlatform).map(([platform, tone]) => (
                    <div key={platform} className="flex items-start gap-4">
                      <span className="w-24 text-sm font-medium text-slate-900 capitalize">
                        {platform}
                      </span>
                      <p className="flex-1 text-sm text-slate-600">{tone}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Do Say / Don't Say */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Do Say
                  </h3>
                  <ul className="space-y-2">
                    {guidelines.doSay.map((item, i) => (
                      <li key={i} className="text-sm text-green-800">
                        "{item}"
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">×</span>
                    Don't Say
                  </h3>
                  <ul className="space-y-2">
                    {guidelines.dontSay.map((item, i) => (
                      <li key={i} className="text-sm text-red-800">
                        "{item}"
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Hashtag Strategy */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4"># Hashtag Strategy</h3>
                <div className="flex flex-wrap gap-2">
                  {guidelines.hashtagStrategy.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-alpine-50 text-alpine-700 text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Caption Formulas */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Caption Formulas</h3>
                <div className="space-y-3">
                  {guidelines.captionFormulas.map((formula, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-50 border border-slate-100 rounded-lg"
                    >
                      <p className="text-sm text-slate-700">{formula}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
