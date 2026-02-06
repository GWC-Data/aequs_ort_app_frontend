import { useState, useEffect, useCallback } from 'react';
import { TimerState } from '../types';

export const useTimer = (initialDuration = 24) => {
  const [timerState, setTimerState] = useState<TimerState>({
    status: 'stop',
    startTime: null,
    elapsedTime: 0,
    duration: initialDuration,
    timerStarted: false,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.status === 'start' && timerState.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(timerState.startTime!);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setTimerState(prev => ({ ...prev, elapsedTime: elapsed }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.status, timerState.startTime]);

  const startTimer = useCallback(() => {
    const startTime = new Date();
    setTimerState(prev => ({
      ...prev,
      status: 'start',
      startTime,
      timerStarted: true,
      elapsedTime: 0
    }));
    return startTime;
  }, []);

  const stopTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      status: 'stop',
      startTime: null,
      elapsedTime: 0,
      timerStarted: false
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      status: 'paused'
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    if (!timerState.startTime) return;
    setTimerState(prev => ({
      ...prev,
      status: 'start'
    }));
  }, [timerState.startTime]);

  const setDuration = useCallback((duration: number) => {
    setTimerState(prev => ({ ...prev, duration }));
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    timerState,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    setDuration,
    formatTime
  };
};