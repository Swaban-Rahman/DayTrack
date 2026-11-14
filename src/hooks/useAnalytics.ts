import { useState, useCallback } from 'react';
import type {
  DailyAnalytics,
  WeeklyAnalytics,
  CategoryBreakdown,
  TaskTimeBreakdown,
  DistractionLog,
  CreateDistractionInput
} from '../types';

export const useAnalytics = () => {
  const [loading, setLoading] = useState(false);

  const getDailyAnalytics = useCallback(async (date: string): Promise<DailyAnalytics | null> => {
    if (!window.daytrack) return null;
    setLoading(true);
    try {
      return await window.daytrack.getDailyAnalytics(date);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWeeklyAnalytics = useCallback(async (weekStart: string): Promise<WeeklyAnalytics | null> => {
    if (!window.daytrack) return null;
    setLoading(true);
    try {
      return await window.daytrack.getWeeklyAnalytics(weekStart);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMonthlyAnalytics = useCallback(async (year: number, month: number): Promise<DailyAnalytics[]> => {
    if (!window.daytrack) return [];
    setLoading(true);
    try {
      return await window.daytrack.getMonthlyAnalytics(year, month);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategoryAnalytics = useCallback(async (startDate: string, endDate: string): Promise<CategoryBreakdown[]> => {
    if (!window.daytrack) return [];
    setLoading(true);
    try {
      return await window.daytrack.getCategoryAnalytics(startDate, endDate);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTaskTimeBreakdown = useCallback(async (startDate: string, endDate: string): Promise<TaskTimeBreakdown[]> => {
    if (!window.daytrack) return [];
    setLoading(true);
    try {
      return await window.daytrack.getTaskTimeBreakdown(startDate, endDate);
    } finally {
      setLoading(false);
    }
  }, []);

  const getDistractions = useCallback(async (date: string): Promise<DistractionLog[]> => {
    if (!window.daytrack) return [];
    return await window.daytrack.getDistractions(date);
  }, []);

  const getDistractionsByRange = useCallback(async (startDate: string, endDate: string): Promise<DistractionLog[]> => {
    if (!window.daytrack) return [];
    return await window.daytrack.getDistractionsByRange(startDate, endDate);
  }, []);

  const logDistraction = useCallback(async (input: CreateDistractionInput): Promise<DistractionLog | null> => {
    if (!window.daytrack) return null;
    return await window.daytrack.logDistraction(input);
  }, []);

  const deleteDistraction = useCallback(async (id: number): Promise<void> => {
    if (!window.daytrack) return;
    await window.daytrack.deleteDistraction(id);
  }, []);

  return {
    loading,
    getDailyAnalytics,
    getWeeklyAnalytics,
    getMonthlyAnalytics,
    getCategoryAnalytics,
    getTaskTimeBreakdown,
    getDistractions,
    getDistractionsByRange,
    logDistraction,
    deleteDistraction
  };
};
