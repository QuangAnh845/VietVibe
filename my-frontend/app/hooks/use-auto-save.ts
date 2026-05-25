"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "IDLE" | "SAVING" | "SAVED" | "ERROR";

export type AutoSaveResult = {
  id?: string;
  status?: string;
  savedAt?: string;
};

export type AutoSaveState = {
  status: AutoSaveStatus;
  error: Error | null;
  savedAt: string | null;
  flush: () => void;
  cancel: () => void;
};

export function useAutoSave<TFormData>(
  formData: TFormData,
  saveCallback: (data: TFormData) => Promise<AutoSaveResult | void>,
  delay = 2000,
): AutoSaveState {
  const [status, setStatus] = useState<AutoSaveStatus>("IDLE");
  const [error, setError] = useState<Error | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const saveCallbackRef = useRef(saveCallback);
  const latestDataRef = useRef(formData);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);
  const isMountedRef = useRef(true);
  const saveSequenceRef = useRef(0);

  useEffect(() => {
    saveCallbackRef.current = saveCallback;
  }, [saveCallback]);

  useEffect(() => {
    latestDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const runSave = useCallback(async () => {
    const saveSequence = ++saveSequenceRef.current;

    if (!isMountedRef.current) {
      return;
    }

    setStatus("SAVING");
    setError(null);

    try {
      const result = await saveCallbackRef.current(latestDataRef.current);

      if (!isMountedRef.current || saveSequence !== saveSequenceRef.current) {
        return;
      }

      setSavedAt(result?.savedAt ?? new Date().toISOString());
      setStatus("SAVED");
    } catch (caughtError) {
      if (!isMountedRef.current || saveSequence !== saveSequenceRef.current) {
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError
          : new Error("Auto-save failed"),
      );
      setStatus("ERROR");
    }
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void runSave();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [delay, formData, runSave]);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      void runSave();
    }
  }, [runSave]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus("IDLE");
  }, []);

  return {
    status,
    error,
    savedAt,
    flush,
    cancel,
  };
}
