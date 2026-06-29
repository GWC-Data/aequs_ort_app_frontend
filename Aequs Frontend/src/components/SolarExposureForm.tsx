import React from "react";

interface FormRow {
    id: number;
    lineNo: number;
    partVendor: string;
    measurementDate: string;
    week: string;
    colorMaterialConfig: string;
    uniqueSampleId: string;
    measurementRegion: string;
    testLocation: string;
    labTempT0: string;
    labRhT0: string;
    stdLF2: string;
    stdAF2: string;
    stdBF2: string;
    testCheckpoint: string;
    labTempCP: string;
    labRhCP: string;
    stdLF2CP: string;
    stdAF2CP: string;
    stdBF2CP: string;
    cF2: string;
    hF2: string;
    dL: string;
    dA: string;
    dB: string;
    de94: string;
    dC: string;
    dH: string;
    cStd: string;
    hStd: string;
}

interface FormData {
    testDescription: string;
    testLocation: string;
    projectName: string;
    color: string;
    sampleSize: string;
    testStartDate: string;
    testCompletionDate: string;
    sampleConfigOverview: string;
    reportFileName: string;
    solarExposureChamber: string;
    chamberTypeModel: string;
    lastCalibrationDate: string;
    nextCalibrationDate: string;
    lampAge: string;
    innerFilterAge: string;
    outerFilterAge: string;
    filterCombination: string;
    irradianceProfile: string;
    blackPanelTemp: string;
    chamberTemp: string;
    chamberHumidity: string;
    waterSpray: string;
    sourceToSampleDistance: string;
    samplesLabeled: string;
    procedureAvailable: string;
    samplesInspected: string;
    t0ColorMeasured: string;
    rows: FormRow[];
}

interface SolarExposureFormProps {
    formData: FormData;
    updateFormField: (field: string, value: string) => void;
    updateRowField: (rowId: number, field: string, value: string) => void;
    addRow: () => void;
}

export default function SolarExposureForm({
    formData,
    updateFormField,
    updateRowField,
    addRow
}: SolarExposureFormProps) {
    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Solar Exposure Test - Color Delta Calculation</h2>

                {/* General Test Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">General Test Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Start Date</label>
                            <input
                                type="date"
                                value={formData.testStartDate}
                                onChange={(e) => updateFormField('testStartDate', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Test Completion Date</label>
                            <input
                                type="date"
                                value={formData.testCompletionDate}
                                onChange={(e) => updateFormField('testCompletionDate', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Sample Config Overview</label>
                            <input
                                value={formData.sampleConfigOverview}
                                onChange={(e) => updateFormField('sampleConfigOverview', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Report File Name</label>
                            <input
                                value={formData.reportFileName}
                                onChange={(e) => updateFormField('reportFileName', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Equipment Readiness Verification */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Equipment Readiness Verification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Solar Exposure Chamber</label>
                            <input
                                value={formData.solarExposureChamber}
                                onChange={(e) => updateFormField('solarExposureChamber', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Chamber Type/Model</label>
                            <input
                                value={formData.chamberTypeModel}
                                onChange={(e) => updateFormField('chamberTypeModel', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Last Calibration Date</label>
                            <input
                                type="date"
                                value={formData.lastCalibrationDate}
                                onChange={(e) => updateFormField('lastCalibrationDate', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Next Calibration Date</label>
                            <input
                                type="date"
                                value={formData.nextCalibrationDate}
                                onChange={(e) => updateFormField('nextCalibrationDate', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Lamp Age (hours)</label>
                            <input
                                value={formData.lampAge}
                                onChange={(e) => updateFormField('lampAge', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Inner Filter Age (hours)</label>
                            <input
                                value={formData.innerFilterAge}
                                onChange={(e) => updateFormField('innerFilterAge', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Outer Filter Age (hours)</label>
                            <input
                                value={formData.outerFilterAge}
                                onChange={(e) => updateFormField('outerFilterAge', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Combination</label>
                            <input
                                value={formData.filterCombination}
                                onChange={(e) => updateFormField('filterCombination', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Irradiance Profile</label>
                            <input
                                value={formData.irradianceProfile}
                                onChange={(e) => updateFormField('irradianceProfile', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Black Panel Temp (°C)</label>
                            <input
                                value={formData.blackPanelTemp}
                                onChange={(e) => updateFormField('blackPanelTemp', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Chamber Temp (°C)</label>
                            <input
                                value={formData.chamberTemp}
                                onChange={(e) => updateFormField('chamberTemp', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Chamber Humidity (% RH)</label>
                            <input
                                value={formData.chamberHumidity}
                                onChange={(e) => updateFormField('chamberHumidity', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Water Spray</label>
                            <select
                                value={formData.waterSpray}
                                onChange={(e) => updateFormField('waterSpray', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Off">Off</option>
                                <option value="On">On</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Source-to-Sample Distance</label>
                            <input
                                value={formData.sourceToSampleDistance}
                                onChange={(e) => updateFormField('sourceToSampleDistance', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Other Verification Items */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Other Verification Items</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Samples Individually Labeled</label>
                            <select
                                value={formData.samplesLabeled}
                                onChange={(e) => updateFormField('samplesLabeled', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Procedure Available & Reviewed</label>
                            <select
                                value={formData.procedureAvailable}
                                onChange={(e) => updateFormField('procedureAvailable', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Samples Inspected for T0 Discoloration</label>
                            <select
                                value={formData.samplesInspected}
                                onChange={(e) => updateFormField('samplesInspected', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">T0 Color Measured at Each Region</label>
                            <select
                                value={formData.t0ColorMeasured}
                                onChange={(e) => updateFormField('t0ColorMeasured', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sample Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Line No.</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Part Vendor</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Measurement Date</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Week</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Color/Material Config</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Unique Sample ID</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Measurement Region</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Test Location</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Lab Temp T0 (°C)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Lab RH T0 (%)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Std L* F2</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Std a* F2</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Std b* F2</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Test CP (h)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Lab Temp CP (°C)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Lab RH CP (%)</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Std L* F2 @ CP</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Std a* F2 @ CP</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Std b* F2 @ CP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {formData.rows.map((row, index) => (
                                    <tr key={row.id} className={index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                                        <td className="px-4 py-4 text-center font-semibold text-gray-900">{row.lineNo}</td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.partVendor}
                                                onChange={(e) => updateRowField(row.id, 'partVendor', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="date"
                                                value={row.measurementDate}
                                                onChange={(e) => updateRowField(row.id, 'measurementDate', e.target.value)}
                                                className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.week}
                                                onChange={(e) => updateRowField(row.id, 'week', e.target.value)}
                                                className="w-full min-w-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.colorMaterialConfig}
                                                onChange={(e) => updateRowField(row.id, 'colorMaterialConfig', e.target.value)}
                                                className="w-full min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.uniqueSampleId}
                                                onChange={(e) => updateRowField(row.id, 'uniqueSampleId', e.target.value)}
                                                className="w-full min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.measurementRegion}
                                                onChange={(e) => updateRowField(row.id, 'measurementRegion', e.target.value)}
                                                className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                value={row.testLocation}
                                                onChange={(e) => updateRowField(row.id, 'testLocation', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={row.labTempT0}
                                                onChange={(e) => updateRowField(row.id, 'labTempT0', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={row.labRhT0}
                                                onChange={(e) => updateRowField(row.id, 'labRhT0', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.stdLF2}
                                                onChange={(e) => updateRowField(row.id, 'stdLF2', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.stdAF2}
                                                onChange={(e) => updateRowField(row.id, 'stdAF2', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.stdBF2}
                                                onChange={(e) => updateRowField(row.id, 'stdBF2', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                value={row.testCheckpoint}
                                                onChange={(e) => updateRowField(row.id, 'testCheckpoint', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={row.labTempCP}
                                                onChange={(e) => updateRowField(row.id, 'labTempCP', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={row.labRhCP}
                                                onChange={(e) => updateRowField(row.id, 'labRhCP', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.stdLF2CP}
                                                onChange={(e) => updateRowField(row.id, 'stdLF2CP', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.stdAF2CP}
                                                onChange={(e) => updateRowField(row.id, 'stdAF2CP', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.stdBF2CP}
                                                onChange={(e) => updateRowField(row.id, 'stdBF2CP', e.target.value)}
                                                className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
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
                    + Add Sample Row
                </button>
            </div>
        </div>
    );
}