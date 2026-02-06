import React from 'react';
import { MachineLoadData } from '../../types';
import { ImageIcon } from 'lucide-react';

interface MachineLoadInfoProps {
    machineLoadData: MachineLoadData;
}

export const MachineLoadInfo: React.FC<MachineLoadInfoProps> = ({ machineLoadData }) => {
    return (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Machine Load Information</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Load ID: {machineLoadData.loadId}
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <span className="text-sm text-gray-600">Machine/Chamber:</span>
                    <div className="font-semibold">{machineLoadData.chamber}</div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Total Parts:</span>
                    <div className="font-semibold">{machineLoadData.totalParts}</div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Loaded At:</span>
                    <div className="font-semibold">
                        {new Date(machineLoadData.loadedAt).toLocaleDateString()}
                    </div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Estimated Completion:</span>
                    <div className="font-semibold">
                        {new Date(machineLoadData.estimatedCompletion).toLocaleDateString()}
                    </div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <span className="text-sm text-gray-600">Duration:</span>
                    <div className="font-semibold">{machineLoadData.duration} hours</div>
                </div>
                <div>
                    <span className="text-sm text-gray-600">Ticket:</span>
                    <div className="font-semibold">{machineLoadData.machineDetails.ticketCode}</div>
                </div>
            </div>

            {/* Image Upload Status */}
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Image Upload Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <span className="text-sm text-gray-600">Parts with pre-uploaded images:</span>
                        <span className="font-semibold ml-2">
                            {machineLoadData.parts.filter(p => p.hasImages).length} / {machineLoadData.totalParts}
                        </span>
                    </div>
                    <div>
                        <span className="text-sm text-gray-600">Total pre-uploaded images:</span>
                        <span className="font-semibold ml-2">
                            {machineLoadData.parts.reduce((sum, part) =>
                                sum + (part.cosmeticImages?.length || 0) + (part.nonCosmeticImages?.length || 0), 0
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};