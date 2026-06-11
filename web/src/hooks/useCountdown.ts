import { useState, useEffect, useCallback } from 'react';

interface CountdownState {
  timeRemaining: number;
  isRunning: boolean;
  progress: number;
  formattedTime: string;
}

export function useCountdown(estimatedSeconds: number) {
  const [state, setState] = useState<CountdownState>({
    timeRemaining: estimatedSeconds,
    isRunning: false,
    progress: 0,
    formattedTime: formatTime(estimatedSeconds),
  });

  const start = useCallback(() => {
    setState({
      timeRemaining: estimatedSeconds,
      isRunning: true,
      progress: 0,
      formattedTime: formatTime(estimatedSeconds),
    });
  }, [estimatedSeconds]);

  const stop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      timeRemaining: estimatedSeconds,
      isRunning: false,
      progress: 0,
      formattedTime: formatTime(estimatedSeconds),
    });
  }, [estimatedSeconds]);

  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(() => {
      setState(prev => {
        const newRemaining = Math.max(0, prev.timeRemaining - 1);
        const elapsed = estimatedSeconds - newRemaining;
        const progress = Math.min(100, (elapsed / estimatedSeconds) * 100);

        return {
          ...prev,
          timeRemaining: newRemaining,
          progress,
          formattedTime: formatTime(newRemaining),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning, estimatedSeconds]);

  return {
    ...state,
    start,
    stop,
    reset,
  };
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return 'Almost done...';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0) {
    return `~${mins}m ${secs}s remaining`;
  }
  return `~${secs}s remaining`;
}

export function getEstimatedTime(type: 'image' | 'video' | 'strategy' | 'copywriting' | 'image-generation' | 'video-generation' | 'assembly'): number {
  const estimates: Record<string, number> = {
    'image': 30,
    'video': 180,
    'strategy': 45,
    'copywriting': 60,
    'image-generation': 120,
    'video-generation': 300,
    'assembly': 30,
  };
  return estimates[type] || 30;
}
