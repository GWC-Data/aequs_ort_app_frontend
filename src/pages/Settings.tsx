import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Download,
  ChevronDown,
  ChevronRight,
  List,
  Save,
  AlertCircle,
  Settings,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";
import { backendApi, BACKEND_API_URL, fetchMasterSheetArrayBuffer } from '@/lib/backendApi';

// ========== DYNAMIC PROCESS STAGE SERVICE ==========

interface ProcessStageComponents {
  type: string;
  project: string;
  reason: string;
  fullString: string;
}

interface MatchResult {
  matched: boolean;
  matchedStage: ProcessStageComponents | null;
  matchType: 'exact' | 'project-reason' | 'reason-only' | 'none';
  confidence: number;
}

class DynamicProcessStageService {
  private allProcessStages: ProcessStageComponents[] = [];
  private types: string[] = [];
  private projectsByType: Map<string, Set<string>> = new Map();
  private reasonsByTypeAndProject: Map<string, Map<string, Set<string>>> = new Map();
  private validAnoTypes: Set<string> = new Set(); // ← ADDED

  async initializeFromMasterSheet(excelData: any[], oqcFormData?: any[]) { // ← UPDATED SIGNATURE
    this.parseProcessStagesFromMasterSheet(excelData);
    this.buildDynamicOptions();

    // ← ADDED: load valid ANO types from OQC_Form sheet
    if (oqcFormData && oqcFormData.length > 0) {
      this.loadValidAnoTypes(oqcFormData);
    }

    console.log('Dynamic Process Stages Loaded:', this.allProcessStages);
    console.log('Valid ANO Types:', Array.from(this.validAnoTypes));
  }

  // ← ADDED METHOD
  private loadValidAnoTypes(oqcFormData: any[]) {
    this.validAnoTypes.clear();
    oqcFormData.forEach(row => {
      const anoType = row["ASSEMBLY_ANO_OPTIONS"];
      if (anoType) {
        this.validAnoTypes.add(anoType.toString().trim().toUpperCase());
      }
    });
  }

  // ← ADDED METHOD
  isTypeValid(type: string): boolean {
    if (this.validAnoTypes.size === 0) return false;
    return this.validAnoTypes.has(type?.toString().trim().toUpperCase());
  }

  private parseProcessStagesFromMasterSheet(excelData: any[]) {
    const processStageMap = new Map<string, ProcessStageComponents>();

    excelData.forEach(row => {
      const processStage = row["Processes Stage"];
      if (!processStage) return;

      const parsed = this.parseProcessStageString(processStage.toString().trim());
      if (parsed) {
        const key = `${parsed.type}|${parsed.project}|${parsed.reason}`;
        if (!processStageMap.has(key)) {
          processStageMap.set(key, parsed);
        }
      }
    });

    this.allProcessStages = Array.from(processStageMap.values());
  }

  private parseProcessStageString(stageStr: string): ProcessStageComponents | null {
    const trimmed = stageStr.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 2) {
      // Pattern: Aqua MP, Aqua NPI, Hulk Line/Machine
      return {
        type: parts[0],
        project: '',
        reason: parts[1],
        fullString: trimmed
      };
    } else if (parts.length >= 3) {
      // Pattern: Ano Alpha MP, Assembly Alpha NPI
      const type = parts[0];
      const project = parts[1];
      const reason = parts.slice(2).join(' ');
      return {
        type: type,
        project: project,
        reason: reason,
        fullString: trimmed
      };
    }

    return null;
  }

  private buildDynamicOptions() {
    this.types = Array.from(new Set(this.allProcessStages.map(s => s.type))).sort();

    this.projectsByType.clear();
    this.allProcessStages.forEach(stage => {
      if (!this.projectsByType.has(stage.type)) {
        this.projectsByType.set(stage.type, new Set());
      }
      if (stage.project) {
        this.projectsByType.get(stage.type)!.add(stage.project);
      }
    });

    this.reasonsByTypeAndProject.clear();
    this.allProcessStages.forEach(stage => {
      if (!this.reasonsByTypeAndProject.has(stage.type)) {
        this.reasonsByTypeAndProject.set(stage.type, new Map());
      }
      const typeMap = this.reasonsByTypeAndProject.get(stage.type)!;
      const projectKey = stage.project || '__NO_PROJECT__';
      if (!typeMap.has(projectKey)) {
        typeMap.set(projectKey, new Set());
      }
      typeMap.get(projectKey)!.add(stage.reason);
    });
  }

  matchTicketToProcessStage(
    ticketType: string,
    ticketProject: string,
    ticketReason: string
  ): MatchResult {
    const normalizedTicketType = ticketType?.toLowerCase().trim() || '';
    const normalizedTicketProject = ticketProject?.toLowerCase().trim() || '';
    const normalizedTicketReason = ticketReason?.toLowerCase().trim() || '';

    // ← Check if type is a known valid ANO type from OQC_Form sheet
    const typeIsValid = this.isTypeValid(ticketType);

    console.log(`Matching ticket — type: "${ticketType}" (valid in OQC_Form: ${typeIsValid}), project: "${ticketProject}", reason: "${ticketReason}"`);
    console.log('All stages:', this.allProcessStages.map(s => s.fullString));

    if (typeIsValid) {
      // Try 1: Full exact match (Type + Project + Reason)
      const exactMatch = this.allProcessStages.find(stage =>
        stage.type.toLowerCase().trim() === normalizedTicketType &&
        stage.project.toLowerCase().trim() === normalizedTicketProject &&
        stage.reason.toLowerCase().trim() === normalizedTicketReason
      );
      if (exactMatch) {
        console.log('Match [exact]:', exactMatch.fullString);
        return { matched: true, matchedStage: exactMatch, matchType: 'exact', confidence: 100 };
      }

      // Try 2: Type + Reason (ignore project)
      const typeReasonMatch = this.allProcessStages.find(stage =>
        stage.type.toLowerCase().trim() === normalizedTicketType &&
        stage.reason.toLowerCase().trim() === normalizedTicketReason
      );
      if (typeReasonMatch) {
        console.log('Match [type+reason]:', typeReasonMatch.fullString);
        return { matched: true, matchedStage: typeReasonMatch, matchType: 'project-reason', confidence: 75 };
      }
    }

    // Try 3: Project + Reason (type ignored — type not found as prefix in excel)
    const projectReasonMatch = this.allProcessStages.find(stage =>
      stage.project.toLowerCase().trim() === normalizedTicketProject &&
      stage.reason.toLowerCase().trim() === normalizedTicketReason
    );
    if (projectReasonMatch) {
      console.log('Match [project+reason]:', projectReasonMatch.fullString);
      return { matched: true, matchedStage: projectReasonMatch, matchType: 'project-reason', confidence: 70 };
    }

    // Try 4: ticket PROJECT matches excel TYPE, with empty excel project + reason match
    // Handles: ticket {project:"AQUA", reason:"NPI"} → excel "Aqua NPI" {type:"Aqua", project:"", reason:"NPI"}
    const projectAsTypeMatch = this.allProcessStages.find(stage =>
      stage.type.toLowerCase().trim() === normalizedTicketProject &&
      stage.project === '' &&
      stage.reason.toLowerCase().trim() === normalizedTicketReason
    );
    if (projectAsTypeMatch) {
      console.log('Match [ticket-project-as-excel-type]:', projectAsTypeMatch.fullString);
      return { matched: true, matchedStage: projectAsTypeMatch, matchType: 'project-reason', confidence: 65 };
    }

    // Try 5: ticket PROJECT matches excel TYPE + reason (project not empty in excel)
    // Handles: ticket {project:"ALPHA", reason:"NPI"} → excel "Ano Alpha NPI" {type:"Ano", project:"Alpha", reason:"NPI"}
    const projectAsTypeWithProjectMatch = this.allProcessStages.find(stage =>
      stage.type.toLowerCase().trim() === normalizedTicketProject &&
      stage.reason.toLowerCase().trim() === normalizedTicketReason
    );
    if (projectAsTypeWithProjectMatch) {
      console.log('Match [ticket-project-as-excel-type+reason]:', projectAsTypeWithProjectMatch.fullString);
      return { matched: true, matchedStage: projectAsTypeWithProjectMatch, matchType: 'project-reason', confidence: 60 };
    }

    // Try 6: Reason only (last resort)
    const reasonOnlyMatch = this.allProcessStages.find(stage =>
      stage.reason.toLowerCase().trim() === normalizedTicketReason
    );
    if (reasonOnlyMatch) {
      console.log('Match [reason-only]:', reasonOnlyMatch.fullString);
      return { matched: true, matchedStage: reasonOnlyMatch, matchType: 'reason-only', confidence: 40 };
    }

    console.warn('No match found for:', { ticketType, ticketProject, ticketReason });
    return { matched: false, matchedStage: null, matchType: 'none', confidence: 0 };
  }

  getAvailableTypes(): string[] {
    return this.types;
  }

  getAvailableProjects(type: string): string[] {
    const projects = this.projectsByType.get(type);
    if (!projects) return [];
    return Array.from(projects).sort();
  }

  hasProjects(type: string): boolean {
    const projects = this.projectsByType.get(type);
    return projects ? projects.size > 0 : false;
  }

  getAvailableReasons(type: string, project: string): string[] {
    const typeMap = this.reasonsByTypeAndProject.get(type);
    if (!typeMap) return [];

    const projectKey = project || '__NO_PROJECT__';
    const reasons = typeMap.get(projectKey);
    if (!reasons) return [];

    return Array.from(reasons).sort();
  }

  getFullProcessStage(type: string, project: string, reason: string): string {
    const matchedStage = this.allProcessStages.find(stage =>
      stage.type === type &&
      stage.project === project &&
      stage.reason === reason
    );

    if (matchedStage) {
      return matchedStage.fullString;
    }

    if (!project || project === '') {
      return `${type} ${reason}`;
    }
    return `${type} ${project} ${reason}`;
  }

  isValidCombination(type: string, project: string, reason: string): boolean {
    return this.allProcessStages.some(stage =>
      stage.type === type &&
      stage.project === project &&
      stage.reason === reason
    );
  }

  getAllProcessStages(): ProcessStageComponents[] {
    return this.allProcessStages;
  }
}

const dynamicProcessStageService = new DynamicProcessStageService();

// ========== DYNAMIC PROCESS STAGE SELECTOR COMPONENT ==========

interface DynamicProcessStageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  masterSheetData: any[];
  className?: string;
}

const DynamicProcessStageSelector: React.FC<DynamicProcessStageSelectorProps> = ({
  value,
  onChange,
  masterSheetData,
  className
}) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableReasons, setAvailableReasons] = useState<string[]>([]);
  const [showProjectField, setShowProjectField] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (masterSheetData && masterSheetData.length > 0) {
      initializeFromMasterSheet();
    }
  }, [masterSheetData]);

  useEffect(() => {
    if (value && !isLoading) {
      parseExistingValue(value);
    }
  }, [value, isLoading]);

  const initializeFromMasterSheet = async () => {
    setIsLoading(true);
    try {
      await dynamicProcessStageService.initializeFromMasterSheet(masterSheetData);
      const types = dynamicProcessStageService.getAvailableTypes();
      setAvailableTypes(types);

      if (value) {
        parseExistingValue(value);
      }
    } catch (error) {
      console.error('Failed to initialize process stage selector:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseExistingValue = (stageValue: string) => {
    const allStages = dynamicProcessStageService.getAllProcessStages();
    const matchedStage = allStages.find(s => s.fullString === stageValue);

    if (matchedStage) {
      setSelectedType(matchedStage.type);
      setSelectedProject(matchedStage.project || '');
      setSelectedReason(matchedStage.reason);

      const projects = dynamicProcessStageService.getAvailableProjects(matchedStage.type);
      setAvailableProjects(projects);
      setShowProjectField(projects.length > 0);

      const reasons = dynamicProcessStageService.getAvailableReasons(
        matchedStage.type,
        matchedStage.project || ''
      );
      setAvailableReasons(reasons);
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedProject('');
    setSelectedReason('');

    const projects = dynamicProcessStageService.getAvailableProjects(type);
    setAvailableProjects(projects);
    setShowProjectField(projects.length > 0);
    setAvailableReasons([]);
    onChange('');
  };

  const handleProjectChange = (project: string) => {
    setSelectedProject(project);
    setSelectedReason('');

    const reasons = dynamicProcessStageService.getAvailableReasons(selectedType, project);
    setAvailableReasons(reasons);
    onChange('');
  };

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);

    const fullStage = dynamicProcessStageService.getFullProcessStage(
      selectedType,
      selectedProject,
      reason
    );

    const valid = dynamicProcessStageService.isValidCombination(
      selectedType,
      selectedProject,
      reason
    );
    setIsValid(valid);
    onChange(fullStage);
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading process stages...</div>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* <div className="space-y-2">
        <Label>Process Stage Type *</Label>
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedType && showProjectField && availableProjects.length > 0 && (
        <div className="space-y-2">
          <Label>Project</Label>
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map(project => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedType && availableReasons.length > 0 && (
        <div className="space-y-2">
          <Label>Reason *</Label>
          <Select value={selectedReason} onValueChange={handleReasonChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {availableReasons.map(reason => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )} */}

      {/* {selectedReason && (
        <Alert className={isValid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
          {isValid ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ✓ Valid process stage combination
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                ⚠ This combination doesn't exist in the master sheet
              </AlertDescription>
            </>
          )}
        </Alert>
      )} */}

      {selectedReason && (
        <div className="mt-2 ">
          <div className="font-bold text-sm mt-1 font-medium">
            {dynamicProcessStageService.getFullProcessStage(
              selectedType,
              selectedProject,
              selectedReason
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== INTERFACES ==========

interface BackendORTResponse {
  orts: BackendORTItem[];
}

interface BackendORTItem {
  Id: number;
  ticketId: number;
  ticketCode: string;
  totalQty: number;
  processStage: string;
  source: string;
  project: string;
  build: string;
  colour: string;
  oqcFormDate: string;
  location: string;
  reason: string;
  session: number;
  allowedParts: number;
  receivedStatus: string;
  date: string;
  shiftTime: string;
  detailBox: {
    batch: string;
    color: string;
    reason: string;
    project: string;
    isReupload: boolean;
    partNumbers: string[];
    dateShiftTime: string;
    movedToStage2: boolean;
    totalQuantity: number;
    assemblyOQCAno: string;
    previousStatus: string | null;
    scannedPartsId: number;
    movedToStage2At: string;
    ticketCodeRaised: string;
  };
  inventoryRemarks: string;
  createdAt: string;
  updatedAt: string;
}

interface AggregatedTicketData {
  ticketCode: string;
  project: string;
  stage: string;
  totalQuantity: number;
  receivedParts: number;
  remainingParts: number;
  receivedDate: string;
  receivedShift: string;
  batch: string;
  color: string;
  reason: string;
  allocationStatus: string;
  lastUpdated: string;
}

interface Stage1Record {
  id: number;
  ticketCode: string;
  sessionId: string;
  sessionNumber: number;
  date: string;
  detailsBox: {
    totalQuantity: number;
    ticketCodeRaised: string;
    dateShiftTime: string;
    project: string;
    assemblyOQCAno: string;
    batch: string;
    color: string;
    reason: string;
  };
  inventoryRemarks: string;
  movedToStage2: boolean;
  partNumbers: string[];
  partsBeingSent: number;
  received: string;
  shiftTime: string;
  stage2Enabled: boolean;
  status: string;
  totalQuantity?: number;
  movedToStage2At?: string;
}

interface TestConfiguration {
  product: string;
  processStage: string;
  mpNpi: string;
  testName: string;
  testCondition: string;
  checkPoints: string;
  qty: string;
  specification: string;
  machineEquipment: string;
  machineEquipment2: string;
  time: string | number;
  location: string;
  unit: string;
}

interface TestAllocation {
  id: string;
  testName: string;
  allocatedParts: number;
  completedParts: number;
  remainingParts: number;
  loadedParts?: number;
  requiredQty: number;
  testCondition: string;
  checkPoints: string;
  specification: string;
  machineEquipment: string;
  machineEquipment2: string;
  time: string;
  location: string;
  unit: string;
  status: number;
  notes?: string;
  isExpanded?: boolean;
  childTests?: {
    id: string;
    testName: string;
    subTestName: string;
    testCondition: string;
    checkPoints: string;
    specification: string;
    machineEquipment: string;
    machineEquipment2: string;
    time: string;
    location: string;
    unit: string;
    allocatedParts: number;
    completedParts: number;
    remainingParts: number;
    loadedParts?: number;
  }[];
}

interface TicketAllocationData {
  ticketCode: string;
  totalQuantity: number;
  location: string;
  unit: string;
  project: string;
  anoType: string;
  build: string;
  colour: string;
  testAllocations: TestAllocation[];
  processStage: string;
  reason: string;
  totalRemainingParts: number;
  matchedProcessStage?: string;
  sop?: string;
}

interface SavedAllocation extends TicketAllocationData {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  sop?: string;
}

interface BackendAllocationResponse {
  message: string;
  allocation: SavedAllocation;
}

interface BackendAllocationsResponse {
  allocations: SavedAllocation[];
}

interface ExcelTestConfiguration {
  "Product"?: string;
  "Processes Stage": string;
  "MP/NPI"?: string;
  "Test Name": string;
  "Test Condition": string;
  Checkpoints: string;
  Qty: string;
  Specification: string;
  "Machine / Equipment": string;
  "Machine / Equipment-2": string;
  Time: string;
  Location: string;
  Unit: string;
}

// ========== BACKEND API FUNCTIONS ==========

const fetchAndAggregateBackendORTData = async (): Promise<AggregatedTicketData[]> => {
  try {
    const response = await backendApi.get("/ort");
    const data: BackendORTResponse = response.data;

    if (!data.orts || !Array.isArray(data.orts)) {
      console.error("Invalid data format from backend:", data);
      return [];
    }

    const ticketMap = new Map<string, BackendORTItem[]>();

    data.orts.forEach((item) => {
      if (!ticketMap.has(item.ticketCode)) {
        ticketMap.set(item.ticketCode, []);
      }
      ticketMap.get(item.ticketCode)!.push(item);
    });

    const aggregatedTickets: AggregatedTicketData[] = [];

    ticketMap.forEach((items, ticketCode) => {
      const sortedItems = [...items].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      const latestItem = sortedItems[0];

      const receivedParts = items
        .filter((item) => item.receivedStatus === "Received")
        .reduce((sum, item) => sum + item.allowedParts, 0);

      const remainingParts = Math.max(0, latestItem.totalQty - receivedParts);

      let allocationStatus = "Not Received";
      if (receivedParts > 0) {
        allocationStatus =
          receivedParts >= latestItem.totalQty
            ? "Fully Received"
            : "Partially Received";
      }

      aggregatedTickets.push({
        ticketCode,
        project: latestItem.project,
        stage: latestItem.detailBox.assemblyOQCAno,
        totalQuantity: latestItem.totalQty,
        receivedParts,
        remainingParts,
        receivedDate: latestItem.date.split("T")[0],
        receivedShift: latestItem.shiftTime,
        batch: latestItem.detailBox.batch,
        color: latestItem.detailBox.color,
        reason: latestItem.detailBox.reason,
        allocationStatus,
        lastUpdated: latestItem.updatedAt,
      });
    });

    return aggregatedTickets;
  } catch (error) {
    console.error("Error fetching and aggregating backend ORT data:", error);
    toast({
      variant: "destructive",
      title: "Backend Connection Failed",
      description: "Unable to fetch data from backend server",
      duration: 3000,
    });
    return [];
  }
};

const fetchBackendAllocations = async (): Promise<SavedAllocation[]> => {
  try {
    const response = await backendApi.get("/allocations");
    const data: BackendAllocationsResponse = response.data;
    return Array.isArray(data.allocations) ? data.allocations : [];
  } catch (error) {
    console.error("Error fetching backend allocations:", error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

const fetchAllocationByTicketCode = async (ticketCode: string): Promise<SavedAllocation | null> => {
  try {
    const response = await backendApi.get(`/allocations/${ticketCode}`);
    const data: { allocation: SavedAllocation } = response.data;
    return data.allocation || null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.error("Error fetching allocation by ticket code:", error);
    throw error;
  }
};

const saveAllocationToBackend = async (allocation: TicketAllocationData): Promise<SavedAllocation> => {
  try {
    const allocationWithId = {
      ...allocation,
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await backendApi.post<BackendAllocationResponse>(
      "/allocations",
      allocationWithId,
    );

    toast({
      variant: "success",
      title: "Allocation Saved",
      description: `Allocation saved for ticket ${allocation.ticketCode}`,
      duration: 2000,
    });

    return response.data.allocation;
  } catch (error) {
    console.error("Failed to save allocation to backend:", error);
    toast({
      variant: "destructive",
      title: "Save Failed",
      description: "Failed to save allocation to backend",
      duration: 2000,
    });
    throw error;
  }
};

const updateAllocationInBackend = async (allocation: TicketAllocationData): Promise<SavedAllocation> => {
  try {
    const response = await backendApi.put<BackendAllocationResponse>(
      `/allocations/${allocation.ticketCode}`,
      {
        ...allocation,
        updatedAt: new Date().toISOString(),
      },
    );

    toast({
      variant: "success",
      title: "Allocation Updated",
      description: `Allocation updated for ticket ${allocation.ticketCode}`,
      duration: 2000,
    });

    return response.data.allocation;
  } catch (error) {
    console.error("Failed to update allocation in backend:", error);
    toast({
      variant: "destructive",
      title: "Update Failed",
      description: "Failed to update allocation",
      duration: 2000,
    });
    throw error;
  }
};

const deleteAllocationFromBackend = async (ticketCode: string): Promise<void> => {
  try {
    await backendApi.delete(`/allocations/${ticketCode}`);
    toast({
      variant: "success",
      title: "Allocation Deleted",
      description: `Allocation removed for ticket ${ticketCode}`,
      duration: 2000,
    });
  } catch (error) {
    console.error("Failed to delete allocation from backend:", error);
    toast({
      variant: "destructive",
      title: "Delete Failed",
      description: "Failed to delete allocation",
      duration: 2000,
    });
    throw error;
  }
};

// ========== HELPER FUNCTIONS ==========

const combineMachineLists = (machine1: string, machine2: string): string => {
  const machines = [];
  if (machine1) machines.push(machine1);
  if (machine2) machines.push(machine2);
  return [...new Set(machines)].filter(Boolean).join(" + ");
};

const getCombinedDuration = (time: string | number): string => {
  if (!time) return "";
  const timeStr = typeof time === "string" ? time : String(time);
  const match = timeStr.match(/(\d+(?:\.\d+)?)\s*(hr|hour|h)?/i);
  if (match) {
    const value = match[1];
    const unit = match[2]?.toLowerCase() || "hr";
    return `${value} ${unit}`;
  }
  return timeStr;
};

const extractNumericQty = (qtyString: string): number => {
  if (!qtyString) return 0;
  const match = qtyString.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const convertAggregatedToStage1Record = (aggregatedData: AggregatedTicketData[]): Stage1Record[] => {
  return aggregatedData.map((item, index) => ({
    id: index + 1,
    ticketCode: item.ticketCode,
    sessionId: "",
    sessionNumber: 0,
    date: item.receivedDate,
    detailsBox: {
      totalQuantity: item.totalQuantity,
      ticketCodeRaised: item.ticketCode,
      dateShiftTime: `${item.receivedDate} ${item.receivedShift}`,
      project: item.project,
      assemblyOQCAno: item.stage,
      batch: item.batch,
      color: item.color,
      reason: item.reason,
    },
    inventoryRemarks: "",
    movedToStage2: false,
    partNumbers: [],
    partsBeingSent: item.receivedParts,
    received: item.receivedParts > 0 ? "Received" : "Not Received",
    shiftTime: item.receivedShift,
    stage2Enabled: false,
    status: "Pending",
    totalQuantity: item.totalQuantity,
  }));
};

const formatTestNameForDisplay = (testName: string) => {
  if (testName.includes("||child")) {
    const [parentName, childPart] = testName.split("||child");
    const childIndex = parseInt(childPart, 10);
    if (!isNaN(childIndex) && parentName.includes("+")) {
      const parts = parentName.split("+").map((s) => s.trim());
      if (childIndex < parts.length) {
        return parts[childIndex];
      }
    }
    return `${parentName} | child ${childPart}`;
  }
  return testName;
};

// ========== MAIN COMPONENT ==========

const TicketViewPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Stage1Record[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedTicketData[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Stage1Record[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Stage1Record | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationData, setAllocationData] = useState<TicketAllocationData | null>(null);
  const [savedAllocations, setSavedAllocations] = useState<SavedAllocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAnoType, setFilterAnoType] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [editingTest, setEditingTest] = useState<TestAllocation | null>(null);
  const [editingChildTest, setEditingChildTest] = useState<{
    childTest: TestAllocation["childTests"][0];
    parentTestId: string;
    childIndex: number;
  } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddTestDialog, setShowAddTestDialog] = useState(false);
  const [showAllAllocationsDialog, setShowAllAllocationsDialog] = useState(false);
  const [masterTestConfigs, setMasterTestConfigs] = useState<TestConfiguration[]>([]);
  const [masterSheetData, setMasterSheetData] = useState<any[]>([]);
  const [loadingMasterSheet, setLoadingMasterSheet] = useState(false);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [newTestData, setNewTestData] = useState({
    testName: "",
    requiredQty: 0,
    testCondition: "",
    checkPoints: "",
    specification: "",
    machineEquipment: "",
    machineEquipment2: "",
    time: "",
    location: "",
    unit: "",
    allocatedParts: "",
  });
  const [sopLinks, setSopLinks] = useState<{ [key: number]: string }>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showProcessStageEditor, setShowProcessStageEditor] = useState(false);
  const [editingProcessStage, setEditingProcessStage] = useState<string>('');
  const virtualTicketIdRef = useRef(-1);

  const normalizeTicketCode = (value?: string | null): string =>
    typeof value === "string" ? value.trim().toUpperCase() : "";

  const parseNumeric = (value: unknown): number => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const summarizeAllocation = (allocation: SavedAllocation) => {
    const tests = Array.isArray(allocation.testAllocations) ? allocation.testAllocations : [];

    const totalPlanned = tests.reduce((sum, test) => sum + parseNumeric(test.allocatedParts), 0);
    const totalRemainingFromTests = tests.reduce((sum, test) => sum + parseNumeric(test.remainingParts), 0);

    const totalQuantity = allocation.totalQuantity !== undefined && allocation.totalQuantity !== null
      ? parseNumeric(allocation.totalQuantity)
      : totalPlanned > 0 ? totalPlanned : parseNumeric(allocation.totalRemainingParts);

    const totalRemaining = allocation.totalRemainingParts !== undefined && allocation.totalRemainingParts !== null
      ? parseNumeric(allocation.totalRemainingParts)
      : totalRemainingFromTests;

    return { totalPlanned, totalRemaining, totalQuantity };
  };

  const getNextVirtualTicketId = (): number => {
    const id = virtualTicketIdRef.current;
    virtualTicketIdRef.current -= 1;
    return id;
  };

  const createVirtualTicketFromAllocation = (allocation: SavedAllocation): Stage1Record => {
    const summary = summarizeAllocation(allocation);
    const updatedAt = allocation.updatedAt ? new Date(allocation.updatedAt) : new Date();
    const dateString = updatedAt.toISOString().split("T")[0];
    const timeString = updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    const displayCode = (allocation.ticketCode || "").trim() || allocation.ticketCode || "";
    const effectiveTotalQuantity = summary.totalQuantity > 0 ? summary.totalQuantity : summary.totalPlanned;
    const partsBeingSent = Math.max(effectiveTotalQuantity - summary.totalRemaining, 0);

    return {
      id: getNextVirtualTicketId(),
      ticketCode: displayCode,
      sessionId: "ALLOC",
      sessionNumber: 0,
      date: dateString,
      detailsBox: {
        totalQuantity: effectiveTotalQuantity,
        ticketCodeRaised: displayCode,
        dateShiftTime: `${dateString} ${timeString}`,
        project: allocation.project || "",
        assemblyOQCAno: allocation.anoType || "",
        batch: allocation.build || "",
        color: allocation.colour || "",
        reason: allocation.reason || "",
      },
      inventoryRemarks: "Generated from saved allocation",
      movedToStage2: false,
      partNumbers: [],
      partsBeingSent,
      received: "Pending",
      shiftTime: timeString,
      stage2Enabled: false,
      status: "Saved Allocation",
      totalQuantity: effectiveTotalQuantity,
    };
  };

  const mergeTicketWithAllocation = (ticket: Stage1Record, allocation: SavedAllocation): Stage1Record => {
    const summary = summarizeAllocation(allocation);
    const effectiveTotalQuantity = summary.totalQuantity > 0 ? summary.totalQuantity : summary.totalPlanned;

    const updatedDetails = {
      ...ticket.detailsBox,
      totalQuantity: effectiveTotalQuantity || ticket.detailsBox.totalQuantity || 0,
      project: allocation.project || ticket.detailsBox.project,
      assemblyOQCAno: allocation.anoType || ticket.detailsBox.assemblyOQCAno,
      batch: allocation.build || ticket.detailsBox.batch,
      color: allocation.colour || ticket.detailsBox.color,
      reason: allocation.reason || ticket.detailsBox.reason,
      ticketCodeRaised: ticket.detailsBox.ticketCodeRaised || allocation.ticketCode || ticket.ticketCode,
    };

    const partsBeingSent = effectiveTotalQuantity > 0
      ? Math.max(effectiveTotalQuantity - summary.totalRemaining, 0)
      : ticket.partsBeingSent;
    const totalQuantity = effectiveTotalQuantity > 0
      ? effectiveTotalQuantity
      : ticket.totalQuantity || updatedDetails.totalQuantity;

    const isUnchanged =
      ticket.partsBeingSent === partsBeingSent &&
      ticket.totalQuantity === totalQuantity &&
      ticket.detailsBox.totalQuantity === updatedDetails.totalQuantity &&
      ticket.detailsBox.project === updatedDetails.project &&
      ticket.detailsBox.assemblyOQCAno === updatedDetails.assemblyOQCAno &&
      ticket.detailsBox.batch === updatedDetails.batch &&
      ticket.detailsBox.color === updatedDetails.color &&
      ticket.detailsBox.reason === updatedDetails.reason &&
      ticket.detailsBox.ticketCodeRaised === updatedDetails.ticketCodeRaised;

    if (isUnchanged) return ticket;

    return { ...ticket, partsBeingSent, totalQuantity, detailsBox: updatedDetails };
  };

  useEffect(() => {
    loadBackendData();
    loadSavedAllocations();
    loadMasterExcelSheet();
  }, []);

  useEffect(() => {
    setTickets((prevTickets) => {
      if (savedAllocations.length === 0) {
        const filtered = prevTickets.filter((ticket) => ticket.sessionId !== "ALLOC");
        return filtered.length === prevTickets.length ? prevTickets : filtered;
      }

      const allocationMap = new Map<string, SavedAllocation>();
      savedAllocations.forEach((allocation) => {
        const normalized = normalizeTicketCode(allocation.ticketCode);
        if (!normalized) return;

        const existing = allocationMap.get(normalized);
        if (!existing) {
          allocationMap.set(normalized, allocation);
          return;
        }

        const existingTs = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const candidateTs = allocation.updatedAt ? new Date(allocation.updatedAt).getTime() : 0;
        if (candidateTs > existingTs) allocationMap.set(normalized, allocation);
      });

      if (allocationMap.size === 0) {
        const filtered = prevTickets.filter((ticket) => ticket.sessionId !== "ALLOC");
        return filtered.length === prevTickets.length ? prevTickets : filtered;
      }

      let mutated = false;

      const updatedExisting = prevTickets.map((ticket) => {
        const normalizedTicket = normalizeTicketCode(ticket.ticketCode);
        const allocation = allocationMap.get(normalizedTicket);
        if (!allocation) return ticket;
        const merged = mergeTicketWithAllocation(ticket, allocation);
        if (merged !== ticket) mutated = true;
        return merged;
      });

      const allocationCodes = new Set(allocationMap.keys());
      const filteredTickets = updatedExisting.filter((ticket) => {
        if (ticket.sessionId === "ALLOC") {
          const normalizedTicket = normalizeTicketCode(ticket.ticketCode);
          if (!allocationCodes.has(normalizedTicket)) {
            mutated = true;
            return false;
          }
        }
        return true;
      });

      const existingCodes = new Set(filteredTickets.map((ticket) => normalizeTicketCode(ticket.ticketCode)));
      const newTickets: Stage1Record[] = [];
      allocationMap.forEach((allocation, code) => {
        if (!existingCodes.has(code)) {
          mutated = true;
          newTickets.push(createVirtualTicketFromAllocation(allocation));
        }
      });

      if (!mutated && newTickets.length === 0) return prevTickets;
      return [...filteredTickets, ...newTickets];
    });
  }, [savedAllocations]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterAnoType, filterProject, tickets]);

  const loadBackendData = async () => {
    setLoadingBackend(true);
    try {
      const aggregatedORTData = await fetchAndAggregateBackendORTData();
      setAggregatedData(aggregatedORTData);
      const convertedTickets = convertAggregatedToStage1Record(aggregatedORTData);
      setTickets(convertedTickets);
      setFilteredTickets(convertedTickets);

      if (aggregatedORTData.length > 0) {
        toast({
          variant: "success",
          title: "Backend Data Loaded",
          description: `Loaded ${aggregatedORTData.length} tickets from backend`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Failed to load backend data:", error);
      toast({
        variant: "destructive",
        title: "Backend Connection Failed",
        description: "Unable to fetch data from backend server",
        duration: 2000,
      });
    } finally {
      setLoadingBackend(false);
    }
  };

  const loadSavedAllocations = async () => {
    try {
      const allocations = await fetchBackendAllocations();
      setSavedAllocations(allocations);
    } catch (error) {
      console.error("Failed to load allocations:", error);
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        toast({
          variant: "destructive",
          title: "Failed to Load Allocations",
          description: "Could not load allocations from backend",
          duration: 2000,
        });
      }
    }
  };

  // ← UPDATED: loadMasterExcelSheet now also loads OQC_Form sheet
  const loadMasterExcelSheet = async () => {
    setLoadingMasterSheet(true);
    try {
      const arrayBuffer = await fetchMasterSheetArrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // Load Test Allocation sheet (existing logic)
      const firstSheetName = "Test Allocation";
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: ExcelTestConfiguration[] = XLSX.utils.sheet_to_json(worksheet);

      setMasterSheetData(jsonData);

      // ← ADDED: Load OQC_Form sheet for valid ANO types
      let oqcFormData: any[] = [];
      const oqcFormSheet = workbook.Sheets["OQC_Form"];
      if (oqcFormSheet) {
        oqcFormData = XLSX.utils.sheet_to_json(oqcFormSheet);
        console.log('OQC_Form ANO types loaded:', oqcFormData);
      } else {
        console.warn('OQC_Form sheet not found in workbook. Available sheets:', workbook.SheetNames);
      }

      // ← UPDATED: Pass oqcFormData to service initialization
      await dynamicProcessStageService.initializeFromMasterSheet(jsonData, oqcFormData);

      const uniqueTests = new Map<string, ExcelTestConfiguration[]>();
      jsonData.forEach((row: ExcelTestConfiguration) => {
        const product = row["Product"]?.toString().trim() || "";
        const processStage = row["Processes Stage"]?.toString().trim() || "";
        const mpNpi = row["MP/NPI"]?.toString().trim() || "";
        const testName = row["Test Name"]?.toString().trim() || "";
        if (!processStage || !testName) return;
        const key = `${product}||${processStage}||${mpNpi}||${testName}`;
        if (!uniqueTests.has(key)) uniqueTests.set(key, []);
        uniqueTests.get(key)!.push(row);
      });

      const testConfigs: TestConfiguration[] = [];
      uniqueTests.forEach((rows, key) => {
        const [product, processStage, mpNpi, testName] = key.split("||");
        if (rows.length === 1) {
          const row = rows[0];
          const qtyString = row["Qty"]?.toString() || "";
          const qtyMatch = qtyString.match(/\d+/);
          const numericQty = qtyMatch ? qtyMatch[0] : "0";

          testConfigs.push({
            product,
            processStage,
            mpNpi,
            testName,
            testCondition: row["Test Condition"]?.toString().trim() || "",
            checkPoints: row["Checkpoints"]?.toString().trim() || "",
            qty: numericQty,
            specification: row["Specification"]?.toString().trim() || "",
            machineEquipment: row["Machine / Equipment"]?.toString().trim() || "",
            machineEquipment2: row["Machine / Equipment-2"]?.toString().trim() || "",
            time: row["Time"]?.toString().trim() || "",
            location: row["Location"]?.toString().trim() || "",
            unit: row["Unit"]?.toString().trim() || "",
          });
        } else {
          const firstRow = rows[0];
          const qtyString = firstRow["Qty"]?.toString() || "";
          const qtyMatch = qtyString.match(/\d+/);
          const numericQty = qtyMatch ? qtyMatch[0] : "0";

          testConfigs.push({
            product,
            processStage,
            mpNpi,
            testName,
            testCondition: firstRow["Test Condition"]?.toString().trim() || "",
            checkPoints: firstRow["Checkpoints"]?.toString().trim() || "",
            qty: numericQty,
            specification: firstRow["Specification"]?.toString().trim() || "",
            machineEquipment: testName,
            machineEquipment2: "",
            time: "",
            location: "",
            unit: "",
          });

          rows.forEach((row, index) => {
            const eq1 = row["Machine / Equipment"]?.toString().trim() || "";
            const eq2 = row["Machine / Equipment-2"]?.toString().trim() || "";
            const equipment = eq2 || eq1;
            if (equipment) {
              testConfigs.push({
                product,
                processStage,
                mpNpi,
                testName: `${testName}||child${index}`,
                testCondition: row["Test Condition"]?.toString().trim() || "",
                checkPoints: row["Checkpoints"]?.toString().trim() || "",
                qty: numericQty,
                specification: row["Specification"]?.toString().trim() || "",
                machineEquipment: equipment,
                machineEquipment2: "",
                time: row["Time"]?.toString().trim() || "",
                location: row["Location"]?.toString().trim() || "",
                unit: row["Unit"]?.toString().trim() || "",
              });
            }
          });
        }
      });

      setMasterTestConfigs(testConfigs);

      toast({
        variant: "success",
        title: "Master Sheet Loaded",
        description: `Loaded ${testConfigs.length} test configurations${oqcFormData.length > 0 ? ` | ${oqcFormData.length} ANO types from OQC_Form` : ''}`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to load master Excel sheet:", error);
      toast({
        variant: "destructive",
        title: "Master Sheet Load Failed",
        description: `Failed to load master test configuration sheet: ${error}`,
        duration: 3000,
      });
    } finally {
      setLoadingMasterSheet(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];
    if (searchTerm) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.detailsBox.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.detailsBox.assemblyOQCAno.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (filterAnoType !== "all") {
      filtered = filtered.filter((ticket) => ticket.detailsBox.assemblyOQCAno === filterAnoType);
    }
    if (filterProject !== "all") {
      filtered = filtered.filter((ticket) => ticket.detailsBox.project === filterProject);
    }
    setFilteredTickets(filtered);
  };

  const findMatchingProcessStageDynamic = useCallback(
    (ticket: Stage1Record): ProcessStageComponents | null => {
      if (masterSheetData.length === 0) {
        console.warn("Master sheet not loaded");
        return null;
      }

      let ticketType = ticket.detailsBox?.assemblyOQCAno || "";
      let ticketProject = ticket.detailsBox?.project || "";
      let ticketReason = ticket.detailsBox?.reason || "";

      // Fallback: Extract from ticket code if detailsBox values are missing
      // Ticket code format: XXXX_XXX_X_X_XXX_XX_XXX
      // Example: 0003_ASC_B_S_ASY_MQ_030
      if ((!ticketProject || !ticketReason) && ticket.ticketCode) {
        const parts = ticket.ticketCode.split("_");
        // parts[1] = project (ASC), parts[4] = type (ASY), parts[5] = reason (MQ)
        if (parts.length >= 6) {
          if (!ticketProject && parts[1]) {
            // Map abbreviations to full names
            const projectMap: Record<string, string> = {
              ASC: "ASCEND",
              FLS: "FLASH",
              HLK: "HULK",
              // Add more mappings as needed
            };
            ticketProject = projectMap[parts[1].toUpperCase()] || parts[1];
          }
          if (!ticketType && parts[4]) {
            const typeMap: Record<string, string> = {
              ASY: "ASSEMBLY",
              ANO: "ANODIZE",
              PAS: "PASS",
              // Add more mappings as needed
            };
            ticketType = typeMap[parts[4].toUpperCase()] || parts[4];
          }
          if (!ticketReason && parts[5]) {
            const reasonMap: Record<string, string> = {
              MQ: "Machine Qualification",
              MP: "Manufacturing Process",
              NPI: "New Product Introduction",
              // Add more mappings as needed
            };
            ticketReason = reasonMap[parts[5].toUpperCase()] || parts[5];
          }
        }
      }

      // Log the extracted values for debugging
      console.log(`[Matching] Ticket ${ticket.ticketCode}: type='${ticketType}', project='${ticketProject}', reason='${ticketReason}'`);

      // Validate that we have at least project and reason
      if (!ticketProject && !ticketReason) {
        console.error(`[Matching ERROR] Missing required fields for ticket ${ticket.ticketCode}. DetailBox:`, ticket.detailsBox);
        return null;
      }

      const result = dynamicProcessStageService.matchTicketToProcessStage(
        ticketType,
        ticketProject,
        ticketReason
      );

      if (result.matched) {
        console.log(`[Matching SUCCESS] Dynamic match found (${result.matchType}, confidence: ${result.confidence}%):`, result.matchedStage);
        return result.matchedStage;
      }

      console.warn(`[Matching FAILED] No dynamic match found for ticket:`, {
        code: ticket.ticketCode,
        type: ticketType,
        project: ticketProject,
        reason: ticketReason,
        allStages: dynamicProcessStageService.getAllProcessStages?.().map((s) => s.fullString),
      });
      return null;
    },
    [masterSheetData]
  );

  const calculateTestAllocations = useCallback(
    (ticket: Stage1Record): TicketAllocationData | null => {
      if (masterTestConfigs.length === 0) {
        toast({
          variant: "destructive",
          title: "Master Sheet Not Loaded",
          description: "Please wait for master sheet to load",
          duration: 2000,
        });
        return null;
      }

      console.log("=== CALCULATING ALLOCATION FOR TICKET ===");
      console.log("Ticket:", {
        code: ticket.ticketCode,
        anoType: ticket.detailsBox.assemblyOQCAno,
        project: ticket.detailsBox.project,
        reason: ticket.detailsBox.reason,
        quantity: ticket.totalQuantity || ticket.partsBeingSent,
      });

      // Extract product (W/B), stage, and MP/NPI from ticket
      const ticketCodeParts = ticket.ticketCode.split("_");
      const ticketProduct = (ticketCodeParts[2] || "").toUpperCase(); // e.g. "W" or "B"
      const ticketStage = (ticket.detailsBox?.assemblyOQCAno || "").trim(); // e.g. "Ano", "Assembly"
      const ticketMpNpi = (ticket.detailsBox?.reason || "").trim(); // e.g. "NPI", "MP", "HIP"

      console.log(`[Matching] Ticket ${ticket.ticketCode}: product='${ticketProduct}', stage='${ticketStage}', MP/NPI='${ticketMpNpi}'`);

      // Direct match: product + stage + MP/NPI (all three)
      let parentConfigs = masterTestConfigs.filter(
        (config) =>
          !config.testName.includes("||child") &&
          config.product.toUpperCase() === ticketProduct &&
          config.processStage.toLowerCase() === ticketStage.toLowerCase() &&
          config.mpNpi.toLowerCase() === ticketMpNpi.toLowerCase(),
      );

      // Fallback 1: stage + MP/NPI only (ignore product column if not filled)
      if (parentConfigs.length === 0) {
        parentConfigs = masterTestConfigs.filter(
          (config) =>
            !config.testName.includes("||child") &&
            config.processStage.toLowerCase() === ticketStage.toLowerCase() &&
            (config.mpNpi.toLowerCase() === ticketMpNpi.toLowerCase() || !config.mpNpi),
        );
      }

      // Fallback 2: stage only (keep existing DynamicProcessStageService as last resort)
      if (parentConfigs.length === 0) {
        const matchingStage = findMatchingProcessStageDynamic(ticket);
        if (matchingStage) {
          parentConfigs = masterTestConfigs.filter(
            (config) =>
              config.processStage === matchingStage.fullString &&
              !config.testName.includes("||child"),
          );
        }
      }

      if (parentConfigs.length === 0) {
        console.error("No matching test configs found for ticket:", ticket.ticketCode);
        toast({
          variant: "destructive",
          title: "No Tests Found",
          description: `No test configurations found for: Product=${ticketProduct}, Stage=${ticketStage}, MP/NPI=${ticketMpNpi}`,
          duration: 3000,
        });
        return null;
      }

      const matchingStageLabel = `${ticketProduct} / ${ticketStage} / ${ticketMpNpi}`;
      console.log(`[Matching] Matched ${parentConfigs.length} test configs for ${matchingStageLabel}`);

      const allTestNames = Array.from(new Set(parentConfigs.map((config) => config.testName)));

      if (allTestNames.length === 0) {
        toast({
          variant: "destructive",
          title: "No Tests Found",
          description: `No test configurations found for: ${matchingStageLabel}`,
          duration: 2000,
        });
        return null;
      }

      const totalAvailableParts = ticket.totalQuantity || ticket.partsBeingSent || 0;
      const selectedTests = allTestNames;

      const selectedConfigs = parentConfigs.filter((config) => selectedTests.includes(config.testName));
      const totalRequiredQty = selectedConfigs.reduce((sum, config) => sum + extractNumericQty(config.qty), 0);

      const allocations: TestAllocation[] = [];

      selectedConfigs.forEach((config, index) => {
        const numericQty = extractNumericQty(config.qty);
        const proportion = totalRequiredQty > 0 ? numericQty / totalRequiredQty : 0;
        const allocatedPartsRaw = proportion * totalAvailableParts;
        let allocatedParts = Math.round(allocatedPartsRaw);

        const childConfigs = masterTestConfigs.filter(
          (child) =>
            child.processStage === config.processStage &&
            child.testName.startsWith(`${config.testName}||child`),
        );

        const testAllocation: TestAllocation = {
          id: `test-${Date.now()}-${index}`,
          testName: config.testName,
          allocatedParts: allocatedParts,
          completedParts: 0,
          remainingParts: allocatedParts,
          requiredQty: numericQty,
          testCondition: config.testCondition,
          checkPoints: config.checkPoints,
          specification: config.specification,
          machineEquipment: config.machineEquipment,
          machineEquipment2: config.machineEquipment2,
          time: String(config.time),
          location: config.location,
          unit: config.unit,
          status: 1,
          isExpanded: false,
        };

        if (childConfigs.length > 0) {
          testAllocation.childTests = childConfigs.map((child, childIndex) => ({
            id: `child-${Date.now()}-${index}-${childIndex}`,
            testName: config.testName,
            subTestName: child.machineEquipment || config.testName,
            testCondition: child.testCondition || config.testCondition,
            checkPoints: child.checkPoints || config.checkPoints,
            specification: child.specification || config.specification,
            machineEquipment: child.machineEquipment,
            machineEquipment2: child.machineEquipment2,
            time: String(child.time),
            location: child.location,
            unit: child.unit,
            allocatedParts: allocatedParts,
            completedParts: 0,
            remainingParts: allocatedParts,
          }));
        }

        allocations.push(testAllocation);
      });

      let totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocatedParts, 0);
      let difference = totalAvailableParts - totalAllocated;

      if (difference !== 0) {
        const allocationsWithConfigs = allocations.map((alloc, index) => ({
          allocation: alloc,
          config: selectedConfigs[index],
        }));

        allocationsWithConfigs.sort((a, b) => {
          const numericQtyA = extractNumericQty(a.config.qty);
          const numericQtyB = extractNumericQty(b.config.qty);
          const idealA = (numericQtyA / totalRequiredQty) * totalAvailableParts;
          const idealB = (numericQtyB / totalRequiredQty) * totalAvailableParts;
          const errorA = Math.abs(idealA - a.allocation.allocatedParts);
          const errorB = Math.abs(idealB - b.allocation.allocatedParts);
          return errorB - errorA;
        });

        if (difference > 0) {
          let idx = 0;
          while (difference > 0) {
            const target = allocationsWithConfigs[idx % allocationsWithConfigs.length];
            target.allocation.allocatedParts += 1;
            target.allocation.remainingParts += 1;
            if (target.allocation.childTests) {
              target.allocation.childTests.forEach((child) => {
                child.allocatedParts += 1;
                child.remainingParts += 1;
              });
            }
            difference -= 1;
            idx++;
          }
        } else {
          let idx = 0;
          while (difference < 0) {
            const target = allocationsWithConfigs[idx % allocationsWithConfigs.length];
            if (target.allocation.allocatedParts > 0) {
              target.allocation.allocatedParts -= 1;
              target.allocation.remainingParts -= 1;
              if (target.allocation.childTests) {
                target.allocation.childTests.forEach((child) => {
                  child.allocatedParts = Math.max(0, child.allocatedParts - 1);
                  child.remainingParts = Math.max(0, child.remainingParts - 1);
                });
              }
              difference += 1;
            }
            idx++;
          }
        }
      }

      const finalAllocated = allocations.reduce((sum, test) => sum + test.allocatedParts, 0);
      if (finalAllocated === 0 && totalAvailableParts > 0 && allocations.length > 0) {
        const firstTest = allocations[0];
        firstTest.allocatedParts = 1;
        firstTest.remainingParts = 1;
        if (firstTest.childTests && firstTest.childTests.length > 0) {
          firstTest.childTests[0].allocatedParts = 1;
          firstTest.childTests[0].remainingParts = 1;
        }
      }

      const totalRemainingParts = allocations.reduce((sum, test) => sum + test.remainingParts, 0);

      return {
        ticketCode: ticket.ticketCode,
        totalQuantity: totalAvailableParts,
        location: "In-house",
        unit: "",
        project: ticket.detailsBox.project,
        anoType: ticket.detailsBox.assemblyOQCAno,
        build: ticket.detailsBox.batch,
        colour: ticket.detailsBox.color,
        testAllocations: allocations,
        processStage: matchingStageLabel,
        reason: ticket.detailsBox.reason,
        totalRemainingParts,
        matchedProcessStage: matchingStageLabel,
      };
    },
    [masterTestConfigs, findMatchingProcessStageDynamic]
  );

  const handleTestNameClick = (testId: string, test: TestAllocation) => {
    const hasMultipleEquipmentInTest = test.machineEquipment?.includes("+") || test.machineEquipment2?.includes("+");
    const hasChildren = test.childTests && test.childTests.length > 0;

    if (!hasMultipleEquipmentInTest && !hasChildren) return;

    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(testId)) {
      newExpandedRows.delete(testId);
    } else {
      newExpandedRows.clear();
      newExpandedRows.add(testId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleViewAllocation = async (ticket: Stage1Record) => {
    setExpandedRows(new Set());

    try {
      const savedAllocation = await fetchAllocationByTicketCode(ticket.ticketCode);

      if (savedAllocation) {
        setAllocationData(savedAllocation);
        setSelectedTicket(ticket);
        setShowAllocationModal(true);
      } else {
        const allocation = calculateTestAllocations(ticket);
        if (allocation) {
          setAllocationData(allocation);
          setSelectedTicket(ticket);
          setShowAllocationModal(true);
        }
      }
    } catch (error) {
      console.error("Error fetching allocation:", error);
      const allocation = calculateTestAllocations(ticket);
      if (allocation) {
        setAllocationData(allocation);
        setSelectedTicket(ticket);
        setShowAllocationModal(true);
      }
    }
  };

  const handleEditProcessStage = (currentStage: string) => {
    setEditingProcessStage(currentStage);
    setShowProcessStageEditor(true);
  };

  const renderTestAllocationRows = () => {
    if (!allocationData || !allocationData.testAllocations || allocationData.testAllocations.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={10} className="text-center py-8 text-gray-500">
            No test allocations calculated. Please ensure master sheet is loaded and matches ticket criteria.
          </TableCell>
        </TableRow>
      );
    }

    const rows: JSX.Element[] = [];

    allocationData.testAllocations.forEach((test) => {
      const isExpanded = expandedRows.has(test.id);
      const totalDone = test.allocatedParts - test.remainingParts;
      const progressPercentage = test.allocatedParts > 0
        ? Math.max(0, Math.min(100, (totalDone / test.allocatedParts) * 100))
        : 0;

      const hasChildTests = test.childTests && test.childTests.length > 0;
      const hasMultipleEquipmentInTest = test.machineEquipment?.includes("+") || test.machineEquipment2?.includes("+");
      const shouldExpand = hasMultipleEquipmentInTest || hasChildTests;

      const combinedMachines = combineMachineLists(test.machineEquipment, test.machineEquipment2);
      const combinedDuration = getCombinedDuration(test.time);

      rows.push(
        <TableRow key={`parent-${test.id}`} className="hover:bg-gray-50">
          <TableCell className="font-medium">
            <div
              className={`flex items-center ${shouldExpand ? "cursor-pointer hover:text-blue-600" : ""}`}
              onClick={() => shouldExpand && handleTestNameClick(test.id, test)}
            >
              {shouldExpand && (isExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />)}
              {!shouldExpand && <div className="w-6"></div>}
              <span className="font-semibold">{formatTestNameForDisplay(test.testName)}</span>
            </div>
            {test.notes && <div className="text-xs text-gray-500 mt-1 ml-6">{test.notes}</div>}
          </TableCell>
          <TableCell>
            <div className="flex flex-col gap-1">
              <div className="font-bold text-xl text-blue-700">{test.allocatedParts}</div>
              <div className="text-xs text-gray-500">total planned</div>
              {test.loadedParts && test.loadedParts > 0 && (
                <div className="text-xs text-purple-600 font-medium">
                  ({test.loadedParts} loaded + {test.allocatedParts - test.loadedParts} new)
                </div>
              )}
              <div className="text-xs text-blue-600">
                {test.allocatedParts > 0 ? Math.round((test.allocatedParts / allocationData.totalQuantity) * 100) : 0}% of total
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-col gap-1">
              <div className={`font-bold text-xl ${test.remainingParts > 0 ? "text-green-700" : "text-gray-500"}`}>
                {test.remainingParts}
              </div>
              <div className="text-xs text-gray-500">remaining</div>
              <div className={`text-xs ${test.remainingParts > 0 ? "text-green-600" : "text-gray-500"}`}>
                {test.allocatedParts > 0 ? Math.round((test.remainingParts / test.allocatedParts) * 100) : 0}% remaining
              </div>
            </div>
          </TableCell>
          <TableCell className="text-sm">{test.testCondition || "—"}</TableCell>
          <TableCell className="text-sm">{test.checkPoints || "—"}</TableCell>
          <TableCell className="text-sm">{test.location || "—"}</TableCell>
          <TableCell className="text-sm">{combinedMachines || "—"}</TableCell>
          <TableCell className="text-sm">{combinedDuration || "—"}</TableCell>
          <TableCell>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Progress:</span>
                <span className="text-xs font-medium text-blue-600">
                  {totalDone}/{test.allocatedParts}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              <div className="text-xs text-gray-500 text-center">{progressPercentage.toFixed(1)}% scanned</div>
            </div>
            {test.completedParts > 0 && <div className="text-xs text-green-600">{test.completedParts} manually completed</div>}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              {test.location.toLowerCase().includes("out source") && test.remainingParts > 0 && (
                <Button variant="outline" size="sm" onClick={() => handleMarkAsCompleted(test.id)} className="h-8 w-8 p-0 text-green-600 hover:text-green-800" title="Mark as Completed">
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => handleEditTest(test)} className="h-8 w-8 p-0">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteTest(test.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-800">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );

      if (isExpanded && hasChildTests && test.childTests) {
        test.childTests.forEach((childTest, childIndex) => {
          const childScannedParts = childTest.allocatedParts - childTest.remainingParts;
          const childProgressPercentage = childTest.allocatedParts > 0
            ? Math.max(0, Math.min(100, (childScannedParts / childTest.allocatedParts) * 100))
            : 0;

          rows.push(
            <TableRow key={childTest.id} className="bg-gray-50 hover:bg-gray-100">
              <TableCell className="font-medium">
                <div className="flex items-center ml-6">
                  <div className="w-4 mr-2"></div>
                  <span className="text-gray-600">{childTest.subTestName}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-xl text-blue-700">{childTest.allocatedParts}</div>
                  <div className="text-xs text-gray-500">planned parts</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className={`font-bold text-xl ${childTest.remainingParts > 0 ? "text-green-700" : "text-gray-500"}`}>
                    {childTest.remainingParts}
                  </div>
                  <div className="text-xs text-gray-500">remaining</div>
                </div>
              </TableCell>
              <TableCell className="text-sm">{childTest.testCondition || "-"}</TableCell>
              <TableCell className="text-sm">{childTest.checkPoints || "-"}</TableCell>
              <TableCell className="text-sm">{childTest.location || "-"}</TableCell>
              <TableCell className="text-sm">{childTest.machineEquipment || "-"}</TableCell>
              <TableCell className="text-sm">{getCombinedDuration(childTest.time) || "-"}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Progress:</span>
                    <span className="text-xs font-medium text-blue-600">{childScannedParts}/{childTest.allocatedParts}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${childProgressPercentage}%` }}></div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditChildTest(childTest, test.id, childIndex)} className="h-8 w-8 p-0">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        });
      }
    });

    return rows;
  };

  const handleEditTest = (test: TestAllocation) => {
    setEditingTest(test);
    setEditingChildTest(null);
    setShowEditDialog(true);
  };

  const handleEditChildTest = (childTest: TestAllocation["childTests"][0], parentTestId: string, childIndex: number) => {
    setEditingChildTest({ childTest, parentTestId, childIndex });
    setEditingTest(null);
    setShowEditDialog(true);
  };

  const handleDeleteTest = (testId: string) => {
    if (allocationData) {
      const updatedTests = allocationData.testAllocations.filter((test) => test.id !== testId);
      const totalRemainingParts = updatedTests.reduce((sum, test) => sum + test.remainingParts, 0);
      setAllocationData({ ...allocationData, testAllocations: updatedTests, totalRemainingParts });
      toast({ variant: "success", title: "Test Deleted", description: "Test has been removed from allocation", duration: 2000 });
    }
  };

  const getStageMatchedConfigs = (data: typeof allocationData) => {
    if (!data) return [];
    const stage = (data.anoType || "").trim().toLowerCase();
    const reason = (data.reason || "").trim().toLowerCase();
    const product = (data.ticketCode || "").split("_")[2]?.toUpperCase() || "";

    // Mirror the same 3-tier matching used in calculateTestAllocations
    let matched = masterTestConfigs.filter(
      (c) =>
        c.product.toUpperCase() === product &&
        c.processStage.trim().toLowerCase() === stage &&
        c.mpNpi.trim().toLowerCase() === reason,
    );
    if (matched.length === 0) {
      matched = masterTestConfigs.filter(
        (c) =>
          c.processStage.trim().toLowerCase() === stage &&
          (c.mpNpi.trim().toLowerCase() === reason || !c.mpNpi),
      );
    }
    if (matched.length === 0) {
      matched = masterTestConfigs.filter((c) => c.processStage.trim().toLowerCase() === stage);
    }
    return matched;
  };

  const getFilteredAvailableTests = () => {
    if (!allocationData) return [];
    const stageTests = getStageMatchedConfigs(allocationData);
    const existingTestNames = new Set(
      allocationData.testAllocations.map((t) => t.testName),
    );
    // Show parent tests matching stage/product/reason that are not already
    // in the allocation. ||child rows are excluded — they're added automatically
    // when the parent is selected in handleAddNewTest.
    return stageTests.filter(
      (test) =>
        !test.testName.includes("||child") &&
        !existingTestNames.has(test.testName),
    );
  };

  const handleTestNameSelect = (testName: string) => {
    const stageTests = getStageMatchedConfigs(allocationData);
    const selectedTest = stageTests.find((test) => test.testName === testName);
    if (selectedTest) {
      const requiredQty = extractNumericQty(selectedTest.qty);
      setNewTestData({
        testName: selectedTest.testName,
        requiredQty: requiredQty,
        testCondition: selectedTest.testCondition,
        checkPoints: selectedTest.checkPoints,
        specification: selectedTest.specification,
        machineEquipment: selectedTest.machineEquipment,
        machineEquipment2: selectedTest.machineEquipment2,
        time: String(selectedTest.time),
        location: selectedTest.location,
        unit: selectedTest.unit,
        allocatedParts: "",
      });
    }
  };

  const handleAddNewTest = () => {
    if (allocationData && newTestData.testName && newTestData.requiredQty > 0) {
      const testExists = allocationData.testAllocations.some((test) => test.testName === newTestData.testName);
      if (testExists) {
        toast({ variant: "destructive", title: "Duplicate Test", description: "This test is already in the allocation", duration: 2000 });
        return;
      }

      // Build child tests for combined tests (e.g. "Foot Chemical + UTM" → Temp & Humidity + UTM children)
      const stageTests = getStageMatchedConfigs(allocationData);
      const childConfigs = stageTests.filter((t) =>
        t.testName.startsWith(newTestData.testName + "||child"),
      );
      const childTests = childConfigs.map((child, idx) => ({
        id: `child-${Date.now()}-${idx}`,
        testName: newTestData.testName,
        subTestName: child.machineEquipment,
        machineEquipment: child.machineEquipment,
        machineEquipment2: child.machineEquipment2 || "",
        testCondition: child.testCondition,
        checkPoints: child.checkPoints,
        specification: child.specification,
        time: child.time,
        unit: child.unit,
        location: child.location,
        allocatedParts: 0,
        completedParts: 0,
        remainingParts: 0,
      }));

      const newTest: TestAllocation = {
        id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        testName: newTestData.testName,
        allocatedParts: 0,
        remainingParts: 0,
        completedParts: 0,
        requiredQty: newTestData.requiredQty,
        testCondition: newTestData.testCondition,
        checkPoints: newTestData.checkPoints,
        specification: newTestData.specification,
        machineEquipment: newTestData.machineEquipment,
        machineEquipment2: newTestData.machineEquipment2,
        time: newTestData.time,
        location: newTestData.location,
        unit: newTestData.unit,
        status: parseInt(newTestData.allocatedParts) || 0,
        isExpanded: false,
        childTests: childTests.length > 0 ? childTests : [],
      };

      const updatedTests = [...allocationData.testAllocations, newTest];
      const totalRequiredQty = updatedTests.reduce((sum, test) => sum + test.requiredQty, 0);

      updatedTests.forEach((test) => {
        const proportion = test.requiredQty / totalRequiredQty;
        const allocatedPartsRaw = proportion * allocationData.totalQuantity;
        const allocatedParts = Math.max(1, Math.round(allocatedPartsRaw));
        test.allocatedParts = allocatedParts;
        test.remainingParts = allocatedParts;
      });

      let totalAllocated = updatedTests.reduce((sum, test) => sum + test.allocatedParts, 0);
      let difference = allocationData.totalQuantity - totalAllocated;

      if (difference !== 0) {
        const sortedTests = [...updatedTests].sort((a, b) => {
          const errorA = Math.abs((a.requiredQty / totalRequiredQty) * allocationData.totalQuantity - a.allocatedParts);
          const errorB = Math.abs((b.requiredQty / totalRequiredQty) * allocationData.totalQuantity - b.allocatedParts);
          return errorB - errorA;
        });

        if (difference > 0) {
          let index = 0;
          while (difference > 0) {
            sortedTests[index].allocatedParts += 1;
            sortedTests[index].remainingParts += 1;
            difference -= 1;
            index = (index + 1) % sortedTests.length;
          }
        } else {
          let index = 0;
          while (difference < 0) {
            if (sortedTests[index].allocatedParts > 1) {
              sortedTests[index].allocatedParts -= 1;
              sortedTests[index].remainingParts -= 1;
              difference += 1;
            }
            index = (index + 1) % sortedTests.length;
          }
        }
      }

      const totalRemainingParts = updatedTests.reduce((sum, test) => sum + test.remainingParts, 0);
      setAllocationData({ ...allocationData, testAllocations: updatedTests, totalRemainingParts });
      setNewTestData({
        testName: "", requiredQty: 0, testCondition: "", checkPoints: "", specification: "",
        machineEquipment: "", machineEquipment2: "", time: "", location: "", unit: "", allocatedParts: "",
      });
      setShowAddTestDialog(false);
      toast({ variant: "success", title: "New Test Added", description: `${newTest.testName} added successfully`, duration: 2000 });
    }
  };

  const handleUpdateTest = (updatedTest: TestAllocation) => {
    if (allocationData) {
      const originalTest = allocationData.testAllocations.find((test) => test.id === updatedTest.id);
      if (!originalTest) return;

      const loadedParts = originalTest.loadedParts || 0;
      const scannedParts = originalTest.allocatedParts - originalTest.remainingParts;
      const totalLoadedParts = loadedParts + scannedParts;
      const otherTestsAllocated = allocationData.testAllocations
        .filter((test) => test.id !== updatedTest.id)
        .reduce((sum, test) => sum + test.allocatedParts, 0);

      const newAllocatedForThisTest = updatedTest.allocatedParts;
      const totalPlannedForThisTest = newAllocatedForThisTest + totalLoadedParts;
      const newTotalAllocated = otherTestsAllocated + totalPlannedForThisTest;

      if (newTotalAllocated > allocationData.totalQuantity) {
        toast({
          variant: "destructive",
          title: "Cannot Update Allocation",
          description: `Total planned parts would be ${newTotalAllocated} (${newAllocatedForThisTest} new + ${totalLoadedParts} loaded), exceeding ticket total of ${allocationData.totalQuantity}.`,
          duration: 4000,
        });
        return;
      }

      const updatedTests = allocationData.testAllocations.map((test) => {
        if (test.id === updatedTest.id) {
          const newRemainingParts = newAllocatedForThisTest;
          return { ...updatedTest, allocatedParts: totalPlannedForThisTest, remainingParts: newRemainingParts, loadedParts: totalLoadedParts };
        }
        return test;
      });

      const totalRemainingParts = updatedTests.reduce((sum, test) => sum + test.remainingParts, 0);
      const updatedTestFromArray = updatedTests.find((t) => t.id === updatedTest.id);
      if (updatedTestFromArray && updatedTest.childTests && updatedTest.childTests.length > 0) {
        updatedTestFromArray.childTests = updatedTest.childTests.map((child) => ({
          ...child,
          allocatedParts: updatedTestFromArray.allocatedParts,
          remainingParts: updatedTestFromArray.remainingParts,
          loadedParts: totalLoadedParts,
        }));
      }

      setAllocationData({ ...allocationData, testAllocations: updatedTests, totalRemainingParts });
      setShowEditDialog(false);
      setEditingTest(null);
      toast({ variant: "success", title: "Test Updated Successfully", duration: 4000 });
    }
  };

  const handleMarkAsCompleted = (testId: string) => {
    if (!allocationData) return;
    const test = allocationData.testAllocations.find((t) => t.id === testId);
    if (!test) return;

    const loadedParts = prompt(
      `Enter number of parts to mark as completed for "${test.testName}":\n\nTotal Allocated: ${test.allocatedParts}\nAlready Completed: ${test.completedParts || 0}\nCurrently Remaining: ${test.remainingParts}`,
      "0"
    );
    if (!loadedParts) return;

    const partsToComplete = parseInt(loadedParts);
    if (isNaN(partsToComplete) || partsToComplete <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a positive number", duration: 2000 });
      return;
    }
    if (partsToComplete > test.remainingParts) {
      toast({ variant: "destructive", title: "Too Many Parts", description: `Cannot complete ${partsToComplete} parts. Only ${test.remainingParts} remaining.`, duration: 2000 });
      return;
    }

    const updatedTests = allocationData.testAllocations.map((t) => {
      if (t.id === testId) {
        return { ...t, completedParts: (t.completedParts || 0) + partsToComplete, remainingParts: t.remainingParts - partsToComplete };
      }
      return t;
    });

    const updatedTestsWithChildren = updatedTests.map((t) => {
      if (t.id === testId && t.childTests) {
        return {
          ...t,
          childTests: t.childTests.map((child) => ({
            ...child,
            completedParts: (child.completedParts || 0) + partsToComplete,
            remainingParts: child.remainingParts - partsToComplete,
          })),
        };
      }
      return t;
    });

    const totalRemainingParts = updatedTestsWithChildren.reduce((sum, test) => sum + test.remainingParts, 0);
    setAllocationData({ ...allocationData, testAllocations: updatedTestsWithChildren, totalRemainingParts });
    toast({ variant: "success", title: "Parts Completed", description: `${partsToComplete} parts marked as completed for ${test.testName}`, duration: 2000 });
  };

  const handleMarkChildAsCompleted = (parentTestId: string, childIndex: number) => {
    if (!allocationData) return;
    if (confirm("Mark this Out Source child test as completed?")) {
      const updatedTests = allocationData.testAllocations.map((test) => {
        if (test.id === parentTestId && test.childTests) {
          const updatedChildTests = [...test.childTests];
          updatedChildTests[childIndex] = { ...updatedChildTests[childIndex], remainingParts: 0 };
          const allChildrenCompleted = updatedChildTests.every((child) => child.remainingParts === 0);
          const parentRemaining = allChildrenCompleted ? 0 : test.remainingParts;
          return { ...test, childTests: updatedChildTests, remainingParts: parentRemaining };
        }
        return test;
      });

      const totalRemainingParts = updatedTests.reduce((sum, test) => sum + test.remainingParts, 0);
      setAllocationData({ ...allocationData, testAllocations: updatedTests, totalRemainingParts });
      toast({ variant: "success", title: "Child Test Completed", description: "Out Source child test marked as completed", duration: 2000 });
    }
  };

  const hasSavedAllocation = (ticketCode: string) => savedAllocations.some((allocation) => allocation && allocation.ticketCode === ticketCode);
  const getSavedAllocation = (ticketCode: string) => savedAllocations.find((allocation) => allocation.ticketCode === ticketCode);

  const handleSaveAllocation = async () => {
    if (!allocationData || !selectedTicket) return;
    try {
      const sopLink = sopLinks[selectedTicket.id] || "";
      const allocationWithSOP = { ...allocationData, sop: sopLink };
      let savedAllocation: SavedAllocation;

      if (hasSavedAllocation(allocationData.ticketCode)) {
        savedAllocation = await updateAllocationInBackend(allocationWithSOP);
      } else {
        savedAllocation = await saveAllocationToBackend(allocationWithSOP);
      }

      await loadSavedAllocations();
      toast({ variant: "success", title: "Allocation Saved", description: `Allocation for ${allocationData.ticketCode} saved successfully${sopLink ? " with SOP link" : ""}`, duration: 2000 });
      setShowAllocationModal(false);
    } catch (error) {
      console.error("Error saving allocation:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Failed to save allocation to database", duration: 3000 });
    }
  };

  const handleDeleteAllocation = async () => {
    if (!allocationData) return;
    try {
      await deleteAllocationFromBackend(allocationData.ticketCode);
      setSavedAllocations((prev) => prev.filter((allocation) => allocation.ticketCode !== allocationData.ticketCode));
      setShowAllocationModal(false);
      toast({ variant: "success", title: "Allocation Deleted", description: `Allocation removed for ticket ${allocationData.ticketCode}`, duration: 2000 });
    } catch (error) {
      console.error("Error deleting allocation:", error);
    }
  };

  const getAnoTypeOptions = () => Array.from(new Set(tickets.map((t) => t.detailsBox.assemblyOQCAno)));
  const getProjectOptions = () => Array.from(new Set(tickets.map((t) => t.detailsBox.project)));
  const resetFilters = () => { setSearchTerm(""); setFilterAnoType("all"); setFilterProject("all"); };

  const renderBackendStatus = () => {
    if (loadingBackend) {
      return (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">Loading data from backend server ({BACKEND_API_URL})...</AlertDescription>
        </Alert>
      );
    }
    if (aggregatedData.length === 0 && tickets.length === 0) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No data available. Backend might be down or no ORT data exists.</AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const renderMasterSheetStatus = () => {
    if (loadingMasterSheet) {
      return (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">Loading master Excel sheet...</AlertDescription>
        </Alert>
      );
    }
    if (masterTestConfigs.length === 0) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Master Excel sheet not loaded. Test allocations cannot be calculated.</AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert className="mb-4 bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">Master sheet loaded: {masterTestConfigs.length} test configurations</AlertDescription>
      </Alert>
    );
  };

  const renderAllocationStats = () => {
    const totalQuantity = aggregatedData.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalReceivedParts = aggregatedData.reduce((sum, item) => sum + item.receivedParts, 0);
    const totalRemainingParts = aggregatedData.reduce((sum, item) => sum + item.remainingParts, 0);

    return (
      <div className="mb-4 p-3 border rounded-lg bg-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600">
              {aggregatedData.length} unique tickets from backend
              {savedAllocations.length > 0 && ` | ${savedAllocations.length} saved allocations`}
            </p>
            <div className="text-xs text-gray-600 mt-1">
              Total Quantity: <span className="font-bold">{totalQuantity}</span> | Received Parts: <span className="font-bold">{totalReceivedParts}</span> | Remaining: <span className="font-bold">{totalRemainingParts}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadBackendData} variant="outline" size="sm" disabled={loadingBackend}>Refresh Backend Data</Button>
            <Button onClick={loadSavedAllocations} variant="outline" size="sm">Refresh Allocations</Button>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {savedAllocations.filter((allocation) => allocation?.testAllocations?.length > 0).length} Active
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const renderAllocationModalContent = () => {
    if (!allocationData) return null;
    const savedAllocation = savedAllocations.find((a) => a.ticketCode === allocationData.ticketCode);
    const isSaved = !!savedAllocation;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-blue-50">
          <div><Label className="text-xs text-gray-600">Ticket Code</Label><p className="font-medium text-lg">{allocationData.ticketCode}</p></div>
          <div><Label className="text-xs text-gray-600">Total Quantity</Label><p className="font-medium text-lg">{allocationData.totalQuantity} parts</p></div>
          <div><Label className="text-xs text-gray-600">Project</Label><p className="font-medium">{allocationData.project}</p></div>
          <div><Label className="text-xs text-gray-600">Stage</Label><p className="font-medium">{allocationData.anoType}</p></div>
          <div><Label className="text-xs text-gray-600">Build</Label><p className="font-medium">{allocationData.build}</p></div>
          <div><Label className="text-xs text-gray-600">Colour</Label><p className="font-medium">{allocationData.colour}</p></div>
          <div><Label className="text-xs text-gray-600">Reason</Label><p className="font-medium">{allocationData.reason}</p></div>
          <div className="col-span-2">
            <Label className="text-xs text-gray-600">Process Stage</Label>
            <div className="mt-1">
              <DynamicProcessStageSelector
                value={allocationData.processStage}
                onChange={(newStage) => setAllocationData({ ...allocationData, processStage: newStage, matchedProcessStage: newStage })}
                masterSheetData={masterSheetData}
              />
            </div>
          </div>
          <div><Label className="text-xs text-gray-600">SOP Link</Label>
            {selectedTicket && sopLinks[selectedTicket.id] ? (
              <a href={sopLinks[selectedTicket.id]} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">View SOP →</a>
            ) : <p className="font-medium">Not provided</p>}
          </div>
        </div>

        {allocationData.matchedProcessStage && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <span className="font-semibold">Matched Process Stage:</span> {allocationData.matchedProcessStage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-4 gap-4 p-4 border rounded-lg bg-green-50">
          <div className="text-center"><Label className="text-xs text-gray-600">Total Tests</Label><p className="text-2xl font-bold text-blue-700">{allocationData.testAllocations?.length || 0}</p></div>
          <div className="text-center"><Label className="text-xs text-gray-600">Total Parts</Label><p className="text-2xl font-bold text-gray-700">{allocationData.totalQuantity}</p></div>
          <div className="text-center"><Label className="text-xs text-gray-600">Planned Parts</Label><p className="text-2xl font-bold text-blue-700">{allocationData.testAllocations?.reduce((sum, test) => sum + test.allocatedParts, 0) || 0}</p></div>
          <div className="text-center"><Label className="text-xs text-gray-600">Remaining Parts</Label><p className="text-2xl font-bold text-orange-700">{allocationData.totalRemainingParts}</p></div>
        </div>

        {allocationData.testAllocations && allocationData.testAllocations.length > 0 ? (
          <>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">Test Allocations</h3>
                {isSaved && savedAllocation && <div className="text-sm text-gray-600">Last updated: {new Date(savedAllocation.updatedAt).toLocaleString()}</div>}
              </div>
              <div className="flex justify-end p-4 border-b bg-gray-50">
                <Button onClick={() => setShowAddTestDialog(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" />Add New Test</Button>
              </div>
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead>Test Name</TableHead><TableHead>Planned Parts</TableHead><TableHead>Remaining Parts</TableHead>
                    <TableHead>Test Condition</TableHead><TableHead>Checkpoints</TableHead><TableHead>Location</TableHead>
                    <TableHead>Machine List</TableHead><TableHead>Duration</TableHead><TableHead>Progress</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderTestAllocationRows()}</TableBody>
              </Table>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="font-semibold text-blue-800 mb-3">Allocation Progress Summary</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center"><div className="text-2xl font-bold text-blue-700">{allocationData.testAllocations.reduce((sum, test) => sum + test.allocatedParts, 0)}</div><div className="text-sm text-gray-600">Total Planned Parts</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-green-700">{allocationData.testAllocations.reduce((sum, test) => sum + (test.allocatedParts - test.remainingParts), 0)}</div><div className="text-sm text-gray-600">Parts Scanned</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-orange-700">{allocationData.testAllocations.reduce((sum, test) => sum + test.remainingParts, 0)}</div><div className="text-sm text-gray-600">Parts Remaining</div></div>
              </div>
            </div>
          </>
        ) : (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">No test allocations found.</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t">
          {isSaved && <Button variant="outline" onClick={handleDeleteAllocation} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4 mr-2" />Delete Allocation</Button>}
          <Button variant="outline" onClick={() => { setExpandedRows(new Set()); setShowAllocationModal(false); setEditingTest(null); setEditingChildTest(null); }}>Close</Button>
          <Button onClick={handleSaveAllocation} className="bg-blue-600 hover:bg-blue-700" disabled={!allocationData.testAllocations || allocationData.testAllocations.length === 0}>
            <Save className="h-4 w-4 mr-2" />{isSaved ? "Update Allocation" : "Save Allocation"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="xl:w-full mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="hover:bg-gray-100"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
        <Button onClick={() => setShowAllAllocationsDialog(true)} variant="outline" className="gap-2"><List className="h-4 w-4" />View All Allocations ({savedAllocations.length})</Button>
      </div>

      {renderBackendStatus()}
      {renderMasterSheetStatus()}

      <Card>
        <CardHeader className="bg-[#e0413a] text-white"><CardTitle className="text-2xl">Ticket View - Test Allocation</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="space-y-2"><Label className="text-sm font-medium">Search</Label>
              <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search tickets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Stage</Label>
              <select value={filterAnoType} onChange={(e) => setFilterAnoType(e.target.value)} className="w-full h-10 border border-input rounded-md px-3 py-2 bg-background">
                <option value="all">All Types</option>
                {getAnoTypeOptions().map((type) => (<option key={type} value={type}>{type}</option>))}
              </select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Project</Label>
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-full h-10 border border-input rounded-md px-3 py-2 bg-background">
                <option value="all">All Projects</option>
                {getProjectOptions().map((project) => (<option key={project} value={project}>{project}</option>))}
              </select>
            </div>
            <div className="flex gap-2 items-end"><Button onClick={resetFilters} variant="outline" className="flex-1"><Filter className="mr-2 h-4 w-4" />Reset Filters</Button></div>
          </div>

          {renderAllocationStats()}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="font-semibold w-[180px]">Ticket Code</TableHead>
                  <TableHead className="font-semibold w-[150px]">Project</TableHead>
                  <TableHead className="font-semibold w-[120px]">Total Quantity</TableHead>
                  <TableHead className="font-semibold w-[120px]">Received Parts</TableHead>
                  <TableHead className="font-semibold w-[120px]">Remaining Parts</TableHead>
                  <TableHead className="font-semibold w-[100px]">Stage</TableHead>
                  <TableHead className="font-semibold w-[140px]">Receipt Status</TableHead>
                  <TableHead className="font-semibold w-[140px]">Allocation Status</TableHead>
                  <TableHead className="font-semibold w-[140px]">Received Date</TableHead>
                  <TableHead className="font-semibold w-[400px]">SOP Link</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? filteredTickets.map((ticket) => {
                  const aggregatedItem = aggregatedData.find((item) => item.ticketCode === ticket.ticketCode);
                  const hasSaved = hasSavedAllocation(ticket.ticketCode);
                  const allocation = getSavedAllocation(ticket.ticketCode);
                  return (
                    <TableRow key={ticket.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium w-[180px]">
                        {ticket.ticketCode}
                        {hasSaved && allocation && <div className="text-xs text-green-600 font-normal">Last updated: {new Date(allocation.updatedAt).toLocaleDateString()}</div>}
                      </TableCell>
                      <TableCell className="w-[150px]"><div className="font-medium">{ticket.detailsBox.project}</div><div className="text-xs text-gray-500">{ticket.detailsBox.batch}</div></TableCell>
                      <TableCell className="w-[120px]"><div className="font-medium">{ticket.totalQuantity || ticket.partsBeingSent}</div><div className="text-xs text-gray-500">total</div></TableCell>
                      <TableCell className="w-[120px]"><div className="font-medium text-green-600">{aggregatedItem?.receivedParts || 0}</div><div className="text-xs text-gray-500">received</div></TableCell>
                      <TableCell className="w-[120px]"><div className="font-medium text-blue-600">{aggregatedItem?.remainingParts || 0}</div><div className="text-xs text-gray-500">remaining</div></TableCell>
                      <TableCell className="w-[100px]"><Badge variant="outline" className="bg-blue-50">{ticket.detailsBox.assemblyOQCAno}</Badge></TableCell>
                      <TableCell className="w-[140px]">{aggregatedItem && <Badge variant="outline" className={aggregatedItem.receivedParts === 0 ? "bg-red-50 text-red-700" : aggregatedItem.receivedParts >= aggregatedItem.totalQuantity ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}>{aggregatedItem.receivedParts === 0 ? "Not Received" : aggregatedItem.receivedParts >= aggregatedItem.totalQuantity ? "Fully Received" : "Partially Received"}</Badge>}</TableCell>
                      <TableCell className="w-[140px]">{hasSaved && allocation ? <div className="flex flex-col gap-1"><Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Saved ({allocation.testAllocations.length} tests)</Badge><div className="text-xs text-gray-500">{allocation.testAllocations.reduce((sum, test) => sum + test.remainingParts, 0)} parts remaining</div></div> : <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Not Saved</Badge>}</TableCell>
                      <TableCell className="w-[140px]"><div className="text-sm">{ticket.date}</div><div className="text-xs text-gray-500">{ticket.shiftTime}</div></TableCell>
                      <TableCell className="w-[200px]"><Input type="url" placeholder="Enter SOP link" value={sopLinks[ticket.id] || ""} onChange={(e) => setSopLinks((prev) => ({ ...prev, [ticket.id]: e.target.value }))} className="h-8 text-sm w-full min-w-[300px]" /></TableCell>
                      <TableCell className="w-[180px] text-right"><Button onClick={() => handleViewAllocation(ticket)} variant="outline" size="sm" className="gap-1" disabled={loadingMasterSheet || masterTestConfigs.length === 0}><Eye className="h-4 w-4" />View Allocation</Button></TableCell>
                    </TableRow>
                  );
                }) : <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-500">No tickets found. {searchTerm && "Try changing your search criteria."}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-gray-600">Showing {filteredTickets.length} of {tickets.length} tickets from backend | {savedAllocations.length} tickets with saved allocations</div>
        </CardContent>
      </Card>

      {/* Allocation Modal */}
      <Dialog open={showAllocationModal} onOpenChange={setShowAllocationModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">Test Allocation Details</DialogTitle>
            <DialogDescription>{allocationData && hasSavedAllocation(allocationData.ticketCode) ? "Viewing saved allocation" : "Automatic allocation based on master sheet matching"}</DialogDescription>
          </DialogHeader>
          {renderAllocationModalContent()}
        </DialogContent>
      </Dialog>

      {/* All Allocations Dialog */}
      <Dialog open={showAllAllocationsDialog} onOpenChange={setShowAllAllocationsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">All Saved Allocations</DialogTitle><DialogDescription>View and manage all ticket allocations stored in the system</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 p-4 border rounded-lg bg-blue-50">
              <div className="text-center"><Label className="text-xs text-gray-600">Total Allocations</Label><p className="text-2xl font-bold text-blue-700">{savedAllocations.length}</p></div>
              <div className="text-center"><Label className="text-xs text-gray-600">Total Tickets</Label><p className="text-2xl font-bold text-gray-700">{new Set(savedAllocations.map((a) => a.ticketCode)).size}</p></div>
              <div className="text-center"><Label className="text-xs text-gray-600">Total Tests</Label><p className="text-2xl font-bold text-green-700">{savedAllocations.reduce((sum, alloc) => sum + alloc.testAllocations.length, 0)}</p></div>
              <div className="text-center"><Label className="text-xs text-gray-600">Total Planned Parts</Label><p className="text-2xl font-bold text-orange-700">{savedAllocations.reduce((sum, alloc) => sum + alloc.testAllocations.reduce((testSum, test) => testSum + test.allocatedParts, 0), 0)}</p></div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-100"><TableRow><TableHead>Ticket Code</TableHead><TableHead>Project</TableHead><TableHead>Total Parts</TableHead><TableHead>Stage</TableHead><TableHead>No. of Tests</TableHead><TableHead>Last Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {savedAllocations.length > 0 ? savedAllocations.map((allocation) => (
                    <TableRow key={allocation.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{allocation.ticketCode}</TableCell>
                      <TableCell><div className="font-medium">{allocation.project}</div><div className="text-xs text-gray-500">{allocation.build}</div></TableCell>
                      <TableCell><div className="font-medium">{allocation.totalQuantity}</div><div className="text-xs text-gray-500">parts</div></TableCell>
                      <TableCell><Badge variant="outline" className="bg-blue-50">{allocation.anoType}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="bg-green-50">{allocation.testAllocations.length} tests</Badge></TableCell>
                      <TableCell><div className="text-sm">{new Date(allocation.updatedAt).toLocaleDateString()}</div><div className="text-xs text-gray-500">{new Date(allocation.updatedAt).toLocaleTimeString()}</div></TableCell>
                      <TableCell className="text-right"><Button onClick={() => { setAllocationData(allocation); setShowAllAllocationsDialog(false); setShowAllocationModal(true); }} variant="outline" size="sm" className="gap-1"><Eye className="h-4 w-4" />View</Button></TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No allocations saved yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end pt-4"><Button variant="outline" onClick={() => setShowAllAllocationsDialog(false)}>Close</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Test Dialog */}
      <Dialog open={showAddTestDialog} onOpenChange={setShowAddTestDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add New Test</DialogTitle><DialogDescription>Select a test from the dropdown or enter custom test details</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Test Name *</Label><Select onValueChange={handleTestNameSelect}><SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger><SelectContent>{getFilteredAvailableTests().map((test, index) => (<SelectItem key={index} value={test.testName}>{formatTestNameForDisplay(test.testName)}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Required Quantity *</Label><Input type="number" min="1" value={newTestData.requiredQty} onChange={(e) => setNewTestData({ ...newTestData, requiredQty: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Test Condition</Label><Input value={newTestData.testCondition} onChange={(e) => setNewTestData({ ...newTestData, testCondition: e.target.value })} placeholder="e.g., Room Temperature" /></div>
              <div className="space-y-2"><Label>Checkpoints</Label><Input value={newTestData.checkPoints === "" ? "-" : newTestData.checkPoints} onChange={(e) => setNewTestData({ ...newTestData, checkPoints: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Equipment</Label><Input value={newTestData.machineEquipment} onChange={(e) => setNewTestData({ ...newTestData, machineEquipment: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time</Label><Input value={newTestData.time} onChange={(e) => setNewTestData({ ...newTestData, time: e.target.value })} placeholder="e.g., 2 hours" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={newTestData.location} onChange={(e) => setNewTestData({ ...newTestData, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={newTestData.unit} onChange={(e) => setNewTestData({ ...newTestData, unit: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowAddTestDialog(false); setNewTestData({ testName: "", requiredQty: 0, testCondition: "", checkPoints: "", specification: "", machineEquipment: "", machineEquipment2: "", time: "", location: "", unit: "", allocatedParts: "" }); }}>Cancel</Button><Button onClick={handleAddNewTest} disabled={!newTestData.testName || newTestData.requiredQty <= 0}>Add Test</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Test Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingChildTest ? "Edit Child Test" : "Edit Test"}</DialogTitle><DialogDescription>{editingChildTest ? "Modify child test details" : "Modify test details. Allocations will be recalculated if quantity changes."}</DialogDescription></DialogHeader>
          {editingTest && !editingChildTest ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Test Name</Label><Input value={editingTest.testName} onChange={(e) => setEditingTest({ ...editingTest, testName: e.target.value })} /></div><div className="space-y-2"><Label>Machine Build</Label><Input type="number" min="1" value={editingTest.allocatedParts} onChange={(e) => setEditingTest({ ...editingTest, allocatedParts: (e.target.value === "" ? "" : Number(e.target.value)) as any })} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Time</Label><Input value={editingTest.time} onChange={(e) => setEditingTest({ ...editingTest, time: e.target.value })} /></div><div className="space-y-2"><Label>Unit</Label><Input value={editingTest.unit || ""} onChange={(e) => setEditingTest({ ...editingTest, unit: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Test Condition</Label><Input value={editingTest.testCondition === "" ? "-" : editingTest.testCondition} onChange={(e) => setEditingTest({ ...editingTest, testCondition: e.target.value === "" ? "-" : e.target.value })} /></div><div className="space-y-2"><Label>Checkpoints</Label><Input value={editingTest.checkPoints === "" ? "-" : editingTest.checkPoints} onChange={(e) => setEditingTest({ ...editingTest, checkPoints: e.target.value === "" ? "-" : e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Equipment</Label><Input value={editingTest.machineEquipment2 || ""} onChange={(e) => setEditingTest({ ...editingTest, machineEquipment2: e.target.value })} /></div></div>
            </div>
          ) : editingChildTest ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Child Test Name</Label><Input value={editingChildTest.childTest.subTestName === "" ? "-" : editingChildTest.childTest.subTestName} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, subTestName: e.target.value === "" ? "-" : e.target.value } })} /></div><div className="space-y-2"><Label>Planned Parts</Label><Input type="number" min="0" value={editingChildTest.childTest.allocatedParts} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, allocatedParts: (e.target.value === "" ? "" : Number(e.target.value)) as any, remainingParts: (e.target.value === "" ? "" : Number(e.target.value)) as any } })} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Test Condition</Label><Input value={editingChildTest.childTest.testCondition === "" ? "-" : editingChildTest.childTest.testCondition} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, testCondition: e.target.value === "" ? "-" : e.target.value } })} /></div><div className="space-y-2"><Label>Checkpoints</Label><Input value={editingChildTest.childTest.checkPoints === "" ? "-" : editingChildTest.childTest.checkPoints} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, checkPoints: e.target.value === "" ? "-" : e.target.value } })} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Equipment</Label><Input value={editingChildTest.childTest.machineEquipment === "" ? "-" : editingChildTest.childTest.machineEquipment} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, machineEquipment: e.target.value === "" ? "-" : e.target.value } })} /></div><div className="space-y-2"><Label>Time</Label><Input value={editingChildTest.childTest.time === "" ? "-" : editingChildTest.childTest.time} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, time: e.target.value === "" ? "-" : e.target.value } })} /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Location</Label><Input value={editingChildTest.childTest.location === "" ? "-" : editingChildTest.childTest.location} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, location: e.target.value === "" ? "-" : e.target.value } })} /></div><div className="space-y-2"><Label>Unit</Label><Input value={editingChildTest.childTest.unit === "" ? "-" : editingChildTest.childTest.unit} onChange={(e) => setEditingChildTest({ ...editingChildTest, childTest: { ...editingChildTest.childTest, unit: e.target.value === "" ? "-" : e.target.value } })} /></div></div>
            </div>
          ) : null}
          <DialogFooter><Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingTest(null); setEditingChildTest(null); }}>Cancel</Button><Button onClick={() => { if (editingChildTest) { const childAsTestAllocation: TestAllocation = { id: editingChildTest.childTest.id, testName: editingChildTest.childTest.subTestName, allocatedParts: Number(editingChildTest.childTest.allocatedParts) || 0, completedParts: 0, remainingParts: Number(editingChildTest.childTest.remainingParts) || 0, requiredQty: Number(editingChildTest.childTest.allocatedParts) || 0, testCondition: editingChildTest.childTest.testCondition, checkPoints: editingChildTest.childTest.checkPoints, specification: editingChildTest.childTest.specification, machineEquipment: editingChildTest.childTest.machineEquipment, machineEquipment2: editingChildTest.childTest.machineEquipment2, time: editingChildTest.childTest.time, location: editingChildTest.childTest.location, unit: editingChildTest.childTest.unit, status: 1, isExpanded: false }; handleUpdateTest(childAsTestAllocation); } else if (editingTest) { handleUpdateTest({ ...editingTest, allocatedParts: Number(editingTest.allocatedParts) || 0 }); } }}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Stage Editor Modal */}
      <Dialog open={showProcessStageEditor} onOpenChange={setShowProcessStageEditor}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Process Stage</DialogTitle><DialogDescription>Select or modify the process stage for this allocation</DialogDescription></DialogHeader>
          <DynamicProcessStageSelector
            value={editingProcessStage}
            onChange={(newStage) => {
              if (allocationData && allocationData.ticketCode) {
                setAllocationData({ ...allocationData, processStage: newStage, matchedProcessStage: newStage });
                setEditingProcessStage(newStage);
              }
            }}
            masterSheetData={masterSheetData}
          />
          <DialogFooter><Button variant="outline" onClick={() => setShowProcessStageEditor(false)}>Cancel</Button><Button onClick={() => setShowProcessStageEditor(false)}>Apply Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketViewPage;