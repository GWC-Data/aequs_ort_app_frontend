import React from "react";

interface FormRow {
    id: number;
    srNo: number;
    sampleId: string;
    testDate: string;
    beforeTestCosmetic: string | null;
    beforeTestNonCosmetic: string | null;
    afterTestCosmetic: string | null;
    afterTestNonCosmetic: string | null;
    preTestInspection: string;
    postTestInspection: string;
    status: string;
}

interface FormData {
    testName: string;
    ers: string;
    testCondition: string;
    checkpoints: string;
    date: string;
    failureCriteria: string;
    testStage: string;
    project: string;
    sampleQty: string;
    testLocation: string;
    color: string;
    sampleConfig: string;
    rows: FormRow[];
}

interface STSFormProps {
    formData: FormData;
    updateFormField: (field: string, value: string) => void;
    updateRowField: (rowId: number, field: string, value: string) => void;
    addRow: () => void;
}

export default function STSForm({
    formData,
    updateFormField,
    updateRowField,
    addRow
}: STSFormProps) {
    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">STS (Short Term Survivability) Test</h2>

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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Condition</label>
                            <input
                                value={formData.testCondition}
                                onChange={(e) => updateFormField('testCondition', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Checkpoints</label>
                            <input
                                value={formData.checkpoints}
                                onChange={(e) => updateFormField('checkpoints', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                            <input
                                type="datetime-local"
                                value={formData.date}
                                onChange={(e) => updateFormField('date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Stage</label>
                            <input
                                value={formData.testStage}
                                onChange={(e) => updateFormField('testStage', e.target.value)}
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
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Sample Qty</label>
                            <input
                                value={formData.sampleQty}
                                onChange={(e) => updateFormField('sampleQty', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Location</label>
                            <input
                                value={formData.testLocation}
                                onChange={(e) => updateFormField('testLocation', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                            <input
                                value={formData.color}
                                onChange={(e) => updateFormField('color', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Sample Config</label>
                            <input
                                value={formData.sampleConfig}
                                onChange={(e) => updateFormField('sampleConfig', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Failure Criteria - Larger Text Area */}
                    <div className="mt-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Failure Criteria</label>
                        <textarea
                            value={formData.failureCriteria}
                            onChange={(e) => updateFormField('failureCriteria', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="- Any sample with corrosion spot ≥250 μm&#10;- #>2 corrosion spots of any size&#10;- Discoloration grade of C or worse in test"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sr.No</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sample ID</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Test Date</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Before Test - Cosmetic</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Before Test - Non-cosmetic</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">After Test - Cosmetic</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">After Test - Non-cosmetic</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Pre-test Inspection</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Post-test Inspection</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {formData.rows.map((row, index) => (
                                    <tr key={row.id} className={index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                                        <td className="px-4 py-4 text-center font-semibold text-gray-900">{row.srNo}</td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.sampleId}
                                                onChange={(e) => updateRowField(row.id, 'sampleId', e.target.value)}
                                                className="w-full min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Sample ID"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="datetime-local"
                                                value={row.testDate}
                                                onChange={(e) => updateRowField(row.id, 'testDate', e.target.value)}
                                                className="w-full min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                {row.beforeTestCosmetic ? (
                                                    <img src={row.beforeTestCosmetic} alt="Before Cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                                                ) : (
                                                    <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">No image</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                {row.beforeTestNonCosmetic ? (
                                                    <img src={row.beforeTestNonCosmetic} alt="Before Non-cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                                                ) : (
                                                    <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">No image</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                {row.afterTestCosmetic ? (
                                                    <img src={row.afterTestCosmetic} alt="After Cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                                                ) : (
                                                    <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">No image</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                {row.afterTestNonCosmetic ? (
                                                    <img src={row.afterTestNonCosmetic} alt="After Non-cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                                                ) : (
                                                    <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">No image</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.preTestInspection}
                                                onChange={(e) => updateRowField(row.id, 'preTestInspection', e.target.value)}
                                                className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="No corrosion, no discoloration observed"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.postTestInspection}
                                                onChange={(e) => updateRowField(row.id, 'postTestInspection', e.target.value)}
                                                className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="No corrosion, no discoloration observed"
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