import { useCallback } from 'react';
import { useApp } from '../context/AppContext';

export const useSettings = () => {
  const { settings, refreshSettings } = useApp();

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    if (!window.daytrack) return null;
    return await window.daytrack.getSetting(key);
  }, []);

  const setSetting = useCallback(async (key: string, value: string): Promise<void> => {
    if (!window.daytrack) return;
    await window.daytrack.setSetting(key, value);
    await refreshSettings();
  }, [refreshSettings]);

  const setAutoStartup = useCallback(async (enabled: boolean): Promise<void> => {
    if (!window.daytrack) return;
    await window.daytrack.setAutoStartup(enabled);
    await setSetting('autoStartup', enabled ? 'true' : 'false');
  }, [setSetting]);

  const exportToCSV = useCallback(async (startDate: string, endDate: string): Promise<string | null> => {
    if (!window.daytrack) return null;
    return await window.daytrack.exportToCSV(startDate, endDate);
  }, []);

  const backupData = useCallback(async (): Promise<string | null> => {
    if (!window.daytrack) return null;
    return await window.daytrack.backupData();
  }, []);

  const restoreData = useCallback(async (filePath: string): Promise<void> => {
    if (!window.daytrack) return;
    await window.daytrack.restoreData(filePath);
    await refreshSettings();
  }, [refreshSettings]);

  const resetData = useCallback(async (): Promise<void> => {
    if (!window.daytrack) return;
    await window.daytrack.resetData();
    await refreshSettings();
  }, [refreshSettings]);

  return {
    settings,
    getSetting,
    setSetting,
    setAutoStartup,
    exportToCSV,
    backupData,
    restoreData,
    resetData
  };
};
