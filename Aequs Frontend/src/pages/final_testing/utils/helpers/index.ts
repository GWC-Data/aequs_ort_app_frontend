import { Part } from '../../types';

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const getCheckpointsForPart = (part: Part): number[] => {
  if (part.checkpointInfo?.checkpoints && part.checkpointInfo.checkpoints.length > 0) {
    return part.checkpointInfo.checkpoints;
  }
  return [0];
};

const normalizeUnit = (unit?: string): string => {
  if (!unit) return "hr";
  const u = unit.trim().toLowerCase();
  if (u.startsWith("hour") || u.startsWith("hr")) return "hr";
  if (u.startsWith("cycle")) return "cycle";
  if (u.startsWith("drop")) return "drop";
  return u || "hr";
};

export const getCheckpointLabel = (
  checkpointValue: number,
  index: number,
  unit?: string,
): string => {
  if (index === 0 || checkpointValue === 0) return "T0";
  const suffix = normalizeUnit(unit);
  return `${checkpointValue}${suffix}`;
};

export const getRowLabel = (index: number): string => {
  if (index === 0) return "Pre-Test";
  return "Post-Test";
};

export const initializeData = () => {
  //   const storedData = localStorage.getItem('chamberloads');
  //   if (!storedData) {
  //     const sampleData = {
  //       "id": 2,
  //       "chamber": "AQS-ORT-THC-1",
  //       "machineId": "AQS-ORT-THC-1",
  //       "machineDescription": "Heat Soak",
  //       "parts": [
  //         {
  //           "testId": "test-1769533072619-6",
  //           "loadedAt": "2026-01-27T17:27:05.553Z",
  //           "testName": "⏰ Heat Soak",
  //           "testUnit": "Hours",
  //           "hasImages": true,
  //           "testNotes": null,
  //           "testValue": 72,
  //           "checkpoint": null,
  //           "partNumber": "PART-001",
  //           "scanStatus": "OK",
  //           "testStatus": "start",
  //           "ticketCode": "0001_FLS_S_ANO_NP_020",
  //           "completedAt": null,
  //           "isCompleted": false,
  //           "testResults": null,
  //           "testStarted": true,
  //           "serialNumber": "SN001",
  //           "stage1Record": {
  //             "id": 1,
  //             "build": "GTR5",
  //             "colour": "Stardust",
  //             "reason": "NPI",
  //             "source": "Entire",
  //             "status": "Ready for OQC Approval",
  //             "anoType": "ANO",
  //             "project": "FLASH",
  //             "dateTime": "2026-01-27",
  //             "createdAt": "2026-01-27T16:35:18.000Z",
  //             "ticketCode": "0001_FLS_S_ANO_NP_020",
  //             "oqcApproved": false,
  //             "totalQuantity": 20
  //           },
  //           "testCondition": "Temp : 65°C RH : 90%",
  //           "checkpointInfo": {
  //             "checkpoint": null,
  //             "checkpoints": [],
  //             "checkpointIndex": 0,
  //             "totalCheckpoints": 1,
  //             "originalCheckPoints": ""
  //           },
  //           "cosmeticImages": [
  //             "https://via.placeholder.com/150/0000FF/FFFFFF?text=PART-001-Pre"
  //           ],
  //           "actualTestValue": null,
  //           "checkpointIndex": 0,
  //           "allocationTestId": "test-1769533072619-6",
  //           "totalCheckpoints": 1,
  //           "nonCosmeticImages": [
  //             "https://via.placeholder.com/150/FF0000/FFFFFF?text=PART-001-NonPre"
  //           ],
  //           "allocationTicketCode": "0001_FLS_S_ANO_NP_020",
  //           "checkpointData": [],
  //           "t0ImagesComplete": false
  //         },
  //         {
  //           "testId": "test-1769533072619-7",
  //           "loadedAt": "2026-01-27T17:27:05.553Z",
  //           "testName": "⏰ Heat Soak",
  //           "testUnit": "Hours",
  //           "hasImages": true,
  //           "testNotes": null,
  //           "testValue": 72,
  //           "checkpoint": null,
  //           "partNumber": "PART-002",
  //           "scanStatus": "OK",
  //           "testStatus": "start",
  //           "ticketCode": "0002_FLS_S_ANO_NP_021",
  //           "completedAt": null,
  //           "isCompleted": false,
  //           "testResults": null,
  //           "testStarted": true,
  //           "serialNumber": "SN002",
  //           "stage1Record": {
  //             "id": 2,
  //             "build": "GTR5",
  //             "colour": "Stardust",
  //             "reason": "NPI",
  //             "source": "Entire",
  //             "status": "Ready for OQC Approval",
  //             "anoType": "ANO",
  //             "project": "FLASH",
  //             "dateTime": "2026-01-27",
  //             "createdAt": "2026-01-27T16:35:18.000Z",
  //             "ticketCode": "0002_FLS_S_ANO_NP_021",
  //             "oqcApproved": false,
  //             "totalQuantity": 20
  //           },
  //           "testCondition": "Temp : 65°C RH : 90%",
  //           "checkpointInfo": {
  //             "checkpoint": null,
  //             "checkpoints": [0, 24, 48, 72],
  //             "checkpointIndex": 0,
  //             "totalCheckpoints": 7,
  //             "originalCheckPoints": "CP:T0, 24hr, 48hr, 72hr"
  //           },
  //           "cosmeticImages": [
  //             "https://via.placeholder.com/150/0000FF/FFFFFF?text=PART-002-Pre"
  //           ],
  //           "actualTestValue": null,
  //           "checkpointIndex": 0,
  //           "allocationTestId": "test-1769533072619-7",
  //           "totalCheckpoints": 7,
  //           "nonCosmeticImages": [
  //             "https://via.placeholder.com/150/FF0000/FFFFFF?text=PART-002-NonPre"
  //           ],
  //           "allocationTicketCode": "0002_FLS_S_ANO_NP_021",
  //           "checkpointData": [],
  //           "t0ImagesComplete": false
  //         },
  //       ],
  //       "loadedAt": "2026-01-27T17:27:05.000Z",
  //       "duration": 72,
  //       "status": "loaded",
  //       "testStatus": "start",
  //       "timerStatus": "start",
  //       "timerStartTime": "2026-01-27T17:27:05.000Z",
  //       "actualStartTime": "2026-01-27T17:27:05.000Z",
  //       "estimatedCompletion": "2026-02-17T17:27:05.000Z",
  //       "totalPausedTime": 0,
  //       "lastPausedAt": null,
  //       "pausedElapsedTime": null,
  //       "testUnit": "Hours",
  //       "testValue": 72,
  //       "testStarted": true,
  //       "isCompleted": false,
  //       "completedAt": null,
  //       "operator": "System",
  //       "lastUpdated": "2026-01-27T17:27:05.000Z",
  //       "totalParts": 2,
  //       "currentCheckpointIndex": 0,
  //       "checkpoints": [0, 24, 48, 72]
  //     };
  //     localStorage.setItem('chamberloads', JSON.stringify(sampleData));
  //   }
  console.log("hi")
};