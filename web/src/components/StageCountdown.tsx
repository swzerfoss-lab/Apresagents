import { useState, useEffect } from 'react';
import { Clock, Loader } from 'lucide-react';
import { getEstimatedTime } from '../hooks/useCountdown';

interface StageCountdownProps {
  stageId: string;
  isActive: boolean;
  title: string;
  subtitle: string;
}

export default function StageCountdown({ stageId, isActive, title, subtitle }: StageCountdownProps) {
  const estimatedSeconds = getEstimatedTime(stageId as 'strategy' | 'copywriting' | 'image-generation' | 'video-generation' | 'assembly');
  const [timeRemaining, setTimeRemaining] = useState(estimatedSeconds);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isActive && !startTime) {
      setStartTime(Date.now());
      setTimeRemaining(estimatedSeconds);
    } else if (!isActive) {
      setStartTime(null);
      setTimeRemaining(estimatedSeconds);
    }
  }, [isActive, estimatedSeconds]);

  useEffect(() => {
    if (!isActive || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, estimatedSeconds - elapsed);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime, estimatedSeconds]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return 'Almost done...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `~${mins}m ${secs}s remaining`;
    }
    return `~${secs}s remaining`;
  };

  const progress = Math.min(100, ((estimatedSeconds - timeRemaining) / estimatedSeconds) * 100);

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader className="w-12 h-12 animate-spin text-alpine-600 mb-4" />
      <p className="text-gray-600 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>

      {/* Countdown Timer */}
      <div className="w-full max-w-md mt-6 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-alpine-700">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{formatTime(timeRemaining)}</span>
          </div>
          <span className="text-sm text-alpine-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-alpine-100 rounded-full h-2">
          <div
            className="bg-alpine-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
