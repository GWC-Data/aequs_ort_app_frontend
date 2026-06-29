import React from "react";

interface TestRow {
  id: number;
  srNo: number;
  testDate: string;
  sampleId: string;
  visual: string;
  prePhoto: string | null;
  postPhoto: string | null;
  partPicture: string | null;
  criteria: string;
  observation: string;
  forceDeflection: string;
  displacement: string;
  status: string;
  // Additional fields for specific test types
  footNumber?: string;
  cleatNumber?: string;
  sideSnapNumber?: string;
  failureMode?: string;
  glueCondition?: string;
  ssShear?: string;
}

interface FormData {
  testName: string;
  ers: string;
  partNumber: string;
  machineName: string;
  testCondition: string;
  roomTemp: string;
  date: string;
  passCriteria: string;
  testStage: string;
  project: string;
  sampleQty: string;
  rows: TestRow[];
}

interface StandardTestFormProps {
  formData: FormData;
  updateFormField: (field: string, value: string) => void;
  updateRowField: (rowId: number, field: string, value: string) => void;
  addRow: () => void;
}

export default function StandardTestForm({ 
  formData, 
  updateFormField, 
  updateRowField, 
  addRow 
}: StandardTestFormProps) {
  
  // Determine which additional fields to show based on test name
  const getAdditionalFields = () => {
    const testName = formData.testName.toLowerCase();
    
    if (testName.includes('foot') || testName.includes('push')) {
      return ['footNumber', 'failureMode', 'glueCondition'];
    } else if (testName.includes('cleat')) {
      return ['cleatNumber', 'failureMode', 'glueCondition'];
    } else if (testName.includes('side') || testName.includes('snap')) {
      return ['sideSnapNumber', 'failureMode', 'glueCondition'];
    } else if (testName.includes('shear')) {
      return ['ssShear'];
    }
    
    return [];
  };

  const additionalFields = getAdditionalFields();

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between">
<h2 className="text-3xl font-bold text-gray-900 mb-8">{formData.testName}</h2>

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
        
        
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Test Name</label>
              <input 
                value={formData.testName}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ERS</label>
              <input 
                value={formData.ers}
                readOnly
                onChange={(e) => updateFormField('ers', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            {/* <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Part Number</label>
              <input 
                value={formData.partNumber}
                onChange={(e) => updateFormField('partNumber', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div> */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Machine Name</label>
              <input 
                value={formData.machineName}
                readOnly
                onChange={(e) => updateFormField('machineName', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Test Condition</label>
              <input 
                value={formData.testCondition}
                onChange={(e) => updateFormField('testCondition', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            {/* <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Room Temp</label>
              <input 
                value={formData.roomTemp}
                onChange={(e) => updateFormField('roomTemp', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div> */}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pass Criteria</label>
              <input 
                value={formData.passCriteria}
                readOnly
                onChange={(e) => updateFormField('passCriteria', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Test Stage</label>
              <input 
                value={formData.testStage}
                readOnly
                onChange={(e) => updateFormField('testStage', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Project</label>
              <input 
                value={formData.project}
                readOnly
                onChange={(e) => updateFormField('project', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sample Qty</label>
              <input 
                value={formData.sampleQty}
                readOnly
                onChange={(e) => updateFormField('sampleQty', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium"
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

        <h3 className="text-lg font-bold mb-4 text-gray-800">Test Results</h3>

        {/* Main Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sr.No</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Test Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sample ID</th>
                  
                  {/* Dynamic additional fields */}
                  {additionalFields.includes('footNumber') && (
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Foot Number</th>
                  )}
                  {additionalFields.includes('cleatNumber') && (
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Cleat Number</th>
                  )}
                  {additionalFields.includes('sideSnapNumber') && (
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Side Snap Number</th>
                  )}
                  {additionalFields.includes('ssShear') && (
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">SS.Shear#</th>
                  )}
                  
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Visual</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Pre-Photo</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Post-Photo</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Part Picture</th>
                  
                  {/* Additional technical fields */}
                  {additionalFields.includes('failureMode') && (
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Failure Mode</th>
                  )}
                  {additionalFields.includes('glueCondition') && (
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Glue Condition</th>
                  )}
                  
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Criteria</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Observation</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Force vs Deflection</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Displacement</th>
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
                        value={row.testDate}
                        onChange={(e) => updateRowField(row.id, 'testDate', e.target.value)}
                        className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.sampleId}
                        onChange={(e) => updateRowField(row.id, 'sampleId', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    
                    {/* Dynamic additional fields */}
                    {additionalFields.includes('footNumber') && (
                      <td className="px-4 py-4">
                        <select
                          value={row.footNumber || ''}
                          onChange={(e) => updateRowField(row.id, 'footNumber', e.target.value)}
                          className="w-full min-w-[90px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Select</option>
                          <option value="F1">F1</option>
                          <option value="F2">F2</option>
                          <option value="F3">F3</option>
                          <option value="F4">F4</option>
                        </select>
                      </td>
                    )}
                    
                    {additionalFields.includes('cleatNumber') && (
                      <td className="px-4 py-4">
                        <select
                          value={row.cleatNumber || ''}
                          onChange={(e) => updateRowField(row.id, 'cleatNumber', e.target.value)}
                          className="w-full min-w-[90px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Select</option>
                          <option value="Cleat 1">Cleat 1</option>
                          <option value="Cleat 2">Cleat 2</option>
                          <option value="Cleat 3">Cleat 3</option>
                          <option value="Cleat 4">Cleat 4</option>
                        </select>
                      </td>
                    )}
                    
                    {additionalFields.includes('sideSnapNumber') && (
                      <td className="px-4 py-4">
                        <select
                          value={row.sideSnapNumber || ''}
                          onChange={(e) => updateRowField(row.id, 'sideSnapNumber', e.target.value)}
                          className="w-full min-w-[90px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Select</option>
                          <option value="Side snap 1">Side snap 1</option>
                          <option value="Side snap 2">Side snap 2</option>
                          <option value="Side snap 3">Side snap 3</option>
                          <option value="Side snap 4">Side snap 4</option>
                        </select>
                      </td>
                    )}
                    
                    {additionalFields.includes('ssShear') && (
                      <td className="px-4 py-4">
                        <input
                          value={row.ssShear || ''}
                          onChange={(e) => updateRowField(row.id, 'ssShear', e.target.value)}
                          className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                    )}
                    
                    <td className="px-4 py-4">
                      <select
                        value={row.visual}
                        onChange={(e) => updateRowField(row.id, 'visual', e.target.value)}
                        className="w-full min-w-[90px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">Select</option>
                        <option value="OK">OK</option>
                        <option value="NG">NG</option>
                      </select>
                    </td>
                    
                    {/* Image columns */}
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        {row.prePhoto ? (
                          <img src={row.prePhoto} alt="Pre" className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        {row.postPhoto ? (
                          <img src={row.postPhoto} alt="Post" className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        {row.partPicture ? (
                          <img src={row.partPicture} alt="Part" className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Additional technical fields */}
                    {additionalFields.includes('failureMode') && (
                      <td className="px-4 py-4">
                        <select
                          value={row.failureMode || ''}
                          onChange={(e) => updateRowField(row.id, 'failureMode', e.target.value)}
                          className="w-full min-w-[90px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Select</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </td>
                    )}
                    
                    {additionalFields.includes('glueCondition') && (
                      <td className="px-4 py-4">
                        <select
                          value={row.glueCondition || ''}
                          onChange={(e) => updateRowField(row.id, 'glueCondition', e.target.value)}
                          className="w-full min-w-[90px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Select</option>
                          <option value="F">F</option>
                          <option value="B">B</option>
                        </select>
                      </td>
                    )}
                    
                    <td className="px-4 py-4">
                      <input
                        value={row.criteria}
                        onChange={(e) => updateRowField(row.id, 'criteria', e.target.value)}
                        className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.observation}
                        onChange={(e) => updateRowField(row.id, 'observation', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.forceDeflection}
                        onChange={(e) => updateRowField(row.id, 'forceDeflection', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.displacement}
                        onChange={(e) => updateRowField(row.id, 'displacement', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
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