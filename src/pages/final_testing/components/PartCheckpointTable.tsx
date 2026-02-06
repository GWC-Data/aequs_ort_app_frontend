import React, { useState, useEffect, useMemo } from "react";
import {
  Part,
  CustomColumn,
  PartCheckpointStatus,
  CustomColumnData,
} from "../types";
import {
  formatDate,
  getCheckpointsForPart,
  getCheckpointLabel,
  getRowLabel,
} from "../utils/helpers";
import { getBackendApiUrl } from "@/lib/backendApi";

interface PartCheckpointTableProps {
  part: Part;
  partIndex: number;
  onRowSubmit: (partIndex: number, checkpointIndex: number) => void;
  onStatusChange: (
    partIndex: number,
    checkpointIndex: number,
    status: "pass" | "fail" | "",
  ) => void;
  partCheckpointStatus: PartCheckpointStatus;
  onT0ImageComplete: (partIndex: number) => void;
  customColumns: CustomColumn[];
  customColumnData: CustomColumnData;
  onCustomColumnChange: (
    partIndex: number,
    checkpointIndex: number,
    columnId: string,
    value: string,
  ) => void;
  onCustomColumnImageUpload: (
    partIndex: number,
    checkpointIndex: number,
    columnId: string,
    files: FileList | null,
  ) => void;
  onDeleteColumn: (columnId: string) => void;
}

const PartCheckpointTable: React.FC<PartCheckpointTableProps> = ({
  part,
  partIndex,
  onRowSubmit,
  onStatusChange,
  partCheckpointStatus,
  onT0ImageComplete,
  customColumns,
  customColumnData,
  onCustomColumnChange,
  onCustomColumnImageUpload,
  onDeleteColumn,
}) => {
  const checkpoints = getCheckpointsForPart(part);
  const currentCheckpointIndex = part.checkpointInfo?.checkpointIndex || 0;
  const hasNoCheckpoints =
    checkpoints.length === 0 ||
    (checkpoints.length === 1 && checkpoints[0] === 0);

  const t0StatusFromData = useMemo(() => {
    const t0Entry = part.checkpointData?.find((cp) => cp.checkpointIndex === 0);
    return (t0Entry?.status as "pass" | "fail" | "") || "";
  }, [part.checkpointData]);

  const partHasColumnData = useMemo(() => {
    const indexPrefix = `${partIndex}-`;

    const customDataKeys = Object.keys(customColumnData).filter((key) =>
      key.startsWith(indexPrefix),
    );

    return (column: CustomColumn) => {
      const colId = column.id;

      // Pending edits in customColumnData
      const hasPending = customDataKeys.some((key) => key.endsWith(`-${colId}`));
      if (hasPending) return true;

      // Existing checkpoint data
      const hasCheckpointValue = part.checkpointData?.some((cp) =>
        cp.customData && cp.customData[colId] !== undefined,
      );
      if (hasCheckpointValue) return true;

      // T0 legacy customImages using label
      if (Array.isArray(part.customImages)) {
        const normalizedId = (colId || "").trim().toLowerCase();
        const normalizedName = (column.name || "").trim().toLowerCase();
        const hasLabelMatch = part.customImages.some((img) => {
          const lbl = (img.label || "").trim().toLowerCase();
          return lbl === normalizedId || lbl === normalizedName;
        });
        if (hasLabelMatch) return true;
      }

      return false;
    };
  }, [customColumnData, partIndex, part.customImages, part.checkpointData]);

  const visibleColumns = useMemo(() => {
    // Always show all configured custom columns so newly added columns appear immediately
    return customColumns;
  }, [customColumns]);

  const imageColumns = useMemo(
    () => visibleColumns.filter((column) => column.type === "image"),
    [visibleColumns],
  );

  const getCheckpointEntry = (checkpointIndex: number) =>
    part.checkpointData?.find((cp) => cp.checkpointIndex === checkpointIndex);

  const parseImageList = (value?: string): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const getColumnValue = (
    checkpointIndex: number,
    column: CustomColumn,
  ): string => {
    const key = `${partIndex}-${checkpointIndex}-${column.id}`;
    const pendingValue = customColumnData[key];
    if (pendingValue) {
      return pendingValue;
    }

    const existingEntry = getCheckpointEntry(checkpointIndex);
    if (existingEntry?.customData?.[column.id]) {
      return existingEntry.customData[column.id];
    }

    if (checkpointIndex === 0 && Array.isArray(part.customImages)) {
      const columnLabel = (column.name || column.id || "").trim().toLowerCase();
      const matches = part.customImages
        .filter((img) => (img.label || "").trim().toLowerCase() === columnLabel)
        .map((img) => img.path)
        .filter(Boolean);

      if (matches.length > 0) {
        return JSON.stringify(matches);
      }
    }

    return "";
  };

  const hasImagesForColumn = (
    checkpointIndex: number,
    column: CustomColumn,
  ) => {
    const value = getColumnValue(checkpointIndex, column);
    return parseImageList(value).length > 0;
  };

  const checkpointHasRequiredImages = (checkpointIndex: number) => {
    if (imageColumns.length === 0) {
      return true;
    }

    return imageColumns.every((column) =>
      hasImagesForColumn(checkpointIndex, column),
    );
  };

  const t0Complete = checkpointHasRequiredImages(0);

  useEffect(() => {
    if (t0Complete && !part.t0ImagesComplete) {
      onT0ImageComplete(partIndex);
    }
  }, [t0Complete, part.t0ImagesComplete, partIndex, onT0ImageComplete]);

  const isT0Checkpoint = (rowIndex: number) => rowIndex === 0;

  const isReadyForSubmission = (rowIndex: number) => {
    const hasStatus = partCheckpointStatus[`${partIndex}-${rowIndex}`];

    if (hasNoCheckpoints && rowIndex === 0) {
      return checkpointHasRequiredImages(rowIndex) && hasStatus;
    }

    if (rowIndex > 0) {
      return checkpointHasRequiredImages(rowIndex) && hasStatus;
    }

    return false;
  };

  // Helper to parse and display custom column images
  const renderCustomColumnImages = (columnValue?: string) => {
    try {
      const imagePaths = JSON.parse(columnValue);
      if (Array.isArray(imagePaths) && imagePaths.length > 0) {
        return (
          <div className="flex gap-2 flex-wrap">
            {imagePaths.map((img: string, idx: number) => {
              const src = img.startsWith("/")
                ? `${getBackendApiUrl()}${img}`
                : img;
              return (
                <img
                  key={idx}
                  src={src}
                  alt={`Custom ${idx + 1}`}
                  className="w-12 h-12 object-cover rounded border cursor-pointer"
                  onClick={() => window.open(src, "_blank")}
                />
              );
            })}
          </div>
        );
      }
    } catch (e) {
      // Not JSON, might be a regular value
    }
    return null;
  };

  return (
    <div className="mb-8 border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-100 p-4 border-b border-gray-300">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {part.partNumber} - {part.serialNumber}
            </h3>
            <p className="text-sm text-gray-600">Ticket: {part.ticketCode}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasNoCheckpoints ? (
              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                No Checkpoints - Direct T0 Test
              </span>
            ) : (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  currentCheckpointIndex >= checkpoints.length - 1
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {currentCheckpointIndex >= checkpoints.length - 1
                  ? "Ready for Unload"
                  : `Checkpoint ${currentCheckpointIndex + 1} of ${checkpoints.length - 1}`}
              </span>
            )}
            {currentCheckpointIndex === 0 &&
              t0Complete &&
              !hasNoCheckpoints && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  ✓ T0 Complete
                </span>
              )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                S.No
              </th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Checkpoint
              </th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Label
              </th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Test Date
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{col.name}</span>
                    <button
                      onClick={() => onDeleteColumn(col.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                      title="Delete column"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {hasNoCheckpoints ? (
              /* For parts with NO checkpoints - show only T0 with status */
              <tr className="bg-blue-50">
                <td className="border border-gray-300 px-4 py-3 text-center">
                  1
                </td>
                <td className="border border-gray-300 px-4 py-3 font-medium">
                  T0
                </td>
                <td className="border border-gray-300 px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Pre-Test
                  </span>
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm">
                  {formatDate(part.loadedAt)}
                </td>
                {visibleColumns.map((col) => {
                  const colValue = getColumnValue(0, col);
                  return (
                    <td
                      key={col.id}
                      className="border border-gray-300 px-4 py-3"
                    >
                      {col.type === "image" ? (
                        <div>
                          <label className="block cursor-pointer w-full">
                            <span className="inline-block px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs mb-1">
                              Upload {col.name}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) =>
                                onCustomColumnImageUpload(
                                  partIndex,
                                  0,
                                  col.id,
                                  e.target.files,
                                )
                              }
                              className="hidden"
                            />
                          </label>
                          {renderCustomColumnImages(colValue)}
                        </div>
                      ) : col.type === "dropdown" ? (
                        <select
                          value={colValue}
                          onChange={(e) =>
                            onCustomColumnChange(
                              partIndex,
                              0,
                              col.id,
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Select...</option>
                          {col.options.map((opt, idx) => (
                            <option key={idx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : col.type === "date" ? (
                        <input
                          type="date"
                          value={colValue}
                          onChange={(e) =>
                            onCustomColumnChange(
                              partIndex,
                              0,
                              col.id,
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                      ) : col.type === "number" ? (
                        <input
                          type="number"
                          value={colValue}
                          onChange={(e) =>
                            onCustomColumnChange(
                              partIndex,
                              0,
                              col.id,
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={colValue}
                          onChange={(e) =>
                            onCustomColumnChange(
                              partIndex,
                              0,
                              col.id,
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                          placeholder={`Enter ${col.name}`}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="border border-gray-300 px-4 py-3">
                  <select
                    value={partCheckpointStatus[`${partIndex}-0`] ?? t0StatusFromData}
                    onChange={(e) =>
                      onStatusChange(
                        partIndex,
                        0,
                        e.target.value as "pass" | "fail" | "",
                      )
                    }
                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none ${
                      partCheckpointStatus[`${partIndex}-0`] === "pass"
                        ? "border-green-300 bg-green-50"
                        : partCheckpointStatus[`${partIndex}-0`] === "fail"
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Status</option>
                    <option value="pass" className="text-green-700">
                      Pass
                    </option>
                    <option value="fail" className="text-red-700">
                      Fail
                    </option>
                  </select>
                </td>
                <td className="border border-gray-300 px-4 py-3">
                  <button
                    onClick={() => onRowSubmit(partIndex, 0)}
                    disabled={!isReadyForSubmission(0)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      isReadyForSubmission(0)
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Submit Test
                  </button>
                </td>
              </tr>
            ) : (
              /* For parts WITH checkpoints - show all rows but enable only current */
              checkpoints.map((checkpointValue, rowIndex) => {
                console.log(
                  `\n=== RENDERING ROW ${rowIndex} (checkpoint ${checkpointValue}) ===`,
                );

                // Hide the final checkpoint row
                // if (rowIndex === checkpoints.length - 1) {
                //   console.log(`  ❌ Hiding - final checkpoint row`);
                //   return null;
                // }
                if (rowIndex === checkpoints.length - 1) {
                  console.log(`  ✅ Showing final checkpoint row for unload`);
                  // Don't return null - show the row but mark it specially
                }

                // Check if this checkpoint has been submitted
                const existingData = part.checkpointData?.find(
                  (cp) => cp.checkpointIndex === rowIndex,
                );
                const isSubmitted =
                  existingData !== undefined && existingData.status !== null;

                console.log(`  existingData:`, existingData);
                console.log(`  isSubmitted:`, isSubmitted);

                // ✅ DEBUG LOGGING
                if (rowIndex <= currentCheckpointIndex) {
                  console.log(`  Row ${rowIndex} details:`, {
                    rowIndex,
                    currentCheckpointIndex,
                    hasExistingData: !!existingData,
                    status: existingData?.status,
                    isSubmitted,
                    cosmeticImages: existingData?.cosmeticImages?.length || 0,
                    nonCosmeticImages:
                      existingData?.nonCosmeticImages?.length || 0,
                  });
                }

                // Check if part failed at or before this checkpoint
                const failedCheckpoint = part.checkpointData?.find(
                  (cp) => cp.status === "fail",
                );
                const failedAtIndex = failedCheckpoint?.checkpointIndex;

                // If part failed and this row is AFTER the failure point, hide it
                if (failedAtIndex !== undefined && rowIndex > failedAtIndex) {
                  return null;
                }

                // ✅ FIX: Treat submitted checkpoints as "past" rows, even if they match currentCheckpointIndex
                const isCurrentRow =
                  rowIndex === currentCheckpointIndex && !isSubmitted;
                const isPastRow =
                  rowIndex < currentCheckpointIndex || isSubmitted;
                const isFutureRow =
                  rowIndex > currentCheckpointIndex && !isSubmitted;

                // ✅ MORE DEBUG
                console.log(`  Display logic for row ${rowIndex}:`, {
                  isCurrentRow,
                  isPastRow,
                  isFutureRow,
                  bgColor: isCurrentRow ? "blue" : isPastRow ? "green" : "gray",
                  willShowImages:
                    isPastRow && existingData?.cosmeticImages?.length > 0,
                });

                if (!isPastRow && !isCurrentRow && !isFutureRow) {
                  console.log(
                    `  ⚠️ WARNING: Row ${rowIndex} is neither past, current, nor future!`,
                  );
                }

                const label = getRowLabel(rowIndex);
                const checkpointLabel = getCheckpointLabel(
                  checkpointValue,
                  rowIndex,
                );
                const currentStatus =
                  partCheckpointStatus[`${partIndex}-${rowIndex}`] ||
                  existingData?.status ||
                  "";

                const statusEnabled = isCurrentRow && rowIndex > 0;
                const submitEnabled = isCurrentRow && rowIndex > 0;

                return (
                  <tr
                    key={rowIndex}
                    className={`${
                      isCurrentRow
                        ? "bg-blue-50"
                        : isPastRow
                          ? "bg-green-50"
                          : "bg-gray-50"
                    }`}
                  >
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 font-medium">
                      {checkpointLabel}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          label === "Pre-Test"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      {existingData?.testDate
                        ? formatDate(existingData.testDate)
                        : rowIndex === 0
                          ? formatDate(part.loadedAt)
                          : "-"}
                    </td>

                    {/* Custom Columns */}
                    {visibleColumns.map((col) => {
                      const colValue = getColumnValue(rowIndex, col);
                      const existingCustomValue =
                        existingData?.customData?.[col.id] || "";

                      return (
                        <td
                          key={col.id}
                          className="border border-gray-300 px-4 py-3"
                        >
                          {isCurrentRow ? (
                            col.type === "image" ? (
                              <div>
                                <label className="block cursor-pointer w-full">
                                  <span className="inline-block px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs mb-1">
                                    Upload {col.name}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) =>
                                      onCustomColumnImageUpload(
                                        partIndex,
                                        rowIndex,
                                        col.id,
                                        e.target.files,
                                      )
                                    }
                                    className="hidden"
                                  />
                                </label>
                                {renderCustomColumnImages(colValue)}
                              </div>
                            ) : col.type === "dropdown" ? (
                              <select
                                value={colValue}
                                onChange={(e) =>
                                  onCustomColumnChange(
                                    partIndex,
                                    rowIndex,
                                    col.id,
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                              >
                                <option value="">Select...</option>
                                {col.options.map((opt, idx) => (
                                  <option key={idx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : col.type === "date" ? (
                              <input
                                type="date"
                                value={colValue}
                                onChange={(e) =>
                                  onCustomColumnChange(
                                    partIndex,
                                    rowIndex,
                                    col.id,
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                              />
                            ) : col.type === "number" ? (
                              <input
                                type="number"
                                value={colValue}
                                onChange={(e) =>
                                  onCustomColumnChange(
                                    partIndex,
                                    rowIndex,
                                    col.id,
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                              />
                            ) : (
                              <input
                                type="text"
                                value={colValue}
                                onChange={(e) =>
                                  onCustomColumnChange(
                                    partIndex,
                                    rowIndex,
                                    col.id,
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                placeholder={`Enter ${col.name}`}
                              />
                            )
                          ) : isPastRow ? (
                            col.type === "image" ? (
                              renderCustomColumnImages(
                                existingCustomValue || colValue,
                              ) || (
                                <span className="text-sm text-gray-700">-</span>
                              )
                            ) : (
                              <span className="text-sm text-gray-700">
                                {existingCustomValue || colValue || "-"}
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Status */}
                    <td className="border border-gray-300 px-4 py-3">
                      {isT0Checkpoint(rowIndex) ? (
                        <span className="text-gray-500 text-sm font-medium">
                          N/A
                        </span>
                      ) : statusEnabled ? (
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            onStatusChange(
                              partIndex,
                              rowIndex,
                              e.target.value as "pass" | "fail" | "",
                            )
                          }
                          className={`w-full px-2 py-1 text-sm border rounded focus:outline-none ${
                            currentStatus === "pass"
                              ? "border-green-300 bg-green-50"
                              : currentStatus === "fail"
                                ? "border-red-300 bg-red-50"
                                : "border-gray-300"
                          }`}
                        >
                          <option value="">Select Status</option>
                          <option value="pass" className="text-green-700">
                            Pass
                          </option>
                          <option value="fail" className="text-red-700">
                            Fail
                          </option>
                        </select>
                      ) : isPastRow && existingData ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            existingData?.status === "pass"
                              ? "bg-green-100 text-green-800"
                              : existingData?.status === "fail"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {existingData?.status === "pass"
                            ? "✓ Pass"
                            : existingData?.status === "fail"
                              ? "✗ Fail"
                              : "N/A"}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="border border-gray-300 px-4 py-3">
                      {isT0Checkpoint(rowIndex) ? (
                        <span className="text-gray-500 text-sm font-medium">
                          Auto-Save
                        </span>
                      ) : submitEnabled ? (
                        <button
                          onClick={() => onRowSubmit(partIndex, rowIndex)}
                          disabled={!isReadyForSubmission(rowIndex)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            isReadyForSubmission(rowIndex)
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Submit Checkpoint
                        </button>
                      ) : isPastRow ? (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Submitted
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartCheckpointTable;
