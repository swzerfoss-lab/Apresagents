import { useState } from 'react';
import {
  Video,
  Play,
  Sparkles,
  RefreshCw,
  Clock,
  Film,
  Volume2,
  Clapperboard,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const platforms = [
  { id: 'instagram', name: 'Instagram Reels' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'pinterest', name: 'Pinterest' },
];

const styles = [
  { id: 'cinematic', name: 'Cinematic', description: 'Epic mountain visuals' },
  { id: 'documentary', name: 'Documentary', description: 'Authentic storytelling' },
  { id: 'dynamic', name: 'Dynamic', description: 'High-energy action' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Aspirational moments' },
  { id: 'commercial', name: 'Commercial', description: 'Product-focused' },
];

const durations = [
  { id: '15s', name: '15 seconds', description: 'Quick hook' },
  { id: '30s', name: '30 seconds', description: 'Standard' },
  { id: '60s', name: '60 seconds', description: 'Extended' },
];

const products = [
  { id: 'alpine-recovery-balm', name: 'Alpine Recovery Muscle Balm' },
  { id: 'summit-shield-cream', name: 'Summit Shield Face Cream' },
  { id: 'apres-glow-oil', name: 'Après Glow Body Oil' },
  { id: 'powder-day-lip', name: 'Powder Day Lip Treatment' },
  { id: 'peak-recovery-soak', name: 'Peak Performance Recovery Soak' },
  { id: 'frostbite-defense-hand', name: 'Frostbite Defense Hand Cream' },
];

interface VideoScene {
  sceneNumber: number;
  timestamp: string;
  visual: string;
  action: string;
  text?: string;
  audio?: string;
}

interface VideoConcept {
  title: string;
  hook: string;
  narrative: string;
  scenes: VideoScene[];
  visualStyle: string;
  audioDirection: string;
  callToAction: string;
  platform: string;
  duration: string;
  veoPrompt: string;
}

export default function VideoStudio() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [style, setStyle] = useState('cinematic');
  const [duration, setDuration] = useState('30s');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoConcept, setVideoConcept] = useState<VideoConcept | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          platform,
          style,
          duration,
          productId: selectedProduct || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVideoConcept(data.concept);
      }
    } catch (error) {
      console.error('Error generating video:', error);
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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Video Studio</h1>
            <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              Powered by Veo 3
            </span>
          </div>
        </div>
        <p className="text-slate-600">
          Create cinematic video concepts and generate videos with Google Veo 3
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-8">
            <h2 className="font-semibold text-slate-900 mb-4">Video Settings</h2>

            {/* Topic */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Video Concept
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Epic powder day skiing with après recovery moment..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Platform */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Style */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Video Style
              </label>
              <div className="grid grid-cols-1 gap-2">
                {styles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      style === s.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 ${
                        style === s.id
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {style === s.id && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Duration
              </label>
              <div className="flex gap-2">
                {durations.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDuration(d.id)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      duration === d.id
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Feature Product (optional)
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">No product</option>
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
              disabled={isGenerating || !topic}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Video Concept
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Concept Output */}
        <div className="lg:col-span-2">
          {!videoConcept ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4">
                <Clapperboard className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No video concept yet
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Enter a video concept and generate a detailed storyboard with a
                Veo 3 prompt for Apres Feels
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Video Header */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-2">{videoConcept.title}</h2>
                    <div className="flex items-center gap-4 text-purple-100">
                      <span className="flex items-center gap-1">
                        <Film className="w-4 h-4" />
                        {videoConcept.platform}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {videoConcept.duration}
                      </span>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    <Play className="w-4 h-4" />
                    Preview
                  </button>
                </div>
              </div>

              {/* Hook */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                    !
                  </span>
                  Opening Hook
                </h3>
                <p className="text-slate-700">{videoConcept.hook}</p>
              </div>

              {/* Narrative */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-3">Narrative</h3>
                <p className="text-slate-700">{videoConcept.narrative}</p>
              </div>

              {/* Scenes */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">Storyboard</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {videoConcept.scenes.map((scene) => (
                    <div key={scene.sceneNumber} className="p-4">
                      <button
                        onClick={() =>
                          setExpandedScene(
                            expandedScene === scene.sceneNumber
                              ? null
                              : scene.sceneNumber
                          )
                        }
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold">
                            {scene.sceneNumber}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">
                              {scene.timestamp}
                            </p>
                            <p className="text-sm text-slate-500 line-clamp-1">
                              {scene.action}
                            </p>
                          </div>
                        </div>
                        {expandedScene === scene.sceneNumber ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      {expandedScene === scene.sceneNumber && (
                        <div className="mt-4 ml-12 space-y-3">
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">
                              VISUAL
                            </p>
                            <p className="text-sm text-slate-700">{scene.visual}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">
                              ACTION
                            </p>
                            <p className="text-sm text-slate-700">{scene.action}</p>
                          </div>
                          {scene.text && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">
                                ON-SCREEN TEXT
                              </p>
                              <p className="text-sm text-slate-700">{scene.text}</p>
                            </div>
                          )}
                          {scene.audio && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">
                                AUDIO
                              </p>
                              <p className="text-sm text-slate-700">{scene.audio}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual & Audio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Film className="w-4 h-4 text-slate-400" />
                    Visual Style
                  </h3>
                  <p className="text-sm text-slate-700">{videoConcept.visualStyle}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    Audio Direction
                  </h3>
                  <p className="text-sm text-slate-700">
                    {videoConcept.audioDirection}
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-900 mb-2">Call to Action</h3>
                <p className="text-green-800">{videoConcept.callToAction}</p>
              </div>

              {/* Veo 3 Prompt */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Veo 3 Generation Prompt
                  </h3>
                  <button
                    onClick={() => copyToClipboard(videoConcept.veoPrompt, 'veo-prompt')}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                  >
                    {copiedField === 'veo-prompt' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
                <p className="text-purple-800 text-sm leading-relaxed">
                  {videoConcept.veoPrompt}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
