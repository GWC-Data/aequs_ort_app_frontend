import React, { useState, useEffect } from "react";
import {
  Trash2,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  Database,
  PlusCircle,
} from "lucide-react";
import { backendApi, getBackendApiUrl } from "@/lib/backendApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PartData {
  partNumber: string;
  serialNumber: string;
  ticketCode: string;
  testName: string;
  testStatus: string;
  loadedAt: string;
  testCondition: string;
  [key: string]: any;
}

interface MachineDetails {
  machine: string;
  ticketCode: string;
  project: string;
  build: string;
  colour: string;
  machineId: string;
  machineDescription: string;
  selectedTest: {
    testName: string;
    testCondition: string;
    [key: string]: any;
  };
}

interface TestingPart {
  id: number;
  chamber: string;
  machineId: string;
  machineDescription: string;
  parts: PartData[];
  machineDetails: MachineDetails;
  loadedAt: string;
  status: string;
  testUnit: string;
  testValue: number | null;
  testStarted: boolean;
  testStatus: string;
  timerStatus: string;
  timerStartTime: string | null;
  actualStartTime: string;
  isCompleted: boolean;
  completedAt: string | null;
  lastUpdated: string;
  totalParts: number;
  selectedTestId: string;
  selectedTestName: string;
  isCombinedTest: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  message: string;
  testingParts: TestingPart[];
  count: number;
}

const TestingPartsTable: React.FC = () => {
  const [testingParts, setTestingParts] = useState<TestingPart[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    type: "single" | "multiple";
    id?: number;
    count?: number;
  }>({ show: false, type: "single" });

  // Fetch testing parts
  const fetchTestingParts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use axios-style response handling
      const response = await backendApi.get<ApiResponse>("testing-parts");

      console.log("Full response:", response);
      console.log("Response data:", response.data);

      // Check if response has data
      if (response.data && response.data.testingParts) {
        setTestingParts(response.data.testingParts);
      } else {
        // No data in response
        setTestingParts([]);
      }
    } catch (err: any) {
      // Check if it's a "no data" scenario vs actual error
      if (err.response && err.response.status === 404) {
        // No data found in database
        setTestingParts([]);
      } else if (
        (err.message && err.message.includes("No data")) ||
        (err.message && err.message.includes("no data")) ||
        (err.message && err.message.includes("not found"))
      ) {
        // Backend returned "no data" message
        setTestingParts([]);
      } else {
        // Actual API error
        setError("Failed to load testing parts. Please try again.");
        console.error("Error fetching testing parts:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestingParts();
  }, []);

  // Rest of your functions remain the same...
  const handleDelete = async (id: number) => {
    setDeleteConfirmation({ show: true, type: "single", id });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.type === "single" && deleteConfirmation.id) {
      const id = deleteConfirmation.id;
      setDeleteConfirmation({ show: false, type: "single" });
      setDeletingId(id);
      try {
        await backendApi(`testing-parts/${id}`);
        setTestingParts((prev) => prev.filter((part) => part.id !== id));
        setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
      } catch (err) {
        alert("Failed to delete testing part. Please try again.");
        console.error("Error deleting testing part:", err);
      } finally {
        setDeletingId(null);
      }
    } else if (deleteConfirmation.type === "multiple") {
      setDeleteConfirmation({ show: false, type: "multiple" });
      try {
        for (const id of selectedRows) {
          await backendApi(`testing-parts/${id}`);
        }
        setTestingParts((prev) =>
          prev.filter((part) => !selectedRows.includes(part.id)),
        );
        setSelectedRows([]);
      } catch (err) {
        alert("Failed to delete selected testing parts. Please try again.");
        console.error("Error deleting selected testing parts:", err);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      alert("Please select at least one row to delete.");
      return;
    }

    setDeleteConfirmation({
      show: true,
      type: "multiple",
      count: selectedRows.length,
    });
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredParts.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredParts.map((part) => part.id));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "start":
      case "form_started":
        return "bg-green-100 text-green-800 border-green-200";
      case "checkpoint_in_progress":
      case "checkpoint_updated":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "failed":
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
      case "stopped":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTimerStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "text-green-600 bg-green-50";
      case "stopped":
        return "text-gray-600 bg-gray-50";
      case "paused":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const filteredParts = testingParts.filter((part) => {
    const matchesSearch =
      part.chamber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.selectedTestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.parts.some((p) =>
        p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      part.machineDetails.ticketCode
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      part.status.toLowerCase() === filterStatus.toLowerCase() ||
      part.testStatus.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Check if database is empty (not loading, no error, no data)
  const isDatabaseEmpty = !loading && !error && testingParts.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading testing parts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Error Loading Data
            </h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchTestingParts}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="xl:max-w-full max-w-7xl ">

        <h2 className="font-bold text-lg ml-2 mb-3">Testing Detail Table</h2>
        {/* Main Content - Show empty state if no data in database */}
        {isDatabaseEmpty ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full mb-6">
                <Database className="h-10 w-10 text-blue-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                No Data Available
              </h2>

              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                There are no testing parts in the database yet. Start by
                creating your first testing record.
              </p>

              <div className="mt-10 pt-8 border-t border-gray-200 max-w-md mx-auto">
                <p className="text-sm text-gray-500">
                  Tips: Make sure your database is connected properly and the
                  testing parts collection exists.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Show table when there's data
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-y-auto  max-h-[300px]">
              <table className="w-full">
                <thead className="stick overflow-x-auto  max-h-[300px]">
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="py-4 px-6">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedRows.length === filteredParts.length &&
                            filteredParts.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Test Details
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Machine Info
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Parts
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status & Timer
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="text-gray-400">
                          <Search
                            size={48}
                            className="mx-auto mb-4 opacity-50"
                          />
                          <p className="text-lg font-medium">
                            No testing parts found
                          </p>
                          <p className="text-sm mt-2">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => (
                      <tr
                        key={part.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedRows.includes(part.id) ? "bg-blue-50" : ""
                        }`}
                      >
                        {/* Table rows remain the same... */}
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(part.id)}
                            onChange={() => toggleRowSelection(part.id)}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>

                        <td className="py-4 px-6">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-lg text-gray-900">
                                {part.selectedTestName}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(part.testStatus)}`}
                              >
                                {part.testStatus}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Chamber:</span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                  {part.chamber}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">ID:</span>
                                <span className="ml-2 font-mono text-gray-700">
                                  {part.id}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Ticket:</span>
                                <span className="ml-2">
                                  {part.machineDetails.ticketCode}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ... rest of your table cells ... */}
                        <td className="py-4 px-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">
                                {part.machineDescription}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {part.machineId}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                                  {part.machineDetails.project || "N/A"}
                                </span>
                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                                  {part.machineDetails.build || "N/A"}
                                </span>
                                <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs">
                                  {part.machineDetails.colour || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">
                                {part.totalParts} Parts
                              </span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  part.parts.length === part.totalParts
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {part.parts.length} loaded
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                              {part.parts.slice(0, 3).map((rawP: any, index) => {
                                // normalize possible stringified JSON
                                let p = rawP;
                                if (typeof rawP === 'string') {
                                  try {
                                    const parsed = JSON.parse(rawP);
                                    p = Array.isArray(parsed) ? parsed[0] || {} : parsed || {};
                                  } catch (e) {
                                    p = { partNumber: rawP };
                                  }
                                }

                                const topCos = p.cosmeticImages?.[0] || p.checkpointData?.[0]?.cosmeticImages?.[0] || null;
                                const topNon = p.nonCosmeticImages?.[0] || p.checkpointData?.[0]?.nonCosmeticImages?.[0] || null;

                                const parentCos =
                                  part.cosmeticImages?.[index] ||
                                  part.cosmeticImages?.[0] ||
                                  part.checkpointData?.[0]?.cosmeticImages?.[index] ||
                                  part.checkpointData?.[0]?.cosmeticImages?.[0] ||
                                  null;

                                const parentNon =
                                  part.nonCosmeticImages?.[index] ||
                                  part.nonCosmeticImages?.[0] ||
                                  part.checkpointData?.[0]?.nonCosmeticImages?.[index] ||
                                  part.checkpointData?.[0]?.nonCosmeticImages?.[0] ||
                                  null;

                                const thumbnail = topCos || topNon || parentCos || parentNon || null;
                                const src = thumbnail
                                  ? thumbnail.startsWith('/')
                                    ? `${getBackendApiUrl()}${thumbnail}`
                                    : thumbnail
                                  : null;

                                return src ? (
                                  <img
                                    key={index}
                                    src={src}
                                    alt={p.partNumber}
                                    className="w-10 h-10 object-cover rounded border"
                                  />
                                ) : (
                                  <span
                                    key={index}
                                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium"
                                  >
                                    {p.partNumber}
                                  </span>
                                );
                              })}
                              {part.parts.length > 3 && (
                                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                                  +{part.parts.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="space-y-3">
                            <div>
                              <div
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${getStatusColor(part.status)}`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    part.status === "active"
                                      ? "bg-green-500 animate-pulse"
                                      : part.status === "completed"
                                        ? "bg-purple-500"
                                        : "bg-gray-500"
                                  }`}
                                ></div>
                                <span className="text-sm font-medium">
                                  {part.status}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getTimerStatusColor(part.timerStatus)}`}
                            >
                              <span className="text-sm font-medium capitalize">
                                {part.timerStatus}
                              </span>
                            </div>

                            {part.testValue && (
                              <div className="text-sm">
                                <span className="text-gray-600">
                                  Test Value:
                                </span>
                                <span className="ml-2 font-semibold text-gray-800">
                                  {part.testValue} {part.testUnit}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="space-y-2 text-sm">
                            <div>
                              <div className="text-gray-500">Loaded</div>
                              <div className="font-medium">
                                {formatDate(part.loadedAt)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Updated</div>
                              <div className="font-medium">
                                {formatDate(part.lastUpdated)}
                              </div>
                            </div>
                            {part.isCompleted && part.completedAt && (
                              <div>
                                <div className="text-gray-500">Completed</div>
                                <div className="font-medium text-green-600">
                                  {formatDate(part.completedAt)}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(part.id)}
                              disabled={deletingId === part.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              {deletingId === part.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">{filteredParts.length}</span>{" "}
                  of{" "}
                  <span className="font-semibold">{testingParts.length}</span>{" "}
                  testing records
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmation.show}
          onOpenChange={(open) =>
            setDeleteConfirmation({ ...deleteConfirmation, show: open })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <AlertDialogTitle className="text-xl">
                  Confirm Deletion
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base pt-2">
                {deleteConfirmation.type === "single" ? (
                  <>
                    Are you sure you want to delete this testing record? This
                    action cannot be undone and will permanently remove all
                    associated data.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-red-600">
                      {deleteConfirmation.count}
                    </span>{" "}
                    selected testing record(s)? This action cannot be undone and
                    will permanently remove all associated data.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="px-4 py-2">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Loading overlay for delete */}
        {deletingId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="text-lg font-semibold">Deleting...</span>
              </div>
              <p className="text-gray-600 text-center">
                Please wait while we delete the testing record.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestingPartsTable;
