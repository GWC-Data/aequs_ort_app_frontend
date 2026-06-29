import React from "react";

interface FormRow {
  id: number;
  srNo: number;
  sampleId: string;
  startDate: string;
  endDate: string;
  t0Cosmetic: string | null;
  t0NonCosmetic: string | null;
  t168Cosmetic: string | null;
  t168NonCosmetic: string | null;
  status: string;
}

interface FormData {
  testName: string;
  ers: string;
  testCondition: string;
  date: string;
  failureCriteria: string[];
  testStage: string;
  project: string;
  sampleQty: string;
  rows: FormRow[];
}

interface HeatSoakFormProps {
  formData: FormData;
  updateFormField: (field: string, value: string) => void;
  updateRowField: (rowId: number, field: string, value: string) => void;
  addRow: () => void;
}

export default function HeatSoakForm({ 
  formData, 
  updateFormField, 
  updateRowField, 
  addRow 
}: HeatSoakFormProps) {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Heat Soak Test</h2>
        <div className="flex items-center gap-4">
          <label htmlFor="">Hours</label>
          <input
              type="text"
              className="border h-10 w-16 border-black outline-black rounded-md"
            />
             <div className="">
            <button
              type="submit"
              className="flex items-center w-fit border rounded-sm bg-[#f35b62] text-white p-1 hover:bg-[#EE161F] hover:text-white transition-colors"
            >
              <span>Option to start</span>
            </button>
          </div>
        </div>

        

        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Test Name</label>
              <input value={formData.testName} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ERS</label>
              <input value={formData.ers} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Test Condition</label>
              <input value={formData.testCondition} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Test Stage</label>
              <input value={formData.testStage} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Project</label>
              <input value={formData.project} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Failure Criteria</label>
              <ul className="list-disc list-inside text-sm text-gray-700 bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-1">
                {formData.failureCriteria.map((criteria, i) => (
                  <li key={i} className="text-gray-800">{criteria}</li>
                ))}
              </ul>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sample Qty</label>
              <input value={formData.sampleQty} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200" rowSpan={2}>SR.No</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200" rowSpan={2}>Sample ID</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200" rowSpan={2}>Start Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200" rowSpan={2}>End Date</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wider whitespace-nowrap bg-blue-50 border-r border-gray-200" colSpan={2}>T0 Pictures</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-green-700 uppercase tracking-wider whitespace-nowrap bg-green-50 border-r border-gray-200" colSpan={2}>T168 Pictures</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap" rowSpan={2}>Status</th>
                </tr>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider whitespace-nowrap bg-blue-50 border-r border-gray-200">Cosmetic</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider whitespace-nowrap bg-blue-50 border-r border-gray-200">Non-Cosmetic</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-green-700 uppercase tracking-wider whitespace-nowrap bg-green-50 border-r border-gray-200">Cosmetic</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-green-700 uppercase tracking-wider whitespace-nowrap bg-green-50 border-r border-gray-200">Non-Cosmetic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {formData.rows.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                    <td className="px-4 py-4 text-center font-semibold text-gray-900 border-r border-gray-200">{row.srNo}</td>
                    <td className="px-4 py-4 border-r border-gray-200">
                      <input
                        value={row.sampleId}
                        onChange={(e) => updateRowField(row.id, 'sampleId', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 border-r border-gray-200">
                      <input
                        type="date"
                        value={row.startDate}
                        onChange={(e) => updateRowField(row.id, 'startDate', e.target.value)}
                        className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 border-r border-gray-200">
                      <input
                        type="date"
                        value={row.endDate}
                        onChange={(e) => updateRowField(row.id, 'endDate', e.target.value)}
                        className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 bg-blue-50/30 border-r border-gray-200">
                      <div className="flex justify-center">
                        {row.t0Cosmetic ? (
                          <img src={row.t0Cosmetic} alt="T0 Cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-blue-200 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-blue-100 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center text-xs text-blue-400">No image</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-blue-50/30 border-r border-gray-200">
                      <div className="flex justify-center">
                        {row.t0NonCosmetic ? (
                          <img src={row.t0NonCosmetic} alt="T0 Non-Cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-blue-200 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-blue-100 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center text-xs text-blue-400">No image</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-green-50/30 border-r border-gray-200">
                      <div className="flex justify-center">
                        {row.t168Cosmetic ? (
                          <img src={row.t168Cosmetic} alt="T168 Cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-green-200 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-green-100 rounded-lg border-2 border-dashed border-green-300 flex items-center justify-center text-xs text-green-400">No image</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-green-50/30 border-r border-gray-200">
                      <div className="flex justify-center">
                        {row.t168NonCosmetic ? (
                          <img src={row.t168NonCosmetic} alt="T168 Non-Cosmetic" className="h-16 w-16 object-cover rounded-lg border-2 border-green-200 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-green-100 rounded-lg border-2 border-dashed border-green-300 flex items-center justify-center text-xs text-green-400">No image</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={row.status}
                        onChange={(e) => updateRowField(row.id, 'status', e.target.value)}
                        className={`w-full min-w-[110px] px-3 py-2 border rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          row.status === "Pass" ? "bg-green-50 text-green-700 border-green-200" : 
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