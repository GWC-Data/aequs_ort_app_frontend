import { useState, useCallback } from 'react';
import { ChamberLoad } from '../types';
import {
  fetchChamberLoads,
  createChamberLoad,
  updateChamberLoad as updateChamberLoadRequest,
  deleteChamberLoad as deleteChamberLoadRequest,
  pauseChamberLoad as pauseChamberLoadRequest,
  resumeChamberLoad as resumeChamberLoadRequest,
  completeChamberLoad as completeChamberLoadRequest,
  startChamberLoad as startChamberLoadRequest,
  ChamberLoadPayload,
  ChamberLoadDto,
} from '@/lib/backendApi';

const normalizeTimerStatus = (status?: string | null): 'start' | 'stop' | 'paused' => {
  if (status === 'start') return 'start';
  if (status === 'pause' || status === 'paused') return 'paused';
  return 'stop';
};

const normalizeTestStatus = (status?: string | null): 'pending' | 'start' | 'completed' | 'paused' => {
  if (status === 'start') return 'start';
  if (status === 'completed') return 'completed';
  if (status === 'pause' || status === 'paused') return 'paused';
  return 'pending';
};

const getDurationMilliseconds = (
  load: { testValue?: number | null; testUnit?: string | null; duration?: number | null; machineDetails?: any }
): number => {
  const rawValue = load.testValue ?? load.duration ?? 0;
  if (!rawValue) return 0;

  const unit = (load.testUnit || '').toLowerCase();
  switch (unit) {
    case 'hour':
    case 'hours':
      return rawValue * 60 * 60 * 1000;
    case 'minute':
    case 'minutes':
      return rawValue * 60 * 1000;
    case 'second':
    case 'seconds':
      return rawValue * 1000;
    case 'day':
    case 'days':
      return rawValue * 24 * 60 * 60 * 1000;
    case 'cycle':
    case 'cycles':
      if (load.machineDetails?.cycleDuration) {
        return rawValue * Number(load.machineDetails.cycleDuration);
      }
      return rawValue * 60 * 60 * 1000;
    default:
      return rawValue * 60 * 60 * 1000;
  }
};

const calculateEstimatedCompletion = (dto: ChamberLoadDto): string | null => {
  if (!dto.timerStartTime) {
    return null;
  }

  const startTime = new Date(dto.timerStartTime);
  if (Number.isNaN(startTime.getTime())) {
    return null;
  }

  const durationMs = getDurationMilliseconds(dto);
  const pausedMs = (dto.totalPausedTime || 0) * 1000;
  const completion = new Date(startTime.getTime() + durationMs + pausedMs);

  return Number.isNaN(completion.getTime()) ? null : completion.toISOString();
};

const normalizeDto = (dto: ChamberLoadDto): ChamberLoad => ({
  id: dto.id,
  chamber: dto.chamber,
  machineId: dto.machineId,
  machineDescription: dto.machineDescription,
  parts: Array.isArray(dto.parts) ? dto.parts : [],
  loadedAt: dto.loadedAt ?? null,
  duration: dto.testValue ?? dto.duration ?? null,
  status: (dto.status as ChamberLoad['status']) || 'loaded',
  testStatus: normalizeTestStatus(dto.testStatus),
  timerStatus: normalizeTimerStatus(dto.timerStatus),
  timerStartTime: dto.timerStartTime,
  actualStartTime: dto.actualStartTime,
  estimatedCompletion: calculateEstimatedCompletion(dto),
  totalPausedTime: dto.totalPausedTime,
  lastPausedAt: dto.lastPausedAt,
  pausedElapsedTime: dto.pausedElapsedTime,
  testUnit: dto.testUnit ?? null,
  testValue: dto.testValue ?? null,
  testStarted: dto.testStarted,
  isCompleted: dto.isCompleted,
  completedAt: dto.completedAt,
  operator: dto.operator,
  lastUpdated: dto.lastUpdated ?? dto.updatedAt,
  totalParts: dto.totalParts,
  selectedTestId: dto.selectedTestId,
  selectedTestName: dto.selectedTestName,
  machineDetails: dto.machineDetails,
  testResults: dto.testResults,
  testNotes: dto.testNotes,
  actualTestValue: dto.actualTestValue,
  ticketCode: dto.ticketCode,
  isCombinedTest: dto.isCombinedTest,
  combinedTestId: dto.combinedTestId,
  isSingleTicketLoad: dto.isSingleTicketLoad,
  sequenceNumber: dto.sequenceNumber,
  totalInSequence: dto.totalInSequence,
  allocationId: dto.allocationId,
  ortId: dto.ortId,
});

const normalizeStatusForApi = (status?: string | null): string | undefined => {
  if (!status) return undefined;
  if (status === 'paused') return 'pause';
  if (status === 'not_started') return 'pending';
  return status;
};

const prepareUpdatesForApi = (updates: Partial<ChamberLoadPayload>): Partial<ChamberLoadPayload> => {
  const payload: Partial<ChamberLoadPayload> = { ...updates };
  if (payload.testStatus) {
    payload.testStatus = normalizeStatusForApi(payload.testStatus);
  }
  if (payload.timerStatus) {
    payload.timerStatus = normalizeStatusForApi(payload.timerStatus);
  }
  return payload;
};

export const useChamberLoads = () => {
  const [chamberLoads, setChamberLoads] = useState<ChamberLoad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheLoads = useCallback((loads: ChamberLoad[]) => {
    setChamberLoads(loads);
    try {
      localStorage.setItem('chamberLoads', JSON.stringify(loads));
    } catch (err) {
      console.error('Unable to persist chamber loads cache', err);
    }
  }, []);

  const refreshChamberLoads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChamberLoads();
      const normalized = data.map(normalizeDto);
      cacheLoads(normalized);
      setError(null);
      return normalized;
    } catch (err) {
      console.error('Error fetching chamber loads', err);
      setError('Unable to fetch chamber loads');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cacheLoads]);

  const addChamberLoad = useCallback(async (payload: ChamberLoadPayload) => {
    await createChamberLoad(payload);
  }, []);

  const updateChamberLoad = useCallback(async (id: number, updates: Partial<ChamberLoadPayload>) => {
    await updateChamberLoadRequest(id, prepareUpdatesForApi(updates));
  }, []);

  const deleteChamberLoad = useCallback(async (id: number) => {
    await deleteChamberLoadRequest(id);
  }, []);

  const startChamberLoad = useCallback(async (id: number) => {
    await startChamberLoadRequest(id);
  }, []);

  const pauseChamberLoad = useCallback(async (id: number) => {
    await pauseChamberLoadRequest(id);
  }, []);

  const resumeChamberLoad = useCallback(async (id: number) => {
    await resumeChamberLoadRequest(id);
  }, []);

  const completeChamberLoad = useCallback(async (id: number) => {
    await completeChamberLoadRequest(id);
  }, []);

  const calculateRemainingTime = useCallback((load: ChamberLoad) => {
    if (load.timerStatus === 'paused') {
      return 'Paused';
    }

    if (load.timerStatus !== 'start' || !load.timerStartTime) {
      return null;
    }

    const durationMs = getDurationMilliseconds(load);
    if (!durationMs) {
      return null;
    }

    const startTime = new Date(load.timerStartTime);
    if (Number.isNaN(startTime.getTime())) {
      return null;
    }

    const pausedMs = (load.totalPausedTime || 0) * 1000;
    const endTime = new Date(startTime.getTime() + durationMs + pausedMs);
    const now = new Date();

    if (now > endTime) {
      return 'Completed';
    }

    const remainingMs = endTime.getTime() - now.getTime();
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours}h ${minutes}m remaining`;
  }, []);

  const formatDateTime = useCallback((dateString?: string | null) => {
    if (!dateString) {
      return 'N/A';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  const formatDuration = useCallback((value?: number | null) => {
    if (!value || Number.isNaN(value)) {
      return '0h';
    }

    if (value >= 24) {
      const days = Math.floor(value / 24);
      const remainingHours = Math.floor(value % 24);
      return `${days}d ${remainingHours}h`;
    }

    return `${value}h`;
  }, []);

  return {
    chamberLoads,
    loading,
    error,
    refreshChamberLoads,
    addChamberLoad,
    updateChamberLoad,
    deleteChamberLoad,
    startChamberLoad,
    pauseChamberLoad,
    resumeChamberLoad,
    completeChamberLoad,
    calculateRemainingTime,
    formatDateTime,
    formatDuration,
  };
};