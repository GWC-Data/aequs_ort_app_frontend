import React from "react";

interface FormRow {
    id: number;
    srNo: number;
    build: string;
    doeConfig: string;
    configNotes: string;
    alloy: string;
    vendor: string;
    formFactor: string;
    sampleNumber: string;
    testStartDate: string;
    testStartTime: string;
    completionDate: string;
    completionTime: string;
    saltSprayTime: string;
    t0Inspection: string;
    pittingCorrosionCount: string;
    pittingDiameter: string;
    seCorrosionCount: string;
    seCorrosion: string;
    otherCorrosion: string;
    discolorationGrading: string;
    inspectionNotes: string;
    status: string;
    enclosurePhotoT0: string | null;
    enclosurePhotoT24: string | null;
    cosmeticPhotoT0: string | null;
    cosmeticPhotoT24: string | null;
    preTestInspection: string;
    postTestInspection: string;
    photoStatus: string;
}

interface FormData {
    testDescription: string;
    testLocation: string;
    projectName: string;
    color: string;
    sampleSize: string;
    testStartDate: string;
    testCompletionDate: string;
    sampleConfig: string;
    reportFileName: string;
    lastCalibration: string;
    nextCalibration: string;
    chamberCleanliness: string;
    lastChamberCleaning: string;
    fixtureDescription: string;
    chamberSalinity: string;
    chamberPH: string;
    chamberTemperature: string;
    chamberID: string;
    labTemperature: string;
    labHumidity: string;
    consumablesAvailable: string;
    samplesLabeled: string;
    procedureReviewed: string;
    rows: FormRow[];
}

interface SaltSprayTestFormProps {
    formData: FormData;
    updateFormField: (field: string, value: string) => void;
    updateRowField: (rowId: number, field: string, value: string) => void;
    addRow: () => void;
}

export default function SaltSprayTestForm({
    formData,
    updateFormField,
    updateRowField,
    addRow
}: SaltSprayTestFormProps) {
    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Salt Spray Test</h2>

                {/* Header Fields - General Test Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">General Test Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Description</label>
                            <input
                                value={formData.testDescription}
                                onChange={(e) => updateFormField('testDescription', e.target.value)}
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name</label>
                            <input
                                value={formData.projectName}
                                onChange={(e) => updateFormField('projectName', e.target.value)}
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Sample Size</label>
                            <input
                                value={formData.sampleSize}
                                onChange={(e) => updateFormField('sampleSize', e.target.value)}
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
                </div>

                {/* Equipment Checks */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Equipment Checks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Last Calibration</label>
                            <input
                                type="date"
                                value={formData.lastCalibration}
                                onChange={(e) => updateFormField('lastCalibration', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Next Calibration</label>
                            <input
                                type="date"
                                value={formData.nextCalibration}
                                onChange={(e) => updateFormField('nextCalibration', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Chamber Cleanliness</label>
                            <input
                                value={formData.chamberCleanliness}
                                onChange={(e) => updateFormField('chamberCleanliness', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Chamber Salinity</label>
                            <input
                                value={formData.chamberSalinity}
                                onChange={(e) => updateFormField('chamberSalinity', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Chamber pH</label>
                            <input
                                value={formData.chamberPH}
                                onChange={(e) => updateFormField('chamberPH', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Chamber Temperature</label>
                            <input
                                value={formData.chamberTemperature}
                                onChange={(e) => updateFormField('chamberTemperature', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lab Temperature</label>
                            <input
                                value={formData.labTemperature}
                                onChange={(e) => updateFormField('labTemperature', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lab Humidity</label>
                            <input
                                value={formData.labHumidity}
                                onChange={(e) => updateFormField('labHumidity', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Data Collection Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sr.No</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Build</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">DOE Config</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Config Notes</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Alloy</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Vendor</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Form Factor</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sample Number</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Test Start Date</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Test Start Time</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Salt Spray Time</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">T0 Inspection</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Pitting Count</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">SE Corrosion</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Discoloration</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {formData.rows.map((row, index) => (
                                    <tr key={row.id} className={index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                                        <td className="px-4 py-4 text-center font-semibold text-gray-900">{row.srNo}</td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.build}
                                                onChange={(e) => updateRowField(row.id, 'build', e.target.value)}
                                                className="w-full min-w-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.doeConfig}
                                                onChange={(e) => updateRowField(row.id, 'doeConfig', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.configNotes}
                                                onChange={(e) => updateRowField(row.id, 'configNotes', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.alloy}
                                                onChange={(e) => updateRowField(row.id, 'alloy', e.target.value)}
                                                className="w-full min-w-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.vendor}
                                                onChange={(e) => updateRowField(row.id, 'vendor', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.formFactor}
                                                onChange={(e) => updateRowField(row.id, 'formFactor', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.sampleNumber}
                                                onChange={(e) => updateRowField(row.id, 'sampleNumber', e.target.value)}
                                                className="w-full min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="date"
                                                value={row.testStartDate}
                                                onChange={(e) => updateRowField(row.id, 'testStartDate', e.target.value)}
                                                className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="time"
                                                value={row.testStartTime}
                                                onChange={(e) => updateRowField(row.id, 'testStartTime', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.saltSprayTime}
                                                onChange={(e) => updateRowField(row.id, 'saltSprayTime', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.t0Inspection}
                                                onChange={(e) => updateRowField(row.id, 't0Inspection', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.pittingCorrosionCount}
                                                onChange={(e) => updateRowField(row.id, 'pittingCorrosionCount', e.target.value)}
                                                className="w-full min-w-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.seCorrosionCount}
                                                onChange={(e) => updateRowField(row.id, 'seCorrosionCount', e.target.value)}
                                                className="w-full min-w-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <select
                                                value={row.discolorationGrading}
                                                onChange={(e) => updateRowField(row.id, 'discolorationGrading', e.target.value)}
                                                className="w-full min-w-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="">Grade</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                            </select>
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