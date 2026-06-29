import React from "react";

interface FormRow {
  id: number;
  srNo: number;
  testDate: string;
  sampleId: string;
  cleatNumber: string;
  visual: string;
  prePhoto: string | null;
  postPhoto: string | null;
  partPicture: string | null;
  failureMode: string;
  glueCondition: string;
  criteria: string;
  observation: string;
  forceDeflection: string;
  displacement: string;
  status: string;
}

interface FormData {
  testName: string;
  ers: string;
  machineName: string;
  testCondition: string;
  date: string;
  passCriteria: string;
  testStage: string;
  project: string;
  sampleQty: string;
  rows: FormRow[];
}

interface PullTestCleatFormProps {
  formData: FormData;
  updateFormField: (field: string, value: string) => void;
  updateRowField: (rowId: number, field: string, value: string) => void;
  addRow: () => void;
}

export default function PullTestCleatForm({ 
  formData, 
  updateFormField, 
  updateRowField, 
  addRow 
}: PullTestCleatFormProps) {

  // Debug function to check image distribution
  const debugImageDistribution = () => {
    console.log("PullTestCleatForm - Current form data:", formData);
    formData.rows.forEach((row, index) => {
      console.log(`Row ${index + 1} (${row.cleatNumber}):`, {
        prePhoto: row.prePhoto ? "✓ Loaded" : "✗ Missing",
        postPhoto: row.postPhoto ? "✓ Loaded" : "✗ Missing",
        partPicture: row.partPicture ? "✓ Loaded" : "✗ Missing"
      });
    });
  };

  // Call debug on component mount and when formData changes
  React.useEffect(() => {
    debugImageDistribution();
  }, [formData]);

  const handleImageClick = (imageUrl: string | null, type: string, rowId: number, cleatNumber: string) => {
    if (imageUrl) {
      // Open image in new tab for larger view
      window.open(imageUrl, '_blank');
    } else {
      console.log(`No ${type} image for ${cleatNumber} (Row ${rowId})`);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Pull Test of Cleat</h2>
          <button
            onClick={debugImageDistribution}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
          >
            Debug Images
          </button>
        </div>
        
        {/* Header Fields */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Test Name</label>
              <input value={formData.testName} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ERS</label>
              <input value={formData.ers} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Machine Name</label>
              <input value={formData.machineName} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pass Criteria</label>
              <input value={formData.passCriteria} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sample Qty</label>
              <input value={formData.sampleQty} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
            </div>
          </div>
        </div>

        {/* Image Distribution Status */}
        {formData.rows.some(row => row.partPicture) && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Auto-Distributed Part Pictures
            </h3>
            <div className="text-sm text-green-700">
              {formData.rows.filter(row => row.partPicture).length} out of {formData.rows.length} cleats have auto-detected part pictures
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300">
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sr.No</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Test Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Sample ID</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Cleat#</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Visual</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Pre-Photo</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Post-Photo</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Part Picture</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Failure Mode</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Glue</th>
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
                    <td className="px-4 py-4">
                      <input 
                        value={row.cleatNumber} 
                        readOnly 
                        className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={row.visual}
                        onChange={(e) => updateRowField(row.id, 'visual', e.target.value)}
                        className="w-full min-w-[90px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="OK">OK</option>
                        <option value="NG">NG</option>
                      </select>
                    </td>
                    
                    {/* Pre-Photo Column */}
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleImageClick(row.prePhoto, 'Pre-Photo', row.id, row.cleatNumber)}
                          className={`flex flex-col items-center justify-center ${
                            row.prePhoto ? 'cursor-zoom-in' : 'cursor-default'
                          }`}
                        >
                          {row.prePhoto ? (
                            <>
                              <img 
                                src={row.prePhoto} 
                                alt={`Pre-${row.cleatNumber}`} 
                                className="h-16 w-16 object-cover rounded-lg border-2 border-green-200 shadow-sm hover:border-green-400 transition-colors"
                              />
                              <span className="text-xs text-green-600 mt-1 font-medium">Shared</span>
                            </>
                          ) : (
                            <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </button>
                      </div>
                    </td>
                    
                    {/* Post-Photo Column */}
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleImageClick(row.postPhoto, 'Post-Photo', row.id, row.cleatNumber)}
                          className={`flex flex-col items-center justify-center ${
                            row.postPhoto ? 'cursor-zoom-in' : 'cursor-default'
                          }`}
                        >
                          {row.postPhoto ? (
                            <>
                              <img 
                                src={row.postPhoto} 
                                alt={`Post-${row.cleatNumber}`} 
                                className="h-16 w-16 object-cover rounded-lg border-2 border-blue-200 shadow-sm hover:border-blue-400 transition-colors"
                              />
                              <span className="text-xs text-blue-600 mt-1 font-medium">Shared</span>
                            </>
                          ) : (
                            <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </button>
                      </div>
                    </td>
                    
                    {/* Part Picture Column */}
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleImageClick(row.partPicture, 'Part Picture', row.id, row.cleatNumber)}
                          className={`flex flex-col items-center justify-center ${
                            row.partPicture ? 'cursor-zoom-in' : 'cursor-default'
                          }`}
                        >
                          {row.partPicture ? (
                            <>
                              <img 
                                src={row.partPicture} 
                                alt={`Part-${row.cleatNumber}`} 
                                className="h-16 w-16 object-cover rounded-lg border-2 border-purple-200 shadow-sm hover:border-purple-400 transition-colors"
                              />
                              <span className="text-xs text-purple-600 mt-1 font-medium">Auto-Crop</span>
                            </>
                          ) : (
                            <div className="h-16 w-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-xs text-gray-400">
                              <span>No</span>
                              <span>image</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <input
                        value={row.failureMode}
                        onChange={(e) => updateRowField(row.id, 'failureMode', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.glueCondition}
                        onChange={(e) => updateRowField(row.id, 'glueCondition', e.target.value)}
                        className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input value={row.criteria} readOnly className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-medium" />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.observation}
                        onChange={(e) => updateRowField(row.id, 'observation', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Value"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.forceDeflection}
                        onChange={(e) => updateRowField(row.id, 'forceDeflection', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Value"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={row.displacement}
                        onChange={(e) => updateRowField(row.id, 'displacement', e.target.value)}
                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Value"
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

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            <strong>Image Legend:</strong>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-200 border border-green-400 mr-1"></div>
                <span>Pre-Photo (Shared)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-200 border border-blue-400 mr-1"></div>
                <span>Post-Photo (Shared)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-200 border border-purple-400 mr-1"></div>
                <span>Part Picture (Auto-Crop)</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={addRow}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors shadow-sm"
          >
            + Add Row
          </button>
        </div>
      </div>
    </div>
  );
}