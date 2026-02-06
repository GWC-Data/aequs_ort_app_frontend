import React from 'react';
import { Play, Pause } from 'lucide-react';
import { TimerStatus } from '../../types';

interface TimerDisplayProps {
    timerState: TimerStatus;
    onToggle: () => void;
    formatTime: (seconds: number) => string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
    timerState,
    onToggle,
    formatTime
}) => {
    return (
        <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Timer Status</h3>
                    <p className="text-sm text-gray-600">
                        {timerState.isRunning ? (
                            <span className="text-green-600 flex items-center">
                                <Play size={16} className="mr-2" />
                                Running since {timerState.startTime ? new Date(timerState.startTime).toLocaleTimeString() : 'just now'}
                            </span>
                        ) : timerState.startTime ? (
                            <span className="text-gray-600 flex items-center">
                                <Pause size={16} className="mr-2" />
                                Stopped. Last started: {new Date(timerState.startTime).toLocaleString()}
                            </span>
                        ) : (
                            <span className="text-gray-500">Not started yet</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`text-2xl font-mono font-bold ${timerState.isRunning ? 'text-green-600' : 'text-gray-700'}`}>
                        {formatTime(timerState.remainingSeconds)}
                    </div>
                    <button
                        type="button"
                        onClick={onToggle}
                        className={`flex items-center w-fit border rounded-md px-4 py-2 font-semibold transition-colors ${timerState.isRunning
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        <span>{timerState.isRunning ? 'Stop Timer' : 'Start Timer'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};