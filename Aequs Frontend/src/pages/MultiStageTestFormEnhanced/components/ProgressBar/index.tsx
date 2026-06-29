import React from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProgressBarProps {
    currentStage: number;
    setCurrentStage: (stage: number) => void;
}

const stages = [
    { id: 0, name: "Image Upload" },
    { id: 1, name: "Test Forms" }
];

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStage, setCurrentStage }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center">
                    {/* Back Button on left with gap */}
                    <div className="pr-10 border-r border-gray-300 mr-6">
                        <button
                            onClick={() => navigate('/planning-detail')}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                        >
                            <ArrowLeft size={18} />
                            <span className="font-medium">Back</span>
                        </button>
                    </div>

                    {/* Progress Stages with proper alignment */}
                    <div className="flex items-center flex-1">
                        {stages.map((stage, index) => (
                            <React.Fragment key={stage.id}>
                                <div
                                    className="flex items-center cursor-pointer"
                                    onClick={() => setCurrentStage(index)}
                                >
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${currentStage === index
                                        ? "bg-blue-600 text-white"
                                        : currentStage > index
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-200 text-gray-600"
                                        }`}>
                                        {currentStage > index ? (
                                            <CheckCircle size={18} />
                                        ) : (
                                            <span className="text-sm font-semibold">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`ml-2 text-sm font-medium ${currentStage === index ? "text-blue-600" : "text-gray-600"
                                        }`}>
                                        {stage.name}
                                    </span>
                                </div>
                                {index < stages.length - 1 && (
                                    <div className={`h-1 w-16 mx-4 transition-colors ${currentStage > index ? "bg-green-500" : "bg-gray-200"
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};