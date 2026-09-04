import { useEffect, useState } from 'react';
import { getHistoricalItemDescriptions, getHistoricalVendors } from '../../services/billService';

export type ReceiptServerStatus = 'checking' | 'connected' | 'no-key' | 'error';

export function useReceiptAnalysisProgress(isAnalyzing: boolean) {
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isAnalyzing) {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        setAnalysisProgress((previous) => {
          if (previous < 30) return previous + 2;
          if (previous < 60) return previous + 1;
          if (previous < 90) return previous + 0.5;
          if (previous < 98) return previous + 0.1;
          return previous;
        });
      }, 100);
    } else {
      setAnalysisProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  return analysisProgress;
}

export function useReceiptHistoryLookups() {
  const [historicalDescriptions, setHistoricalDescriptions] = useState<string[]>([]);
  const [historicalVendors, setHistoricalVendors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [descriptions, vendors] = await Promise.all([
        getHistoricalItemDescriptions(),
        getHistoricalVendors(),
      ]);

      if (!active) return;
      setHistoricalDescriptions(descriptions);
      setHistoricalVendors(vendors);
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return {
    historicalDescriptions,
    historicalVendors,
    setHistoricalVendors,
  };
}

export function useReceiptServerStatus() {
  const [serverStatus, setServerStatus] = useState<ReceiptServerStatus>('checking');

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const response = await fetch('/api/health');
        if (!active) return;

        if (!response.ok) {
          setServerStatus('error');
          return;
        }

        const data = await response.json();
        setServerStatus(data.aiKeyReady ? 'connected' : 'no-key');
      } catch {
        if (active) setServerStatus('error');
      }
    };

    void check();
    return () => {
      active = false;
    };
  }, []);

  return serverStatus;
}
