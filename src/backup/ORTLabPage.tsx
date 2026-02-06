import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
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
import { ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchScannedParts, fetchOrtRecords, BackendScannedPartsRecord, BackendOrtRecord, BackendOrtDetailBox, BackendSessionValue } from '@/lib/backendApi';


type ReceivedState = "" | "Yes" | "No";



type DetailBox = {
  totalQuantity: number;
  ticketCodeRaised: string;
  dateShiftTime: string;
  project: string;
  batch: string;
  color: string;
  assemblyOQCAno: string;
  reason: string;
  oqcApprovedBy?: string;
  oqcApprovedAt?: string;
  scannedPartsId?: number;
};

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
  totalQuantity: number;
  scannedPartsId?: number;
  ortRecordId?: number;
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

const createDetailBoxFromScanned = (record: BackendScannedPartsRecord): DetailBox => ({
  totalQuantity: Number(record.totalQty ?? record.parts?.length ?? 0),
  ticketCodeRaised: record.ticketCode ?? "N/A",
  dateShiftTime: record.date ? new Date(record.date).toLocaleString() : "N/A",
  project: record.project ?? "N/A",
  batch: record.build ?? "N/A",
  color: record.colour ?? "N/A",
  assemblyOQCAno: record.processStage ?? "N/A",
  reason: record.reason ?? "N/A",
  scannedPartsId: typeof record.Id === "number" ? record.Id : undefined,
});

const createDetailBoxFromOrt = (record: BackendOrtRecord): DetailBox => ({
  totalQuantity: Number(
    record.detailBox?.totalQuantity ?? record.totalQty ?? record.allowedParts ?? 0
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
  assemblyOQCAno: record.detailBox?.assemblyOQCAno ?? record.processStage ?? "N/A",
  reason: record.detailBox?.reason ?? record.reason ?? "N/A",
  oqcApprovedBy: record.detailBox?.oqcApprovedBy,
  oqcApprovedAt: record.detailBox?.oqcApprovedAt,
  scannedPartsId: record.detailBox?.scannedPartsId,
});

const mergeDetailBox = (fallback: DetailBox, overrides?: BackendOrtDetailBox): DetailBox => {
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
    oqcApprovedBy: overrides.oqcApprovedBy ?? fallback.oqcApprovedBy,
    oqcApprovedAt: overrides.oqcApprovedAt ?? fallback.oqcApprovedAt,
    scannedPartsId: overrides.scannedPartsId ?? fallback.scannedPartsId,
  };
};

const resolveStatus = (status?: string): { received: ReceivedState; label: string } => {
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
  ortRecords: BackendOrtRecord[]
): TableRowData[] => {
  const rowMap = new Map<string, TableRowData>();

  scannedParts.forEach((record) => {
    const sessionNumber = parseSessionNumber(record.session);
    const sessionId = `${record.ticketId}-${sessionNumber}`;
    const detailBox = createDetailBoxFromScanned(record);
    const parts = Array.isArray(record.parts)
      ? record.parts
        .map((part) => part.part ?? part.partNumber ?? part.serialNumber ?? "")
        .filter((value): value is string => Boolean(value && value.trim()))
      : [];

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
      detailsBox: detailBox,
      inventoryRemarks: "",
      stage2Enabled: false,
      status: "Pending",
      movedToStage2: false,
      movedToStage2At: undefined,
      partNumbers: parts,
      totalQuantity: detailBox.totalQuantity,
      scannedPartsId: record.Id,
      ortRecordId: undefined,
    };

    rowMap.set(sessionId, row);
  });

  ortRecords.forEach((record) => {
    const sessionNumber = parseSessionNumber(record.session);
    const sessionId = `${record.ticketId}-${sessionNumber}`;
    const existing = rowMap.get(sessionId);
    const fallbackDetail = existing ? existing.detailsBox : createDetailBoxFromOrt(record);
    const detailBox = mergeDetailBox(fallbackDetail, record.detailBox);
    const statusInfo = resolveStatus(record.receivedStatus);
    const partNumbersFromDetail = Array.isArray(record.detailBox?.partNumbers)
      ? record.detailBox.partNumbers.filter((value): value is string => Boolean(value && value.trim()))
      : existing?.partNumbers ?? [];
    const movedToStage2 = Boolean(record.detailBox?.movedToStage2);

    if (existing) {
      existing.received = statusInfo.received;
      existing.status = statusInfo.label;
      existing.date = record.date ? new Date(record.date).toISOString() : existing.date;
      existing.shiftTime = record.shiftTime ?? existing.shiftTime;
      existing.detailsBox = detailBox;
      existing.inventoryRemarks = record.inventoryRemarks ?? existing.inventoryRemarks;
      existing.movedToStage2 = movedToStage2;
      existing.movedToStage2At = record.detailBox?.movedToStage2At ?? existing.movedToStage2At;
      existing.partNumbers = partNumbersFromDetail;
      existing.totalQuantity = detailBox.totalQuantity;
      existing.partsBeingSent = Number(record.allowedParts ?? existing.partsBeingSent);
      existing.ortRecordId = record.Id;
      existing.stage2Enabled =
        ((statusInfo.received === "Yes" && existing.inventoryRemarks.trim() !== "") ||
          (statusInfo.received === "No" && existing.inventoryRemarks.trim() !== "")) &&
        !existing.movedToStage2;
      if (typeof record.detailBox?.scannedPartsId === "number") {
        existing.scannedPartsId = record.detailBox.scannedPartsId;
      }
    } else {
      const newRow: TableRowData = {
        id: 0,
        sessionId,
        ticketId: record.ticketId,
        ticketCode: record.ticketCode,
        sessionNumber,
        partsBeingSent: Number(record.allowedParts ?? detailBox.totalQuantity),
        received: statusInfo.received,
        date: record.date ? new Date(record.date).toISOString() : undefined,
        shiftTime: record.shiftTime,
        detailsBox: detailBox,
        inventoryRemarks: record.inventoryRemarks ?? "",
        stage2Enabled:
          ((statusInfo.received === "Yes" && (record.inventoryRemarks ?? "").trim() !== "") ||
            (statusInfo.received === "No" && (record.inventoryRemarks ?? "").trim() !== "")) &&
          !movedToStage2,
        status: statusInfo.label,
        movedToStage2,
        movedToStage2At: record.detailBox?.movedToStage2At,
        partNumbers: partNumbersFromDetail,
        totalQuantity: detailBox.totalQuantity,
        scannedPartsId:
          typeof record.detailBox?.scannedPartsId === "number"
            ? record.detailBox.scannedPartsId
            : undefined,
        ortRecordId: record.Id,
      };

      rowMap.set(sessionId, newRow);
    }
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

const ORTLabPage: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [allStage1Data, setAllStage1Data] = useState<TableRowData[]>([]);
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
      setTableData(rows.filter((row) => !row.movedToStage2));
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
      (row) => row.sessionId === noReasonModal.sessionId
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
      prev.map((row) => (row.sessionId === updatedRow.sessionId ? updatedRow : row))
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

  const handleReceivedChange = async (sessionId: string, value: ReceivedState) => {
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
        prev.map((row) => (row.sessionId === sessionId ? updatedRow : row))
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
          : row
      )
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
      prev.map((row) => (row.sessionId === sessionId ? updatedRow : row))
    );
  };

  const persistRowsToBackend = async (rows: TableRowData[]) => {
    if (rows.length === 0) {
      return;
    }

    const createdRecords: Array<{ sessionId: string; ortRecordId: number }> = [];

    await Promise.all(
      rows.map(async (row) => {
        const payload = {
          ticketId: row.ticketId,
          session: row.sessionNumber,
          allowedParts: row.partsBeingSent,
          receivedStatus: mapReceivedToBackendStatus(row.received),
          shiftTime: row.shiftTime ?? getCurrentShift(new Date()),
          detailBox: {
            ticketCodeRaised: row.detailsBox.ticketCodeRaised,
            dateShiftTime: row.detailsBox.dateShiftTime,
            project: row.detailsBox.project,
            batch: row.detailsBox.batch,
            color: row.detailsBox.color,
            assemblyOQCAno: row.detailsBox.assemblyOQCAno,
            reason: row.detailsBox.reason,
            oqcApprovedBy: row.detailsBox.oqcApprovedBy,
            oqcApprovedAt: row.detailsBox.oqcApprovedAt,
            totalQuantity: row.totalQuantity,
            movedToStage2: row.movedToStage2,
            movedToStage2At: row.movedToStage2At ?? null,
            partNumbers: row.partNumbers,
            scannedPartsId: row.scannedPartsId ?? null,
          },
          inventoryRemarks: row.inventoryRemarks,
        };

        if (row.ortRecordId) {
          await axios.put(`${API_BASE_URL}/ort/${row.ortRecordId}`, payload);
        } else {
          const response = await axios.post(`${API_BASE_URL}/ort`, payload);
          const createdId =
            typeof response.data?.ort?.Id === "number"
              ? response.data.ort.Id
              : typeof response.data?.ort?.id === "number"
                ? response.data.ort.id
                : undefined;

          if (typeof createdId === "number") {
            createdRecords.push({
              sessionId: row.sessionId,
              ortRecordId: createdId,
            });
          }
        }
      })
    );

    if (createdRecords.length > 0) {
      setTableData((prev) =>
        prev.map((row) => {
          const match = createdRecords.find((record) => record.sessionId === row.sessionId);
          return match ? { ...row, ortRecordId: match.ortRecordId } : row;
        })
      );

      setAllStage1Data((prev) =>
        prev.map((row) => {
          const match = createdRecords.find((record) => record.sessionId === row.sessionId);
          return match ? { ...row, ortRecordId: match.ortRecordId } : row;
        })
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
          prev.filter((item) => item.sessionId !== row.sessionId)
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
        prev.map((item) => (item.sessionId === row.sessionId ? updatedRow : item))
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
                ORT receives the ticket from OQC System. Mark items as received and add inventory remarks.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total records in system: {allStage1Data.length} | Showing pending: {tableData.length}
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
                All ORT submissions have been processed or there are no new submissions.
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
                    Submit each ticket after setting the received status and inventory remarks.
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold text-gray-700 border">#
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Ticket Code
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Session
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Parts Being Sent
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Received (Yes/No)
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Date
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Shift/Time
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border min-w-[300px]">Details Box
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border min-w-[200px]">Inventory Remarks
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Status
                      </TableHead>
                      <TableHead className="font-bold text-gray-700 border">Ticket Assignment
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row) => (
                      <TableRow key={row.sessionId} className="hover:bg-gray-50">
                        <TableCell className="border font-medium">{row.id}
                        </TableCell>
                        <TableCell className="border font-medium">
                          <div className="font-bold text-blue-700">{row.ticketCode}
                          </div>
                          <div className="text-xs text-gray-500">Session {row.sessionNumber}
                          </div>
                        </TableCell>
                        <TableCell className="border text-center">
                          <Badge variant="outline" className="bg-gray-100">
                            #{row.sessionNumber}
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
                                  void handleReceivedChange(row.sessionId, "Yes");
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
                                  void handleReceivedChange(row.sessionId, "No");
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
                            <span className="text-gray-400 italic">Auto fetch
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="border">
                          {row.shiftTime ? (
                            <span className="font-medium text-purple-700">{row.shiftTime}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Auto fetch
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="border">
                          <div className="space-y-1 text-xs bg-gray-50 p-3 rounded">
                            <div className="flex gap-2">
                              <span className="font-semibold text-gray-600">• Total Quantity:
                              </span>
                              <span className="font-bold text-blue-700">{row.detailsBox.totalQuantity}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-red-600">• Ticket Code Raised:
                              </span>
                              <span className="font-medium">{row.detailsBox.ticketCodeRaised}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-red-600">• Date, SHIFT/time:
                              </span>
                              <span className="font-medium">{row.detailsBox.dateShiftTime}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-gray-600">• Project/Batch/Color:
                              </span>
                              <span className="font-medium">
                                {row.detailsBox.project} / {row.detailsBox.batch} / {row.detailsBox.color}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-gray-600">• Assembly/OQC/Ano:
                              </span>
                              <span className="font-medium">{row.detailsBox.assemblyOQCAno}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-semibold text-gray-600">• Reason:
                              </span>
                              <span className="font-medium">{row.detailsBox.reason}
                              </span>
                            </div>
                            {row.detailsBox.oqcApprovedBy && (
                              <div className="flex gap-2 mt-1 pt-1 border-t">
                                <span className="font-semibold text-green-600">• OQC Approved by:
                                </span>
                                <span className="font-medium">{row.detailsBox.oqcApprovedBy}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="border">
                          <Input
                            value={row.inventoryRemarks}
                            onChange={(event) => {
                              void handleInventoryRemarksChange(
                                row.sessionId,
                                event.target.value
                              );
                            }}
                            placeholder="Where they are placing..."
                            className="w-full"
                            disabled={row.received !== "Yes"}
                          />
                          {row.received === "Yes" && row.inventoryRemarks.trim() === "" && (
                            <p className="text-xs text-red-500 mt-1">Required for received items
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
                    ))}
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

