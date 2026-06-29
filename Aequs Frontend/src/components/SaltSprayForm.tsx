import React from "react";

interface FormRow {
    id: number;
    srNo: number;
    sampleId: string;
    startDate: string;
    endDate: string;
    t0PictureCosmetic: string;
    t0PictureNonCosmetic: string;
    t120PictureCosmetic: string;
    t120PictureNonCosmetic: string;
    cosmeticInspectionPreTest: string;
    cosmeticInspectionPostTest: string;
    status: string;
}

interface FormData {
    testName: string;
    ers: string;
    failureCriteria: string;
    testStage: string;
    testCondition: string;
    project: string;
    sampleQty: string;
    date: string;
    rows: FormRow[];
}

interface SaltSprayTestFormProps {
    formData: FormData;
    updateFormField: (field: string, value: string) => void;
    updateRowField: (rowId: number, field: string, value: string) => void;
    addRow: () => void;
}

export default function SaltSprayForm({
    formData,
    updateFormField,
    updateRowField,
    addRow
}: SaltSprayTestFormProps) {
    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Salt Spray Test (SST)</h2>

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
                            <textarea
                                value={formData.failureCriteria}
                                onChange={(e) => updateFormField('failureCriteria', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Condition</label>
                            <input
                                value={formData.testCondition}
                                onChange={(e) => updateFormField('testCondition', e.target.value)}
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => updateFormField('date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sample ID</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">End Date</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">T0 Picture (Cosmetic)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">T0 Picture (Non-Cosmetic)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">T120 Picture (Cosmetic)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">T120 Picture (Non-Cosmetic)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Cosmetic Inspection Pre-Test</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Cosmetic Inspection Post-Test</th>
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
                                                className="w-full min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Sample ID"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="date"
                                                value={row.startDate}
                                                onChange={(e) => updateRowField(row.id, 'startDate', e.target.value)}
                                                className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="date"
                                                value={row.endDate}
                                                onChange={(e) => updateRowField(row.id, 'endDate', e.target.value)}
                                                className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.t0PictureCosmetic}
                                                onChange={(e) => updateRowField(row.id, 't0PictureCosmetic', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Image URL"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.t0PictureNonCosmetic}
                                                onChange={(e) => updateRowField(row.id, 't0PictureNonCosmetic', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Image URL"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.t120PictureCosmetic}
                                                onChange={(e) => updateRowField(row.id, 't120PictureCosmetic', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Image URL"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.t120PictureNonCosmetic}
                                                onChange={(e) => updateRowField(row.id, 't120PictureNonCosmetic', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Image URL"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.cosmeticInspectionPreTest}
                                                onChange={(e) => updateRowField(row.id, 'cosmeticInspectionPreTest', e.target.value)}
                                                className="w-full min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Pre-test observation"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.cosmeticInspectionPostTest}
                                                onChange={(e) => updateRowField(row.id, 'cosmeticInspectionPostTest', e.target.value)}
                                                className="w-full min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Post-test observation"
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