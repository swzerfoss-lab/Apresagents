import { useState, useEffect } from 'react';
import { Clock, Loader } from 'lucide-react';

interface AssetCountdownProps {
  type: 'image' | 'video';
  isGenerating: boolean;
}

const ESTIMATES = {
  image: 30,
  video: 180,
};

export default function AssetCountdown({ type, isGenerating }: AssetCountdownProps) {
  const estimatedSeconds = ESTIMATES[type];
  const [timeRemaining, setTimeRemaining] = useState(estimatedSeconds);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isGenerating && !startTime) {
      setStartTime(Date.now());
      setTimeRemaining(estimatedSeconds);
    } else if (!isGenerating) {
      setStartTime(null);
      setTimeRemaining(estimatedSeconds);
    }
  }, [isGenerating, estimatedSeconds]);

  useEffect(() => {
    if (!isGenerating || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, estimatedSeconds - elapsed);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, startTime, estimatedSeconds]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return 'Almost done...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `~${mins}m ${secs}s`;
    }
    return `~${secs}s`;
  };

  const progress = Math.min(100, ((estimatedSeconds - timeRemaining) / estimatedSeconds) * 100);
  const colorClass = type === 'image' ? 'purple' : 'pink';

  if (!isGenerating) return null;

  return (
    <div className="text-center">
      <Loader className={`w-10 h-10 animate-spin text-${colorClass}-500 mx-auto mb-2`} />
      <p className="text-sm text-gray-500">Generating...</p>
      <div className="mt-3 px-4">
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
          <Clock className="w-3 h-3" />
          <span className="text-xs">{formatTime(timeRemaining)}</span>
        </div>
        <div className={`w-full bg-${colorClass}-100 rounded-full h-1.5`}>
          <div
            className={`bg-${colorClass}-500 h-1.5 rounded-full transition-all duration-1000`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
