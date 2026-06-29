import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowRight,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { BACKEND_API_URL } from "@/lib/backendApi";

// const BACKEND_API_URL = "http://localhost:6060";
// const BACKEND_API_URL = "http://172.16.106.44:6060";

type ReceivedState = "" | "Yes" | "No";

type BackendSessionValue = number | string | undefined;

type BackendPart = {
  part?: string;
  partNumber?: string;
  serialNumber?: string;
  status?: string; // Add cosmetic status
  defect?: string | null;
  source?: string;
};

type BackendScannedPartsRecord = {
  Id: number;
  ticketId: number;
  ticketCode: string;
  totalQty?: number;
  processStage?: string;
  source?: string;
  project?: string;
  build?: string;
  colour?: string;
  date?: string;
  reason?: string;


  session?: BackendSessionValue;
  ortReceivedStatus?: string;
  parts?: BackendPart[];
  isReupload?: boolean; // Add this line
  previousOrtStatus?: string;
};

type BackendOrtDetailBox = {
  ticketCodeRaised?: string;
  dateShiftTime?: string;
  project?: string;
  batch?: string;
  color?: string;
  assemblyOQCAno?: string;
  reason?: string;
    reasonComment?: string;
  oqcApprovedBy?: string;
  oqcApprovedAt?: string;
  totalQuantity?: number;
  movedToStage2?: boolean;
  movedToStage2At?: string;
  partNumbers?: string[];
  scannedPartsId?: number;
  previousStatus?: string; // Add this line
  isReupload?: boolean;
};

type BackendOrtRecord = {
  Id: number;
  ticketId: number;
  ticketCode: string;
  totalQty?: number;
  processStage?: string;
  source?: string;
  project?: string;
  build?: string;
  colour?: string;
  session?: BackendSessionValue;
  allowedParts?: number;
  receivedStatus?: string;
  date?: string;
  shiftTime?: string;
  detailBox?: BackendOrtDetailBox;
  inventoryRemarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DetailBox = {
  totalQuantity: number;
  ticketCodeRaised: string;
  dateShiftTime: string;
  project: string;
  batch: string;
  color: string;
  assemblyOQCAno: string;
  reason: string;
    reasonComment?: string;
  oqcApprovedBy?: string;
  oqcApprovedAt?: string;
  scannedPartsId?: number;
  previousStatus?: string;
  isReupload?: boolean;
};

type RawBackendParts = BackendPart[] | string | null | undefined;

type TableRowData = {
  id: number;
  sessionId: string;
  ticketId: number;
  ticketCode: string;
  sessionNumber: number;
  partsBeingSent: number;
  received: ReceivedState;
  date?: string;
  shiftTime?: string;
  detailsBox: DetailBox;
  inventoryRemarks: string;
  stage2Enabled: boolean;
  status: string;
  movedToStage2: boolean;
  movedToStage2At?: string;
  partNumbers: string[];
  partsWithDetails?: BackendPart[];
  totalQuantity: number;
  scannedPartsId?: number;
  ortRecordId?: number;
  isReupload?: boolean;
};

type NoReasonModalState = {
  isOpen: boolean;
  sessionId: string | null;
  reason: string;
};

const parseSessionNumber = (value: BackendSessionValue): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 1;
};

// Helper function to get current user from localStorage
const getCurrentUser = (): { id: number; email: string } | null => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return null;
    }
    const user = JSON.parse(userStr);
    if (user && typeof user.id === "number" && typeof user.email === "string") {
      return { id: user.id, email: user.email };
    }
    return null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return null;
  }
};

const createDetailBoxFromScanned = (
  record: BackendScannedPartsRecord,
): DetailBox => {
  const parsedParts = parseBackendParts(record.parts);

  return {
    totalQuantity: Number(record.totalQty ?? parsedParts.length ?? 0),
    ticketCodeRaised: record.ticketCode ?? "N/A",
    dateShiftTime: record.date ? new Date(record.date).toLocaleString() : "N/A",
    project: record.project ?? "N/A",
    batch: record.build ?? "N/A",
    color: record.colour ?? "N/A",
    assemblyOQCAno: record.processStage ?? "N/A",
    reason: record.reason ?? "N/A",
      reasonComment: (record as any).reasonComment,
    scannedPartsId: typeof record.Id === "number" ? record.Id : undefined,
    previousStatus: record.previousOrtStatus,
    isReupload: record.isReupload || false,
  };
};

const parseBackendParts = (rawParts: RawBackendParts): BackendPart[] => {
  if (Array.isArray(rawParts)) {
    return rawParts;
  }

  if (typeof rawParts === "string") {
    try {
      const parsed = JSON.parse(rawParts);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to parse parts payload", error);
      return [];
    }
  }

  return [];
};

const createDetailBoxFromOrt = (record: BackendOrtRecord): DetailBox => ({
  totalQuantity: Number(
    record.detailBox?.totalQuantity ??
      record.totalQty ??
      record.allowedParts ??
      0,
  ),
  ticketCodeRaised: record.detailBox?.ticketCodeRaised ?? record.ticketCode,
  dateShiftTime: record.detailBox?.dateShiftTime
    ? record.detailBox.dateShiftTime
    : record.date
      ? new Date(record.date).toLocaleString()
      : "N/A",
  project: record.detailBox?.project ?? record.project ?? "N/A",
  batch: record.detailBox?.batch ?? record.build ?? "N/A",
  color: record.detailBox?.color ?? record.colour ?? "N/A",
  assemblyOQCAno:
    record.detailBox?.assemblyOQCAno ?? record.processStage ?? "N/A",
  reason: record.detailBox?.reason ?? record.reason ?? "N/A",
    reasonComment: record.detailBox?.reasonComment,
  oqcApprovedBy: record.detailBox?.oqcApprovedBy,
  oqcApprovedAt: record.detailBox?.oqcApprovedAt,
  scannedPartsId: record.detailBox?.scannedPartsId,
});

const mergeDetailBox = (
  fallback: DetailBox,
  overrides?: BackendOrtDetailBox,
): DetailBox => {
  if (!overrides) {
    return fallback;
  }

  return {
    totalQuantity: Number(overrides.totalQuantity ?? fallback.totalQuantity),
    ticketCodeRaised: overrides.ticketCodeRaised ?? fallback.ticketCodeRaised,
    dateShiftTime: overrides.dateShiftTime ?? fallback.dateShiftTime,
    project: overrides.project ?? fallback.project,
    batch: overrides.batch ?? fallback.batch,
    color: overrides.color ?? fallback.color,
    assemblyOQCAno: overrides.assemblyOQCAno ?? fallback.assemblyOQCAno,
    reason: overrides.reason ?? fallback.reason,
        reasonComment: overrides.reasonComment ?? fallback.reasonComment,

    oqcApprovedBy: overrides.oqcApprovedBy ?? fallback.oqcApprovedBy,
    oqcApprovedAt: overrides.oqcApprovedAt ?? fallback.oqcApprovedAt,
    scannedPartsId: overrides.scannedPartsId ?? fallback.scannedPartsId,
    previousStatus: overrides.previousStatus ?? fallback.previousStatus, // Add this line
    isReupload: overrides.isReupload ?? fallback.isReupload,
  };
};

const resolveStatus = (
  status?: string,
): { received: ReceivedState; label: string } => {
  if (!status) {
    return { received: "", label: "Pending" };
  }

  const normalized = status.toLowerCase();

  if (normalized === "received" || normalized === "yes") {
    return { received: "Yes", label: "Received" };
  }

  if (normalized === "not received" || normalized === "no") {
    return { received: "No", label: "Not Received" };
  }

  return { received: "", label: status };
};

const mapReceivedToBackendStatus = (received: ReceivedState): string => {
  if (received === "Yes") {
    return "Received";
  }

  if (received === "No") {
    return "Not Received";
  }

  return "Pending";
};

const mapBackendDataToRows = (
  scannedParts: BackendScannedPartsRecord[],
  ortRecords: BackendOrtRecord[],
): TableRowData[] => {
  const rowMap = new Map<string, TableRowData>();

  scannedParts.forEach((record) => {
    const sessionNumber = parseSessionNumber(record.session);
    const sessionId = `${record.ticketId}-${sessionNumber}`;
    const existing = rowMap.get(sessionId);

    const detailBox = createDetailBoxFromScanned(record);
    const parsedParts = parseBackendParts(record.parts);
    const parts = parsedParts
      .map((part) => part.part ?? part.partNumber ?? part.serialNumber ?? "")
      .filter((value): value is string => Boolean(value && value.trim()));

    const recordId = typeof record.Id === "number" ? record.Id : 0;
    const existingId = existing?.scannedPartsId ?? 0;
    const newIsReupload = Boolean(detailBox.isReupload);
    const existingIsReupload = existing?.isReupload ?? false;
    const hasPreviousEntry = Boolean(existing);

    const shouldReplace =
      !existing ||
      newIsReupload ||
      (!existingIsReupload && recordId >= existingId);

    if (!shouldReplace) {
      return;
    }

    const effectiveIsReupload =
      newIsReupload || (hasPreviousEntry && recordId >= existingId);

    const normalizedDetailBox: DetailBox = {
      ...detailBox,
      isReupload:
        effectiveIsReupload || detailBox.isReupload || existingIsReupload,
      previousStatus:
        detailBox.previousStatus ?? existing?.detailsBox.previousStatus,
    };

    const resolvedTotalQuantity =
      parts.length ||
      Number(record.totalQty ?? normalizedDetailBox.totalQuantity ?? 0);

    const row: TableRowData = {
      id: 0,
      sessionId,
      ticketId: record.ticketId,
      ticketCode: record.ticketCode,
      sessionNumber,
      partsBeingSent: parts.length || Number(record.totalQty ?? 0),
      received: "",
      date: undefined,
      shiftTime: undefined,
      detailsBox: normalizedDetailBox,
      inventoryRemarks: "",
      stage2Enabled: false,
      status: "Pending",
      movedToStage2: false,
      movedToStage2At: undefined,
      partNumbers: parts,
      partsWithDetails: parsedParts,
      totalQuantity: resolvedTotalQuantity,
      scannedPartsId:
        typeof record.Id === "number" ? record.Id : existing?.scannedPartsId,
      ortRecordId: newIsReupload ? undefined : existing?.ortRecordId,
      isReupload: normalizedDetailBox.isReupload ?? false,
    };

    rowMap.set(sessionId, row);
  });

  const parseTimestamp = (value?: string): number => {
    if (!value) {
      return Number.NaN;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  };

  const getRecordTimestamp = (record: BackendOrtRecord): number => {
    const updated = parseTimestamp(record.updatedAt);
    if (!Number.isNaN(updated)) {
      return updated;
    }
    const created = parseTimestamp(record.date);
    if (!Number.isNaN(created)) {
      return created;
    }
    return 0;
  };

  const sortedOrtRecords = [...ortRecords].sort((a, b) => {
    const timeA = getRecordTimestamp(a);
    const timeB = getRecordTimestamp(b);
    return timeA - timeB;
  });

  sortedOrtRecords.forEach((record) => {
    const sessionNumber = parseSessionNumber(record.session);
    const sessionId = `${record.ticketId}-${sessionNumber}`;

    const existing = rowMap.get(sessionId);
    const fallbackDetail = existing
      ? existing.detailsBox
      : createDetailBoxFromOrt(record);
    const detailBox = mergeDetailBox(fallbackDetail, record.detailBox);
    const statusInfo = resolveStatus(record.receivedStatus);
    const reuploadFlag = detailBox.isReupload ?? existing?.isReupload ?? false;
    const hasFreshScan =
      existing?.scannedPartsId !== undefined &&
      existing.scannedPartsId !== null &&
      detailBox.scannedPartsId !== existing.scannedPartsId;
    const recordIsReupload = Boolean(record.detailBox?.isReupload);
    const shouldSkipObsoleteOriginal =
      hasFreshScan &&
      !recordIsReupload &&
      (existing?.isReupload ?? reuploadFlag);

    if (shouldSkipObsoleteOriginal) {
      return;
    }

    const isReceived = statusInfo.received === "Yes";
    const isReuploadPending = reuploadFlag && (!isReceived || hasFreshScan);
    const effectiveStatus = isReuploadPending
      ? { received: "", label: "Pending" }
      : statusInfo;

    const partNumbersFromDetail = (() => {
      if (isReuploadPending && existing?.partNumbers?.length) {
        return existing.partNumbers;
      }

      if (Array.isArray(record.detailBox?.partNumbers)) {
        return record.detailBox.partNumbers.filter((value): value is string =>
          Boolean(value && value.trim()),
        );
      }

      return existing?.partNumbers ?? [];
    })();
    const movedToStage2 = isReuploadPending
      ? false
      : Boolean(record.detailBox?.movedToStage2);
    const existingRemarks = existing?.inventoryRemarks ?? "";
    const previousRemarks = record.inventoryRemarks ?? existingRemarks;
    const effectiveRemarks = isReuploadPending ? "" : previousRemarks;

    const partsCount = (() => {
      if (isReuploadPending && existing?.partsBeingSent) {
        return existing.partsBeingSent;
      }

      if (partNumbersFromDetail.length > 0) {
        return partNumbersFromDetail.length;
      }

      return (
        existing?.partsBeingSent ??
        Number(record.allowedParts ?? detailBox.totalQuantity)
      );
    })();

    const normalizedDetailBox = {
      ...detailBox,
      totalQuantity: partsCount > 0 ? partsCount : detailBox.totalQuantity,
      previousStatus:
        detailBox.previousStatus ??
        existing?.detailsBox?.previousStatus ??
        previousRemarks,
      isReupload: reuploadFlag,
    };

    const updatedRow: TableRowData = {
      id: existing?.id ?? 0,
      sessionId,
      ticketId: record.ticketId,
      ticketCode: record.ticketCode,
      sessionNumber,
      partsBeingSent: partsCount,
      received: effectiveStatus.received,
      date: record.date ? new Date(record.date).toISOString() : existing?.date,
      shiftTime: record.shiftTime ?? existing?.shiftTime,
      detailsBox: normalizedDetailBox,
      inventoryRemarks: effectiveRemarks,
      stage2Enabled:
        effectiveStatus.received !== "" &&
        effectiveRemarks.trim() !== "" &&
        !movedToStage2,
      status: effectiveStatus.label,
      movedToStage2,
      movedToStage2At:
        record.detailBox?.movedToStage2At ?? existing?.movedToStage2At,
      partNumbers: partNumbersFromDetail,
      totalQuantity: partsCount,
      scannedPartsId: detailBox.scannedPartsId ?? existing?.scannedPartsId,
      ortRecordId:
        typeof record.Id === "number" ? record.Id : existing?.ortRecordId,
      isReupload: reuploadFlag,
    };

    rowMap.set(sessionId, updatedRow);
  });

  return Array.from(rowMap.values())
    .sort((a, b) => {
      const ticketComparison = a.ticketCode.localeCompare(b.ticketCode);
      if (ticketComparison !== 0) {
        return ticketComparison;
      }

      return a.sessionNumber - b.sessionNumber;
    })
    .map((row, index) => ({
      ...row,
      id: index + 1,
    }));
};

const getCurrentShift = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 6 && hour < 14) {
    return "Morning Shift (6 AM - 2 PM)";
  }
  if (hour >= 14 && hour < 22) {
    return "Afternoon Shift (2 PM - 10 PM)";
  }
  return "Night Shift (10 PM - 6 AM)";
};

// Parts Details Modal Component
const PartsDetailsModal: React.FC<{
  isOpen: boolean;
  parts: BackendPart[];
  onClose: () => void;
  ticketCode?: string;
}> = ({ isOpen, parts, onClose, ticketCode }) => {
  if (!parts || parts.length === 0) {
    return null;
  }

  const okCount = parts.filter((p) => p.status === "Cosmetic OK").length;
  const notOkCount = parts.filter((p) => p.status === "Cosmetic Not OK").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-700">
            Parts Details - {ticketCode || "Ticket"}
          </DialogTitle>
          <DialogDescription>
            <div className="flex gap-3 mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                Total: {parts.length} parts
              </Badge>
              {okCount > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  Cosmetic OK: {okCount}
                </Badge>
              )}
              {notOkCount > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  Cosmetic Not OK: {notOkCount}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2 overflow-y-auto max-h-[50vh] pr-2">
          {parts.map((part, idx) => {
            const partNumber =
              part.part ??
              part.partNumber ??
              part.serialNumber ??
              `Part ${idx + 1}`;
            const status = part.status ?? "N/A";
            const defect = part.defect;
            const isNotOk = status === "Cosmetic Not OK";
            const source = part.source;

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 ${
                  isNotOk
                    ? "bg-red-50 border-red-300"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-semibold text-base text-gray-900 mb-2">
                      {idx + 1}. {partNumber}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-sm ${
                          isNotOk
                            ? "bg-red-200 text-red-900"
                            : "bg-green-200 text-green-900"
                        }`}
                      >
                        {isNotOk ? "✗" : "✓"} {status}
                      </Badge>
                      {defect && isNotOk && (
                        <Badge className="bg-orange-200 text-orange-900 text-sm">
                          Defect: {defect}
                        </Badge>
                      )}

                      {source &&  (
                        <Badge className="bg-orange-200 text-orange-900 text-sm">
                          Source: {source}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Parts Details Button Component
const PartsDetailsButton: React.FC<{
  parts: BackendPart[];
  ticketCode?: string;
}> = ({ parts, ticketCode }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!parts || parts.length === 0) {
    return null;
  }

  const okCount = parts.filter((p) => p.status === "Cosmetic OK").length;
  const notOkCount = parts.filter((p) => p.status === "Cosmetic Not OK").length;

  return (
    <>
      <div className="mt-2 pt-2 border-t">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
        >
          <ChevronRight className="mr-2 h-4 w-4" />
          <span>View Parts Details</span>
          {/* <div className="flex gap-2 ml-auto">
            {okCount > 0 && (
              <Badge className="bg-green-100 text-green-800 text-xs">
                OK: {okCount}
              </Badge>
            )}
            {notOkCount > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                Not OK: {notOkCount}
              </Badge>
            )}
          </div> */}
        </Button>
      </div>

      <PartsDetailsModal
        isOpen={isOpen}
        parts={parts}
        onClose={() => setIsOpen(false)}
        ticketCode={ticketCode}
      />
    </>
  );
};

const getParsedPartsForRow = (row: TableRowData): BackendPart[] => {
  return row.partsWithDetails ?? [];
};

const ORTLabPage: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [allStage1Data, setAllStage1Data] = useState<TableRowData[]>([]);
  const [sessionOrtIdMap, setSessionOrtIdMap] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [noReasonModal, setNoReasonModal] = useState<NoReasonModalState>({
    isOpen: false,
    sessionId: null,
    reason: "",
  });

  useEffect(() => {
    void loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const rows = await fetchOrtStage1Rows();
      setAllStage1Data(rows);
      const pendingRows = rows.filter(
        (row) =>
          row.received !== "Yes" && (!row.movedToStage2 || row.isReupload),
      );
      setTableData(pendingRows);

      setSessionOrtIdMap((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          if (typeof row.ortRecordId === "number") {
            next[row.sessionId] = row.ortRecordId;
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Error loading ORT data", error);
      toast({
        variant: "destructive",
        title: "Load Error",
        description: "Failed to load ORT Lab submissions.",
        duration: 3000,
      });
      setAllStage1Data([]);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrtStage1Rows = async (): Promise<TableRowData[]> => {
    const [scannedParts, ortRecords] = await Promise.all([
      fetchScannedParts(),
      fetchOrtRecords(),
    ]);

    return mapBackendDataToRows(scannedParts, ortRecords);
  };

  // const fetchScannedParts = async (): Promise<BackendScannedPartsRecord[]> => {
  //   try {
  //     const response = await axios.get(`${BACKEND_API_URL}/scannedParts`);
  //     return Array.isArray(response.data?.scannedParts) ? response.data.scannedParts : [];
  //   } catch (error) {
  //     if (axios.isAxiosError(error) && error.response?.status === 404) {
  //       return [];
  //     }
  //     throw error;
  //   }
  // };

  const fetchScannedParts = async (): Promise<BackendScannedPartsRecord[]> => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/scannedParts`);
      const scannedParts = Array.isArray(response.data?.scannedParts)
        ? response.data.scannedParts
        : [];

      // Parse the parts data properly
      return scannedParts.map((record) => ({
        ...record,
        parts: parseBackendParts(record.parts),
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  };

  const fetchOrtRecords = async (): Promise<BackendOrtRecord[]> => {
    try {
      const response = await axios.get(`${BACKEND_API_URL}/ort`);
      return Array.isArray(response.data?.orts) ? response.data.orts : [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  };

  const handleNoButtonClick = (sessionId: string) => {
    setNoReasonModal({
      isOpen: true,
      sessionId,
      reason: "",
    });
  };

  const handleNoReasonChange = (value: string) => {
    setNoReasonModal((prev) => ({
      ...prev,
      reason: value,
    }));
  };

  const handleSaveNoReason = async () => {
    if (!noReasonModal.sessionId || !noReasonModal.reason.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a reason",
        duration: 3000,
      });
      return;
    }

    const now = new Date();
    const isoDate = now.toISOString();
    const shift = getCurrentShift(now);

    const existingRow = tableData.find(
      (row) => row.sessionId === noReasonModal.sessionId,
    );

    if (!existingRow) {
      return;
    }

    const trimmedReason = noReasonModal.reason.trim();
    const updatedRow: TableRowData = {
      ...existingRow,
      received: "No",
      status: "Not Received",
      date: isoDate,
      shiftTime: shift,
      stage2Enabled: trimmedReason !== "" && !existingRow.movedToStage2,
      inventoryRemarks: `Not Received - Reason: ${trimmedReason}`,
    };

    setTableData((prev) =>
      prev.map((row) =>
        row.sessionId === updatedRow.sessionId ? updatedRow : row,
      ),
    );

    setNoReasonModal({
      isOpen: false,
      sessionId: null,
      reason: "",
    });

    toast({
      title: "Reason Captured",
      description: "Click submit to finalize the not received status.",
      duration: 2500,
    });
  };

  const handleCancelNoReason = () => {
    setNoReasonModal({
      isOpen: false,
      sessionId: null,
      reason: "",
    });
  };

  const handleReceivedChange = async (
    sessionId: string,
    value: ReceivedState,
  ) => {
    if (value === "Yes") {
      const now = new Date();
      const isoDate = now.toISOString();
      const shift = getCurrentShift(now);

      const existingRow = tableData.find((row) => row.sessionId === sessionId);

      if (!existingRow) {
        return;
      }

      const trimmedRemarks = existingRow.inventoryRemarks.trim();
      const updatedRow: TableRowData = {
        ...existingRow,
        received: "Yes",
        status: "Received",
        date: isoDate,
        shiftTime: shift,
        stage2Enabled: trimmedRemarks !== "" && !existingRow.movedToStage2,
      };

      setTableData((prev) =>
        prev.map((row) => (row.sessionId === sessionId ? updatedRow : row)),
      );

      if (updatedRow.stage2Enabled) {
        try {
          setIsSaving(true);
          await persistRowsToBackend([updatedRow]);
        } catch (error) {
          console.error("Error saving ORT data", error);
          toast({
            variant: "destructive",
            title: "Save Error",
            description: "Failed to update ORT Lab records.",
            duration: 3000,
          });
        } finally {
          setIsSaving(false);
        }
      }
      return;
    }

    if (value === "No") {
      handleNoButtonClick(sessionId);
      return;
    }

    setTableData((prev) =>
      prev.map((row) =>
        row.sessionId === sessionId
          ? {
              ...row,
              received: "",
              status: "Pending",
              date: undefined,
              shiftTime: undefined,
              stage2Enabled: false,
            }
          : row,
      ),
    );
  };

  const handleInventoryRemarksChange = (sessionId: string, value: string) => {
    const existingRow = tableData.find((row) => row.sessionId === sessionId);

    if (!existingRow) {
      return;
    }

    const trimmed = value.trim();
    const shouldEnable =
      existingRow.received === "Yes"
        ? trimmed !== "" && !existingRow.movedToStage2
        : existingRow.received === "No"
          ? trimmed !== "" && !existingRow.movedToStage2
          : false;

    const updatedRow: TableRowData = {
      ...existingRow,
      inventoryRemarks: value,
      stage2Enabled: shouldEnable,
    };

    setTableData((prev) =>
      prev.map((row) => (row.sessionId === sessionId ? updatedRow : row)),
    );
  };

  const persistRowsToBackend = async (rows: TableRowData[]) => {
    if (rows.length === 0) {
      return;
    }

    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User not found. Please login again.",
        duration: 3000,
      });
      return;
    }

    const updatedRecords: Array<{ sessionId: string; ortRecordId: number }> =
      [];
    const rowsBySession = new Map(rows.map((row) => [row.sessionId, row]));

    await Promise.all(
      rows.map(async (row) => {
        const sessionKey = row.sessionId;
        const previousOrtId = sessionOrtIdMap[sessionKey];
        const hasExplicitOrtId = typeof row.ortRecordId === "number";
        const shouldForceCreate = row.isReupload && !hasExplicitOrtId;
        const resolvedOrtId = shouldForceCreate
          ? undefined
          : (row.ortRecordId ?? previousOrtId);

        const payload = {
          ticketId: row.ticketId,
          session: row.sessionNumber,
          allowedParts: row.partsBeingSent,
          receivedStatus: mapReceivedToBackendStatus(row.received),
          shiftTime: row.shiftTime ?? getCurrentShift(new Date()),
          createdBy: currentUser.id, // Add createdBy from localStorage
          detailBox: {
            ticketCodeRaised: row.detailsBox.ticketCodeRaised,
            dateShiftTime: row.detailsBox.dateShiftTime,
            project: row.detailsBox.project,
            batch: row.detailsBox.batch,
            color: row.detailsBox.color,
            assemblyOQCAno: row.detailsBox.assemblyOQCAno,
            reason: row.detailsBox.reason,
                        reasonComment: row.detailsBox.reasonComment,

            oqcApprovedBy: row.detailsBox.oqcApprovedBy,
            oqcApprovedAt: row.detailsBox.oqcApprovedAt,
            totalQuantity: row.totalQuantity,
            movedToStage2: row.movedToStage2,
            movedToStage2At: row.movedToStage2At ?? null,
            partNumbers: row.partNumbers,
            scannedPartsId: row.scannedPartsId ?? null,
            previousStatus: row.detailsBox.previousStatus ?? null,
            isReupload: row.isReupload ?? false,
          },
          inventoryRemarks: row.inventoryRemarks,
        };

        if (typeof resolvedOrtId === "number") {
          await axios.put(`${BACKEND_API_URL}/ort/${resolvedOrtId}`, payload);
          updatedRecords.push({
            sessionId: sessionKey,
            ortRecordId: resolvedOrtId,
          });
        } else {
          const response = await axios.post(`${BACKEND_API_URL}/ort`, payload);
          const createdId =
            typeof response.data?.ort?.Id === "number"
              ? response.data.ort.Id
              : typeof response.data?.ort?.id === "number"
                ? response.data.ort.id
                : undefined;

          if (typeof createdId === "number") {
            updatedRecords.push({
              sessionId: sessionKey,
              ortRecordId: createdId,
            });
          }
        }
      }),
    );

    const ortIdLookup = new Map(
      updatedRecords.map((record) => [record.sessionId, record.ortRecordId]),
    );

    if (updatedRecords.length > 0) {
      setTableData((prev) =>
        prev.map((row) => {
          const persisted = rowsBySession.get(row.sessionId);
          if (!persisted) {
            return row;
          }

          const resolvedId = ortIdLookup.get(row.sessionId) ?? row.ortRecordId;

          return {
            ...row,
            ...persisted,
            ortRecordId: resolvedId ?? persisted.ortRecordId ?? row.ortRecordId,
          };
        }),
      );

      setAllStage1Data((prev) =>
        prev.map((row) => {
          const persisted = rowsBySession.get(row.sessionId);
          if (!persisted) {
            return row;
          }

          const resolvedId = ortIdLookup.get(row.sessionId) ?? row.ortRecordId;

          return {
            ...row,
            ...persisted,
            ortRecordId: resolvedId ?? persisted.ortRecordId ?? row.ortRecordId,
          };
        }),
      );

      setSessionOrtIdMap((prev) => {
        const next = { ...prev };
        updatedRecords.forEach((record) => {
          next[record.sessionId] = record.ortRecordId;
        });
        return next;
      });
    }

    const completedSessions = new Set(
      rows.filter((row) => row.received === "Yes").map((row) => row.sessionId),
    );

    if (completedSessions.size > 0) {
      setTableData((prev) =>
        prev.filter((row) => !completedSessions.has(row.sessionId)),
      );

      setAllStage1Data((prev) =>
        prev.map((row) =>
          completedSessions.has(row.sessionId)
            ? (() => {
                const persisted = rowsBySession.get(row.sessionId);
                return {
                  ...row,
                  ...(persisted ?? {}),
                  received: "Yes",
                  status: "Received",
                };
              })()
            : row,
        ),
      );
    }
  };

  const handleStage2Navigate = async (row: TableRowData) => {
    try {
      setIsSaving(true);

      if (row.received === "No") {
        const updatedRow: TableRowData = {
          ...row,
          movedToStage2: true,
          movedToStage2At: new Date().toISOString(),
          stage2Enabled: false,
        };

        setTableData((prev) =>
          prev.filter((item) => item.sessionId !== row.sessionId),
        );

        await persistRowsToBackend([updatedRow]);
        await loadAllData();

        toast({
          title: "Submission Recorded",
          description: `Ticket ${row.ticketCode} marked as not received.`,
          duration: 2000,
        });
        return;
      }

      const updatedRow: TableRowData = {
        ...row,
        movedToStage2: true,
        movedToStage2At: new Date().toISOString(),
        stage2Enabled: false,
      };

      setTableData((prev) =>
        prev.map((item) =>
          item.sessionId === row.sessionId ? updatedRow : item,
        ),
      );

      await persistRowsToBackend([updatedRow]);
      await loadAllData();

      navigate("/settings", {
        state: {
          record: updatedRow,
          fromStage1: true,
          partNumbers: updatedRow.partNumbers,
        },
      });

      toast({
        title: "Moved to Stage 2",
        description: `Ticket ${row.ticketCode} moved to Stage 2.`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Error moving to Stage 2", error);
      toast({
        variant: "destructive",
        title: "Navigation Error",
        description: "Failed to move ticket to Stage 2.",
        duration: 3000,
      });
      await loadAllData();
    } finally {
      setIsSaving(false);
    }
  };

  const refreshData = async () => {
    await loadAllData();
    toast({
      title: "Data Refreshed",
      description: "Loaded latest ORT submissions.",
      duration: 2000,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading ORT Lab submissions...</p>
        </div>
      </div>
    );
  }

  return (
        <div className="mx-auto p-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                ORT Received Ticket - Stage 1
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                ORT receives the ticket from OQC System. Mark items as received
                and add inventory remarks.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total records in system: {allStage1Data.length} | Showing
                pending: {tableData.length}
              </p>
            </div>
 
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  void refreshData();
                }}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                disabled={loading || isSaving}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {tableData.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Pending ORT Submissions
              </h3>
              <p className="text-gray-500 mb-4">
                All ORT submissions have been processed or there are no new
                submissions.
              </p>
              <p className="text-sm text-gray-400">
                New submissions will appear here when sent from the OQC System.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-white">
                      {tableData.length} Pending Submissions
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      Total in system: {allStage1Data.length}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Submit each ticket after setting the received status and
                    inventory remarks.
                  </div>
                </div>
              </div>
 
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold text-gray-700 border">
                        #
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Ticket Code
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Session
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Parts Being Sent
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Received (Yes/No)
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Date
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Shift/Time
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border min-w-[300px]">
                        Details Box
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border min-w-[200px]">
                        Inventory Remarks
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Status
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">
                        Ticket Assignment
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map(
                      (row) => (
                        console.log("Row:", row),
                        (
                          <TableRow
                            key={row.sessionId}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="border font-medium">
                              {row.id}
                            </TableCell>
                            {/* <TableCell className="border font-medium">
                          <div className="font-bold text-blue-700">{row.ticketCode}
                          </div>
                          <div className="text-xs text-gray-500">Session {row.sessionNumber}
                          </div>
                        </TableCell> */}
                            <TableCell className="border font-medium">
                              <div className="font-bold text-blue-700">
                                {row.ticketCode}
                              </div>
                              <div className="text-xs text-gray-500">
                                Session {row.sessionNumber}
                                {row.isReupload && ( // Now this will work
                                  <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs">
                                    Re-upload
                                  </Badge>
                                )}
                                {row.detailsBox.previousStatus && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Previous: {row.detailsBox.previousStatus}
                                  </div>
                                )}
                              </div>
                            </TableCell>
 
                            <TableCell className="border text-center">
                              <Badge variant="outline" className="bg-gray-100">
                                {row.sessionNumber}
                              </Badge>
                            </TableCell>
                            <TableCell className="border text-center font-semibold">
                              {row.partsBeingSent}
                            </TableCell>
                            <TableCell className="border">
                              <div className="flex flex-col gap-1">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      void handleReceivedChange(
                                        row.sessionId,
                                        "Yes",
                                      );
                                    }}
                                    className={
                                      row.received === "Yes"
                                        ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                                        : "hover:bg-green-50"
                                    }
                                  >
                                    ✓ Yes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      void handleReceivedChange(
                                        row.sessionId,
                                        "No",
                                      );
                                    }}
                                    className={
                                      row.received === "No"
                                        ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                                        : "hover:bg-red-50"
                                    }
                                  >
                                    ✗ No
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="border">
                              {row.date ? (
                                <span className="font-medium text-blue-700">
                                  {new Date(row.date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">
                                  Auto fetch
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="border">
                              {row.shiftTime ? (
                                <span className="font-medium text-purple-700">
                                  {row.shiftTime}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">
                                  Auto fetch
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="border">
                              <div className="space-y-1 text-xs p-3 rounded">
                                <div className="flex gap-2">
                                  <span className="font-semibold text-gray-600">
                                    Total Quantity:
                                  </span>
                                  <span className="font-bold text-gray-700">
                                    {row.detailsBox.totalQuantity}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <span className="font-semibold text-gray-600">
                                    Ticket Code:
                                  </span>
                                  <span className="font-medium">
                                    {row.detailsBox.ticketCodeRaised}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-semibold text-gray-600">
                                    Date-SHIFT:
                                  </span>
                                  <span className="font-medium">
                                    {row.detailsBox.dateShiftTime}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-semibold text-gray-600">
                                    Project:
                                  </span>
                                  <span className="font-medium">
                                    {row.detailsBox.project}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-semibold text-gray-600">
                                    Batch:
                                  </span>
                                  <span className="font-medium">
                                    {row.detailsBox.batch}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-semibold text-gray-600">
                                    Colour:
                                  </span>
                                  <span className="font-medium">
                                    {row.detailsBox.color}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-semibold text-gray-600">
                                    Assembly/Ano/Oleo:
                                  </span>
                                  <span className="font-medium">
                                    {row.detailsBox.assemblyOQCAno}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-semibold text-gray-600">
                                    Reason:
                                  </span>
                                  <span className="font-medium">
                                    {row.detailsBox.reason}
                                  </span>
                                </div>
                                {row.detailsBox.reasonComment && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-600">
                                      Comment:
                                    </span>
                                    <div className="flex-1 max-h-16 overflow-y-auto bg-white/80 p-1.5 rounded border border-gray-200 text-xs leading-relaxed scrollbar-thin">
                                      {row.detailsBox.reasonComment}
                                    </div>
                                  </div>
                                )}
                                {row.detailsBox.oqcApprovedBy && (
                                  <div className="flex gap-2 mt-1 pt-1 border-t">
                                    <span className="font-semibold text-green-600">
                                      • OQC Approved by:
                                    </span>
                                    <span className="font-medium">
                                      {row.detailsBox.oqcApprovedBy}
                                    </span>
                                  </div>
                                )}
                                <PartsDetailsButton
                                  parts={getParsedPartsForRow(row)}
                                  ticketCode={row.ticketCode}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="border">
                              <Input
                                value={row.inventoryRemarks}
                                onChange={(event) => {
                                  void handleInventoryRemarksChange(
                                    row.sessionId,
                                    event.target.value,
                                  );
                                }}
                                placeholder="Where they are placing..."
                                className="w-full"
                                disabled={row.received !== "Yes"}
                              />
                              {row.received === "Yes" &&
                                row.inventoryRemarks.trim() === "" && (
                                  <p className="text-xs text-red-500 mt-1">
                                    Required for received items
                                  </p>
                                )}
                            </TableCell>
                            <TableCell className="border">
                              <Badge
                                className={
                                  row.status === "Received"
                                    ? "bg-green-100 text-green-800"
                                    : row.status === "Not Received"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="border text-center">
                              {row.stage2Enabled ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    void handleStage2Navigate(row);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                  disabled={isSaving}
                                >
                                  <ArrowRight className="mr-2 h-4 w-4" />
                                  Submit
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  {row.received === "Yes"
                                    ? "Add inventory remarks"
                                    : row.received === "No"
                                      ? "Provide reason to submit"
                                      : "Select Yes or No"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
 
      <Dialog
        open={noReasonModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelNoReason();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Not Received</DialogTitle>
            <DialogDescription>
              Please provide a reason for marking this item as not received.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Input
              value={noReasonModal.reason}
              onChange={(event) => handleNoReasonChange(event.target.value)}
              placeholder="Enter reason"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCancelNoReason}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSaveNoReason();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
 
  );
};

export default ORTLabPage;
