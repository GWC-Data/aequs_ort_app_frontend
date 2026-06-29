import React from "react";

interface FormRow {
    id: number;
    srNo: number;
    date: string;
    config: string;
    sampleId: string;
    cycleCount: string;
    visualGrade: string;
    postTestImage: string;
    status: string;
}

interface FormData {
    testName: string;
    ers: string;
    failureCriteria: string;
    testCondition: string;
    machineName: string;
    project: string;
    loadCheckpoint: string;
    rows: FormRow[];
}

interface SteelWoolFormProps {
    formData: FormData;
    updateFormField: (field: string, value: string) => void;
    updateRowField: (rowId: number, field: string, value: string) => void;
    addRow: () => void;
}

export default function SteelWoolForm({
    formData,
    updateFormField,
    updateRowField,
    addRow
}: SteelWoolFormProps) {
    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Steel Wool Test</h2>

                {/* Header Fields */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Name</label>
                            <input
                                value={formData.testName}
                                onChange={(e) => updateFormField('testName', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ERS</label>
                            <input
                                value={formData.ers}
                                onChange={(e) => updateFormField('ers', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Failure Criteria</label>
                            <input
                                value={formData.failureCriteria}
                                onChange={(e) => updateFormField('failureCriteria', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Condition</label>
                            <input
                                value={formData.testCondition}
                                onChange={(e) => updateFormField('testCondition', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Machine Name</label>
                            <input
                                value={formData.machineName}
                                onChange={(e) => updateFormField('machineName', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Project</label>
                            <input
                                value={formData.project}
                                onChange={(e) => updateFormField('project', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Load Checkpoint</label>
                            <input
                                value={formData.loadCheckpoint}
                                onChange={(e) => updateFormField('loadCheckpoint', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="75, 125, 250, 500, 1000 grams"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sr.No</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Config</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sample ID</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Cycle Count</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Visual Grade</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Post Test Image</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {formData.rows.map((row, index) => (
                                    <tr key={row.id} className={index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                                        <td className="px-4 py-4 text-center font-semibold text-gray-900">{row.srNo}</td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="date"
                                                value={row.date}
                                                onChange={(e) => updateRowField(row.id, 'date', e.target.value)}
                                                className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.config}
                                                onChange={(e) => updateRowField(row.id, 'config', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Config"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.sampleId}
                                                onChange={(e) => updateRowField(row.id, 'sampleId', e.target.value)}
                                                className="w-full min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Sample ID"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.cycleCount}
                                                onChange={(e) => updateRowField(row.id, 'cycleCount', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Cycle Count"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.visualGrade}
                                                onChange={(e) => updateRowField(row.id, 'visualGrade', e.target.value)}
                                                className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Visual Grade"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.postTestImage}
                                                onChange={(e) => updateRowField(row.id, 'postTestImage', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Image URL"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <select
                                                value={row.status}
                                                onChange={(e) => updateRowField(row.id, 'status', e.target.value)}
                                                className={`w-full min-w-[110px] px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${row.status === "Pass" ? "bg-green-50 text-green-700 border-green-200" :
                                                        row.status === "Fail" ? "bg-red-50 text-red-700 border-red-200" :
                                                            "bg-white border-gray-300 text-gray-700"
                                                    }`}
                                            >
                                                <option value="">Select</option>
                                                <option value="Pass">Pass</option>
                                                <option value="Fail">Fail</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <button
                    onClick={addRow}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors shadow-sm"
                >
                    + Add Row
                </button>
            </div>
        </div>
    );
}