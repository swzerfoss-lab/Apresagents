import { useState, useEffect } from 'react';
import {
  Image,
  Video,
  Wand2,
  Loader,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useCountdown, getEstimatedTime } from '../hooks/useCountdown';

interface GeneratedImage {
  url: string;
  filePath?: string;
  mimeType: string;
  prompt: string;
}

interface GeneratedVideo {
  url: string;
  filePath?: string;
  duration: number;
  resolution: string;
  hasAudio: boolean;
  prompt: string;
}

type TabType = 'image' | 'video';

export default function Studio() {
  const [activeTab, setActiveTab] = useState<TabType>('image');

  // Image state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState(8);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // History
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);

  // Countdown timers
  const imageCountdown = useCountdown(getEstimatedTime('image'));
  const videoCountdown = useCountdown(getEstimatedTime('video'));

  // Stop countdowns when generation completes
  useEffect(() => {
    if (!generatingImage) {
      imageCountdown.stop();
    }
  }, [generatingImage]);

  useEffect(() => {
    if (!generatingVideo) {
      videoCountdown.stop();
    }
  }, [generatingVideo]);

  const generateImage = async () => {
    if (!imagePrompt.trim()) return;

    setGeneratingImage(true);
    setImageError(null);
    imageCountdown.start();

    try {
      const response = await fetch('/api/image/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageAspectRatio,
          style: imageStyle,
        }),
      });

      const data = await response.json();

      if (data.success && data.image) {
        setGeneratedImage(data.image);
        setImageHistory(prev => [data.image, ...prev].slice(0, 10));
      } else {
        setImageError(data.error || 'Failed to generate image');
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setGeneratingImage(false);
    }
  };

  const generateVideo = async () => {
    if (!videoPrompt.trim()) return;

    setGeneratingVideo(true);
    setVideoError(null);
    videoCountdown.start();

    try {
      const response = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: videoDuration,
          aspectRatio: videoAspectRatio,
          style: videoStyle,
        }),
      });

      const data = await response.json();

      if (data.success && data.video) {
        setGeneratedVideo(data.video);
        setVideoHistory(prev => [data.video, ...prev].slice(0, 10));
      } else {
        setVideoError(data.error || 'Failed to generate video');
      }
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setGeneratingVideo(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Creative Studio</h1>
        </div>
        <p className="text-gray-500">Generate images and videos directly with AI</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('image')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'image'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Image className="w-4 h-4" />
          Image Generator
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'video'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Video className="w-4 h-4" />
          Video Generator
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Panel */}
        <div className="col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Image Generator */}
            {activeTab === 'image' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-600" />
                  Generate Image with Gemini
                </h2>

                {/* Prompt Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Prompt
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Describe the image you want to create... (e.g., 'A skier carving through fresh powder at golden hour, mountain peaks in background, cinematic lighting')"
                    className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                    rows={4}
                  />
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      value={imageAspectRatio}
                      onChange={(e) => setImageAspectRatio(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300"
                    >
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Portrait)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Stories)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style
                    </label>
                    <select
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300"
                    >
                      <option value="photorealistic">Photorealistic</option>
                      <option value="artistic">Artistic</option>
                      <option value="cinematic">Cinematic</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateImage}
                  disabled={generatingImage || !imagePrompt.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatingImage ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating Image...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Image
                    </>
                  )}
                </button>

                {/* Progress indicator with countdown */}
                {generatingImage && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-purple-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{imageCountdown.formattedTime}</span>
                      </div>
                      <span className="text-sm text-purple-600">{Math.round(imageCountdown.progress)}%</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${imageCountdown.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error */}
                {imageError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-700">Generation Failed</p>
                      <p className="text-sm text-red-600">{imageError}</p>
                    </div>
                  </div>
                )}

                {/* Result */}
                {generatedImage && !generatingImage && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Generated Image
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(generatedImage.url, '_blank')}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          <Download className="w-4 h-4" /> Download
                        </button>
                        <button
                          onClick={generateImage}
                          disabled={generatingImage}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          <RefreshCw className="w-4 h-4" /> Regenerate
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={generatedImage.url}
                        alt="Generated"
                        className="w-full h-auto max-h-[500px] object-contain cursor-pointer"
                        onClick={() => window.open(generatedImage.url, '_blank')}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500 italic">"{generatedImage.prompt}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Video Generator */}
            {activeTab === 'video' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-pink-600" />
                  Generate Video with Veo 3
                </h2>

                {/* Prompt Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Prompt
                  </label>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Describe the video you want to create... (e.g., 'Cinematic slow-motion shot of a snowboarder launching off a jump, powder spray catching golden sunlight, mountain range backdrop')"
                    className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                    rows={4}
                  />
                </div>

                {/* Options */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <select
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-300"
                    >
                      <option value={5}>5 seconds</option>
                      <option value={8}>8 seconds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      value={videoAspectRatio}
                      onChange={(e) => setVideoAspectRatio(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-300"
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait/Stories)</option>
                      <option value="1:1">1:1 (Square)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style
                    </label>
                    <select
                      value={videoStyle}
                      onChange={(e) => setVideoStyle(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-300"
                    >
                      <option value="cinematic">Cinematic</option>
                      <option value="documentary">Documentary</option>
                      <option value="dynamic">Dynamic</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateVideo}
                  disabled={generatingVideo || !videoPrompt.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatingVideo ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Video
                    </>
                  )}
                </button>

                {/* Progress indicator with countdown */}
                {generatingVideo && (
                  <div className="mt-4 p-4 bg-pink-50 border border-pink-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-pink-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{videoCountdown.formattedTime}</span>
                      </div>
                      <span className="text-sm text-pink-600">{Math.round(videoCountdown.progress)}%</span>
                    </div>
                    <div className="w-full bg-pink-200 rounded-full h-2">
                      <div
                        className="bg-pink-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${videoCountdown.progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-pink-600">Video generation with Veo 3 typically takes 2-5 minutes</p>
                  </div>
                )}

                {/* Error */}
                {videoError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-700">Generation Failed</p>
                      <p className="text-sm text-red-600">{videoError}</p>
                    </div>
                  </div>
                )}

                {/* Result */}
                {generatedVideo && !generatingVideo && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Generated Video
                      </h3>
                      <div className="flex gap-2">
                        <a
                          href={generatedVideo.url}
                          download
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          <Download className="w-4 h-4" /> Download
                        </a>
                        <button
                          onClick={generateVideo}
                          disabled={generatingVideo}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-pink-100 text-pink-700 rounded hover:bg-pink-200"
                        >
                          <RefreshCw className="w-4 h-4" /> Regenerate
                        </button>
                      </div>
                    </div>
                    <div className="bg-black rounded-lg overflow-hidden border border-gray-200">
                      <video
                        src={generatedVideo.url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[500px]"
                        style={{ aspectRatio: videoAspectRatio.replace(':', '/') }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span>{generatedVideo.duration}s</span>
                      <span>{generatedVideo.resolution}</span>
                      {generatedVideo.hasAudio && <span>With Audio</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 italic">"{generatedVideo.prompt}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Sidebar */}
        <div className="col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              {activeTab === 'image' ? 'Recent Images' : 'Recent Videos'}
            </h3>

            {activeTab === 'image' && (
              <div className="space-y-3">
                {imageHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No images generated yet
                  </p>
                ) : (
                  imageHistory.map((img, idx) => (
                    <div
                      key={idx}
                      className="group cursor-pointer"
                      onClick={() => setGeneratedImage(img)}
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group-hover:border-purple-400 transition-colors">
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{img.prompt}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'video' && (
              <div className="space-y-3">
                {videoHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No videos generated yet
                  </p>
                ) : (
                  videoHistory.map((vid, idx) => (
                    <div
                      key={idx}
                      className="group cursor-pointer"
                      onClick={() => setGeneratedVideo(vid)}
                    >
                      <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-200 group-hover:border-pink-400 transition-colors flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{vid.prompt}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="mt-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-4">
            <h4 className="font-medium text-gray-900 mb-2">Tips for better results</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>- Be specific about lighting (golden hour, soft light)</li>
              <li>- Include composition details (close-up, wide shot)</li>
              <li>- Mention style references (cinematic, documentary)</li>
              <li>- Describe the mood or atmosphere</li>
              <li>- Include winter sports context for on-brand results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
