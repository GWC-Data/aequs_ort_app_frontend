import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileSpreadsheet, 
  Cpu, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  SlidersHorizontal,
  CheckCircle,
  HelpCircle,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/backendApi";

// Interfaces
interface TestAllocationConfig {
  id: string;
  product: string;
  processesStage: string;
  mpNpi: string;
  testName: string;
  testCondition: string;
  checkpoints: string;
  machineEquipment: string;
  machineEquipment2: string;
  time: string;
  unit: string;
  location: string;
  qty: string | number;
}

interface OqcFormConfig {
  id: string;
  assemblyAnoOptions: string;
  anoCode: string;
  sourceOpt: string;
  sourceAndType: string;
  productOptions: string;
  productCode: string;
  productProject: string;
  projectOptions: string;
  projectCode: string;
  colourOptions: string;
  colourCode: string;
  reasonOptions: string;
  reasonCode: string;
}

interface MachineDetailConfig {
  id: string;
  machineId: string;
  machineDescription: string;
  testName: string;
}

// Default Data values
const defaultTestAllocations: TestAllocationConfig[] = [];

const defaultOqcForms: OqcFormConfig[] = [];

const defaultMachineDetails: MachineDetailConfig[] = [];

export default function ConfigurationPage() {
  const [activeSheet, setActiveSheet] = useState<"test" | "oqc" | "machine">("test");
  const [isLoading, setIsLoading] = useState(false);

  // States initialized with empty arrays, populated by useEffect
  const [testAllocations, setTestAllocations] = useState<TestAllocationConfig[]>(defaultTestAllocations);
  const [oqcForms, setOqcForms] = useState<OqcFormConfig[]>(defaultOqcForms);
  const [machineDetails, setMachineDetails] = useState<MachineDetailConfig[]>(defaultMachineDetails);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Load from backend on mount
  useEffect(() => {
    const fetchConfigs = async () => {
      setIsLoading(true);
      try {
        const tests = await apiService.getTestAllocations();
        if (tests && tests.length > 0) {
          setTestAllocations(tests);
        }
        const oqcs = await apiService.getOqcForms();
        if (oqcs && oqcs.length > 0) {
          setOqcForms(oqcs);
        }
        const machines = await apiService.getMachineDetails();
        if (machines && machines.length > 0) {
          setMachineDetails(machines);
        }
      } catch (error) {
        console.error("Error loading configuration from database:", error);
        toast.error("Failed to load configs from server. Using local defaults.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  // Cell modification handler
  const handleCellChange = (sheet: "test" | "oqc" | "machine", id: string, field: string, value: any) => {
    if (sheet === "test") {
      setTestAllocations(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    } else if (sheet === "oqc") {
      setOqcForms(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    } else if (sheet === "machine") {
      setMachineDetails(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    }
  };

  // Row additions
  const handleAddRow = () => {
    if (activeSheet === "test") {
      const newRow: TestAllocationConfig = {
        id: `ta-${Date.now()}`,
        product: "",
        processesStage: "",
        mpNpi: "",
        testName: "",
        testCondition: "",
        checkpoints: "",
        machineEquipment: "",
        machineEquipment2: "",
        time: "",
        unit: "",
        location: "",
        qty: ""
      };
      setTestAllocations(prev => [...prev, newRow]);
    } else if (activeSheet === "oqc") {
      const newRow: OqcFormConfig = {
        id: `oqc-${Date.now()}`,
        assemblyAnoOptions: "",
        anoCode: "",
        sourceOpt: "",
        sourceAndType: "",
        productOptions: "",
        productCode: "",
        productProject: "",
        projectOptions: "",
        projectCode: "",
        colourOptions: "",
        colourCode: "",
        reasonOptions: "",
        reasonCode: ""
      };
      setOqcForms(prev => [...prev, newRow]);
    } else if (activeSheet === "machine") {
      const newRow: MachineDetailConfig = {
        id: `m-${Date.now()}`,
        machineId: "",
        machineDescription: "",
        testName: ""
      };
      setMachineDetails(prev => [...prev, newRow]);
    }
    toast.success("New row appended to the sheet grid.");
  };

  // Row deletions
  const handleDeleteRow = (id: string) => {
    if (activeSheet === "test") {
      setTestAllocations(prev => prev.filter(item => item.id !== id));
    } else if (activeSheet === "oqc") {
      setOqcForms(prev => prev.filter(item => item.id !== id));
    } else if (activeSheet === "machine") {
      setMachineDetails(prev => prev.filter(item => item.id !== id));
    }
  };

  // Save changes handler
  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (activeSheet === "test") {
        const emptyProduct = testAllocations.some(item => !(item.product || "").trim() && !(item.testName || "").trim());
        if (emptyProduct && testAllocations.length > 0) {
          toast.warning("Some rows have empty Product or Test names, please check before saving.");
        }
        const updated = await apiService.saveTestAllocations(testAllocations);
        setTestAllocations(updated);
        localStorage.setItem("config_test_allocations", JSON.stringify(testAllocations));
        toast.success("Test Allocation configuration updated successfully!");
      } else if (activeSheet === "oqc") {
        const updated = await apiService.saveOqcForms(oqcForms);
        setOqcForms(updated);
        localStorage.setItem("config_oqc_forms", JSON.stringify(oqcForms));
        toast.success("OQC Form configurations updated successfully!");
      } else if (activeSheet === "machine") {
        const updated = await apiService.saveMachineDetails(machineDetails);
        setMachineDetails(updated);
        localStorage.setItem("config_machine_details", JSON.stringify(machineDetails));
        toast.success("Machine Registry configuration updated successfully!");
      }
    } catch (error) {
      console.error("Failed to save changes to database:", error);
      toast.error("Failed to save changes to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to default sheets state
  const handleResetToDefault = async () => {
    if (confirm("Are you sure you want to restore defaults? All unsaved updates will be overwritten.")) {
      setIsLoading(true);
      try {
        if (activeSheet === "test") {
          const updated = await apiService.saveTestAllocations(defaultTestAllocations);
          setTestAllocations(updated);
          localStorage.setItem("config_test_allocations", JSON.stringify(defaultTestAllocations));
        } else if (activeSheet === "oqc") {
          const updated = await apiService.saveOqcForms(defaultOqcForms);
          setOqcForms(updated);
          localStorage.setItem("config_oqc_forms", JSON.stringify(defaultOqcForms));
        } else if (activeSheet === "machine") {
          const updated = await apiService.saveMachineDetails(defaultMachineDetails);
          setMachineDetails(updated);
          localStorage.setItem("config_machine_details", JSON.stringify(defaultMachineDetails));
        }
        toast.info("Restored default configurations.");
      } catch (error) {
        console.error("Failed to restore default configuration:", error);
        toast.error("Failed to restore defaults on server.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Row filtering for active sheet search
  const filteredTestAllocations = testAllocations.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.product || '').toLowerCase().includes(query) ||
      (item.testName || '').toLowerCase().includes(query) ||
      (item.machineEquipment || '').toLowerCase().includes(query)
    );
  });

  const filteredOqcForms = oqcForms.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.assemblyAnoOptions || item.source || '').toLowerCase().includes(query) ||
      (item.anoCode || '').toLowerCase().includes(query) ||
      (item.productCode || '').toLowerCase().includes(query)
    );
  });

  const filteredMachineDetails = machineDetails.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.machineId || '').toLowerCase().includes(query) ||
      (item.machineDescription || '').toLowerCase().includes(query) ||
      (item.testName || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full p-6 space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <SlidersHorizontal className="text-[#e0413a] h-7 w-7" />
            System Configuration
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Inline spreadsheet editors replacing legacy Excel sheet dependencies. Edit cells directly and save configurations.
          </p>
        </div>
      </div>

      {/* Top 3 Interactive Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Test Allocation */}
        <div 
          onClick={() => { setActiveSheet("test"); setSearchQuery(""); }}
          className={`cursor-pointer group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 ${
            activeSheet === "test" 
              ? "border-[#e0413a] bg-gradient-to-br from-red-50/50 to-red-100/10 shadow-lg shadow-red-500/5 ring-1 ring-[#e0413a] scale-[1.02]"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-lg ${activeSheet === "test" ? "bg-[#e0413a] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200/70"}`}>
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span className={`text-xxs px-2 py-0.5 rounded font-mono font-bold ${
              activeSheet === "test" ? "bg-red-100 text-[#e0413a]" : "bg-gray-100 text-gray-500"
            }`}>
              {testAllocations.length} rows
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-sm font-bold text-gray-900">Test Allocation</h3>
            <p className="text-xs text-gray-400">Configure products, conditions, specifications, and assigned testers.</p>
          </div>
        </div>

        {/* Card 2: OQC Form Mappings */}
        <div 
          onClick={() => { setActiveSheet("oqc"); setSearchQuery(""); }}
          className={`cursor-pointer group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 ${
            activeSheet === "oqc" 
              ? "border-[#e0413a] bg-gradient-to-br from-red-50/50 to-red-100/10 shadow-lg shadow-red-500/5 ring-1 ring-[#e0413a] scale-[1.02]"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-lg ${activeSheet === "oqc" ? "bg-[#e0413a] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200/70"}`}>
              <Layers className="h-5 w-5" />
            </div>
            <span className={`text-xxs px-2 py-0.5 rounded font-mono font-bold ${
              activeSheet === "oqc" ? "bg-red-100 text-[#e0413a]" : "bg-gray-100 text-gray-500"
            }`}>
              {oqcForms.length} mappings
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-sm font-bold text-gray-900">OQC Form Mappings</h3>
            <p className="text-xs text-gray-400">Map dynamic anodizing source types to physical product barcode formats.</p>
          </div>
        </div>

        {/* Card 3: Machine Details */}
        <div 
          onClick={() => { setActiveSheet("machine"); setSearchQuery(""); }}
          className={`cursor-pointer group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 ${
            activeSheet === "machine" 
              ? "border-[#e0413a] bg-gradient-to-br from-red-50/50 to-red-100/10 shadow-lg shadow-red-500/5 ring-1 ring-[#e0413a] scale-[1.02]"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-lg ${activeSheet === "machine" ? "bg-[#e0413a] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200/70"}`}>
              <Cpu className="h-5 w-5" />
            </div>
            <span className={`text-xxs px-2 py-0.5 rounded font-mono font-bold ${
              activeSheet === "machine" ? "bg-red-100 text-[#e0413a]" : "bg-gray-100 text-gray-500"
            }`}>
              {machineDetails.length} devices
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="text-sm font-bold text-gray-900">Machine Details</h3>
            <p className="text-xs text-gray-400">Manage laboratory equipment chambers list and status indicators.</p>
          </div>
        </div>

      </div>

      {/* Spreadsheet Workspace Section */}
      <div className="space-y-4">
        
        {/* Table Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-gray-200/80 p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full bg-[#e0413a] ${isLoading ? "animate-spin" : "animate-pulse"}`} />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              {activeSheet === "test" && "Active Sheet: Test Allocation"}
              {activeSheet === "oqc" && "Active Sheet: OQC Form"}
              {activeSheet === "machine" && "Active Sheet: Machine Details"}
              {isLoading && <span className="text-xs font-normal text-gray-500 lowercase italic">(syncing...)</span>}
            </h2>
          </div>

          {/* Table Actions Toolbar */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input 
                placeholder="Quick Filter rows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs max-w-xs focus-visible:ring-[#e0413a] bg-white border-gray-200 shadow-sm"
              />
            </div>
            {/* Action buttons */}
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleResetToDefault}
              disabled={isLoading}
              className="h-9 text-xs gap-1 border-gray-200 bg-white hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore Defaults
            </Button>
            <Button 
              size="sm"
              onClick={handleAddRow}
              disabled={isLoading}
              className="h-9 text-xs gap-1 bg-[#e0413a] text-white hover:bg-[#c9322c]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </Button>
            <Button 
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="h-9 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        {/* Dynamic Spreadsheet Editor Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto no-scrollbar">
            
            {/* 1. TEST ALLOCATIONS SPREADSHEET */}
            {activeSheet === "test" && (
              <table className="w-full text-left text-xs border-collapse divide-y divide-gray-200">
                <thead className="bg-slate-50 text-slate-500 font-semibold tracking-wider uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r min-w-[120px]">Product</th>
                    <th className="py-2.5 px-3 border-r min-w-[130px]">Processes Stage</th>
                    <th className="py-2.5 px-3 border-r min-w-[100px]">MP/NPI</th>
                    <th className="py-2.5 px-3 border-r min-w-[150px]">Test Name</th>
                    <th className="py-2.5 px-3 border-r min-w-[180px]">Test Condition</th>
                    <th className="py-2.5 px-3 border-r min-w-[180px]">Checkpoints</th>
                    <th className="py-2.5 px-3 border-r min-w-[160px]">Machine / Equipment</th>
                    <th className="py-2.5 px-3 border-r min-w-[160px]">Machine / Equipment-2</th>
                    <th className="py-2.5 px-3 border-r min-w-[80px]">Time</th>
                    <th className="py-2.5 px-3 border-r min-w-[100px]">Unit</th>
                    <th className="py-2.5 px-3 border-r min-w-[120px]">Location</th>
                    <th className="py-2.5 px-3 border-r min-w-[80px]">Qty</th>
                    <th className="py-2.5 px-3 w-[60px] text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredTestAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-gray-400 font-medium italic">
                        No configurations found. Add a row or check filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredTestAllocations.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        {/* Product */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.product}
                            onChange={(e) => handleCellChange("test", item.id, "product", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-800 font-bold"
                          />
                        </td>
                        {/* Processes Stage */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.processesStage}
                            onChange={(e) => handleCellChange("test", item.id, "processesStage", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* MP/NPI */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.mpNpi}
                            onChange={(e) => handleCellChange("test", item.id, "mpNpi", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600 font-semibold"
                          />
                        </td>
                        {/* Test Name */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.testName}
                            onChange={(e) => handleCellChange("test", item.id, "testName", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-800 font-medium"
                          />
                        </td>
                        {/* Test Condition */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.testCondition}
                            onChange={(e) => handleCellChange("test", item.id, "testCondition", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Checkpoints */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.checkpoints}
                            onChange={(e) => handleCellChange("test", item.id, "checkpoints", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Machine / Equipment */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.machineEquipment}
                            onChange={(e) => handleCellChange("test", item.id, "machineEquipment", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-700 font-medium"
                          />
                        </td>
                        {/* Machine / Equipment 2 */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.machineEquipment2}
                            onChange={(e) => handleCellChange("test", item.id, "machineEquipment2", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Time */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.time}
                            onChange={(e) => handleCellChange("test", item.id, "time", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Unit */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleCellChange("test", item.id, "unit", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Location */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.location}
                            onChange={(e) => handleCellChange("test", item.id, "location", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Qty */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.qty}
                            onChange={(e) => handleCellChange("test", item.id, "qty", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Delete Action */}
                        <td className="p-1 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteRow(item.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 2. OQC FORM MAPPINGS SPREADSHEET */}
            {activeSheet === "oqc" && (
              <table className="w-full text-left text-xs border-collapse divide-y divide-gray-200">
                <thead className="bg-slate-50 text-slate-500 font-semibold tracking-wider uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r min-w-[180px]">ASSEMBLY_ANO_OPTIONS</th>
                    <th className="py-2.5 px-3 border-r min-w-[120px]">ANO_CODE</th>
                    <th className="py-2.5 px-3 border-r min-w-[120px]">SOURCE_OPT</th>
                    <th className="py-2.5 px-3 border-r min-w-[160px]">SOURCE_AND_TYPE</th>
                    <th className="py-2.5 px-3 border-r min-w-[160px]">PRODUCT_OPTIONS</th>
                    <th className="py-2.5 px-3 border-r min-w-[140px]">PRODUCT_CODE</th>
                    <th className="py-2.5 px-3 border-r min-w-[160px]">PRODUCT_PROJECT</th>
                    <th className="py-2.5 px-3 border-r min-w-[160px]">PROJECT_OPTIONS</th>
                    <th className="py-2.5 px-3 border-r min-w-[120px]">PROJECT_CODE</th>
                    <th className="py-2.5 px-3 border-r min-w-[140px]">COLOUR_OPTIONS</th>
                    <th className="py-2.5 px-3 border-r min-w-[120px]">COLOUR_CODE</th>
                    <th className="py-2.5 px-3 border-r min-w-[150px]">REASON_OPTIONS</th>
                    <th className="py-2.5 px-3 border-r min-w-[120px]">REASON_CODE</th>
                    <th className="py-2.5 px-3 w-[60px] text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredOqcForms.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-8 text-center text-gray-400 font-medium italic">
                        No configurations found. Add a row or check filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredOqcForms.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        {/* ASSEMBLY_ANO_OPTIONS */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.assemblyAnoOptions}
                            onChange={(e) => handleCellChange("oqc", item.id, "assemblyAnoOptions", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-800 font-bold"
                          />
                        </td>
                        {/* ANO_CODE */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.anoCode}
                            onChange={(e) => handleCellChange("oqc", item.id, "anoCode", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs font-mono font-bold text-red-600"
                          />
                        </td>
                        {/* SOURCE_OPT */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.sourceOpt}
                            onChange={(e) => handleCellChange("oqc", item.id, "sourceOpt", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* SOURCE_AND_TYPE */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.sourceAndType}
                            onChange={(e) => handleCellChange("oqc", item.id, "sourceAndType", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* PRODUCT_OPTIONS */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.productOptions}
                            onChange={(e) => handleCellChange("oqc", item.id, "productOptions", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* PRODUCT_CODE */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.productCode}
                            onChange={(e) => handleCellChange("oqc", item.id, "productCode", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs font-mono font-bold text-red-600"
                          />
                        </td>
                        {/* PRODUCT_PROJECT */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.productProject}
                            onChange={(e) => handleCellChange("oqc", item.id, "productProject", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* PROJECT_OPTIONS */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.projectOptions}
                            onChange={(e) => handleCellChange("oqc", item.id, "projectOptions", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* PROJECT_CODE */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.projectCode}
                            onChange={(e) => handleCellChange("oqc", item.id, "projectCode", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* COLOUR_OPTIONS */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.colourOptions}
                            onChange={(e) => handleCellChange("oqc", item.id, "colourOptions", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* COLOUR_CODE */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.colourCode}
                            onChange={(e) => handleCellChange("oqc", item.id, "colourCode", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* REASON_OPTIONS */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.reasonOptions}
                            onChange={(e) => handleCellChange("oqc", item.id, "reasonOptions", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* REASON_CODE */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.reasonCode}
                            onChange={(e) => handleCellChange("oqc", item.id, "reasonCode", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-1.5 text-xs text-slate-600"
                          />
                        </td>
                        {/* Delete Action */}
                        <td className="p-1 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteRow(item.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 3. MACHINE DETAILS SPREADSHEET */}
            {activeSheet === "machine" && (
              <table className="w-full text-left text-xs border-collapse divide-y divide-gray-200">
                <thead className="bg-slate-50 text-slate-500 font-semibold tracking-wider uppercase border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-4 border-r min-w-[150px]">machine_id</th>
                    <th className="py-2.5 px-4 border-r min-w-[250px]">machine_description</th>
                    <th className="py-2.5 px-4 border-r min-w-[200px]">test_name</th>
                    <th className="py-2.5 px-4 w-[100px] text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredMachineDetails.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 font-medium italic">
                        No devices registered. Add a row or check filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredMachineDetails.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        {/* machine_id */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.machineId}
                            onChange={(e) => handleCellChange("machine", item.id, "machineId", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-2 text-xs font-mono text-slate-800"
                          />
                        </td>
                        {/* machine_description */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.machineDescription}
                            onChange={(e) => handleCellChange("machine", item.id, "machineDescription", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-2 text-xs text-slate-700 font-bold"
                          />
                        </td>
                        {/* test_name */}
                        <td className="p-1 border-r">
                          <input 
                            type="text"
                            value={item.testName}
                            onChange={(e) => handleCellChange("machine", item.id, "testName", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-red-400 focus:outline-none p-2 text-xs text-slate-600"
                          />
                        </td>
                        {/* Delete Action */}
                        <td className="p-1 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteRow(item.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
