import React from 'react';
import { Clock, Play, Pause, StopCircle } from 'lucide-react';
import { TimerState } from '../types';

interface TimerControlsProps {
  timerState: TimerState;
  onStart: () => Date;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDurationChange: (duration: number) => void;
  formatTime: (seconds: number) => string;
  disabled?: boolean;
}

const TimerControls: React.FC<TimerControlsProps> = ({
  timerState,
  onStart,
  onStop,
  onPause,
  onResume,
  onDurationChange,
  formatTime,
  disabled = false
}) => {
  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
        <Clock className="text-blue-600" size={18} />
        Test Timer Control
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (hours)
          </label>
          <input
            type="number"
            value={timerState.duration}
            onChange={(e) => onDurationChange(parseInt(e.target.value) || 24)}
            min="1"
            max="720"
            disabled={timerState.status === 'start'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Default: 24 hours</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Timer Status
          </label>
          <div className={`px-3 py-2 rounded-lg font-medium ${
            timerState.status === 'start' ? 'bg-green-100 text-green-800' :
            timerState.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {timerState.status === 'start' ? 'Running' :
             timerState.status === 'paused' ? 'Paused' : 'Stopped'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Elapsed Time
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-lg text-center">
            {formatTime(timerState.elapsedTime)}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onStart}
          disabled={timerState.status === 'start' || disabled}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 ${
            timerState.status === 'start' || disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Play size={18} />
          Start Timer ({timerState.duration}h)
        </button>

        {timerState.status === 'start' && onPause && (
          <button
            onClick={onPause}
            className="flex-1 px-4 py-2.5 bg-yellow-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-yellow-700"
          >
            <Pause size={18} />
            Pause Timer
          </button>
        )}

        {timerState.status === 'paused' && onResume && (
          <button
            onClick={onResume}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700"
          >
            <Play size={18} />
            Resume Timer
          </button>
        )}

        <button
          onClick={onStop}
          disabled={timerState.status === 'stop'}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 ${
            timerState.status === 'stop'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          <StopCircle size={18} />
          Stop Timer
        </button>
      </div>

      {timerState.status === 'start' && timerState.startTime && (
        <div className="mt-3 text-sm text-gray-600">
          <p>Timer started at: {timerState.startTime.toLocaleTimeString()}</p>
          <p>Will complete at: {new Date(timerState.startTime.getTime() + (timerState.duration * 60 * 60 * 1000)).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default TimerControls;