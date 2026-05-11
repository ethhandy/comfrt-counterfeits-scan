'use client';

import { useState, useCallback, useRef } from 'react';
import type { ScoredListing, JobStats, ScanEvent } from '@/lib/types';
import { LOCAL_ELAPSED_INTERVAL_MS } from '@/lib/const/scan';

export interface ScanJobState {
  isScanning: boolean;
  isDone: boolean;
  results: ScoredListing[];
  stats: JobStats | null;
  localElapsed: number;
}

export interface ScanJobActions {
  startScan: () => void;
  stopScan: () => void;
}

export function useScanJob(): ScanJobState & ScanJobActions {
  const [isScanning, setIsScanning]   = useState(false);
  const [isDone, setIsDone]           = useState(false);
  const [results, setResults]         = useState<ScoredListing[]>([]);
  const [stats, setStats]             = useState<JobStats | null>(null);
  const [localElapsed, setLocalElapsed] = useState(0);

  const esRef        = useRef<EventSource | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopScan = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsScanning(false);
  }, []);

  const startScan = useCallback(() => {
    setIsScanning(true);
    setIsDone(false);
    setResults([]);
    setStats(null);
    setLocalElapsed(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(
      () => setLocalElapsed(Date.now() - startTimeRef.current),
      LOCAL_ELAPSED_INTERVAL_MS
    );

    const es = new EventSource('/api/scan');
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as ScanEvent;
        switch (event.type) {
          case 'result':
            setResults((prev) => [...prev, event.data].sort((a, b) => b.finalScore - a.finalScore));
            break;
          case 'stats':
            setStats(event.data);
            break;
          case 'done':
            setStats(event.finalStats);
            setIsDone(true);
            setIsScanning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            es.close();
            esRef.current = null;
            break;
          case 'error':
            stopScan();
            break;
        }
      } catch { /* ignored */ }
    };

    es.onerror = () => {
      stopScan();
    };
  }, [stopScan]);

  return { isScanning, isDone, results, stats, localElapsed, startScan, stopScan };
}
