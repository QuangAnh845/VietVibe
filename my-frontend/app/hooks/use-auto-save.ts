"use client";

import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const isFirstRenderRef = useRef(true);
  const isMountedRef = useRef(true);
  const saveSequenceRef = useRef(0);

  useEffect(() => {
    saveCallbackRef.current = saveCallback;
  }, [saveCallback]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const debouncedSave = useMemo(
    () =>
      debounce(async (nextData: TFormData) => {
        const saveSequence = ++saveSequenceRef.current;

        if (!isMountedRef.current) {
          return;
        }

        setStatus("SAVING");
        setError(null);

        try {
          const result = await saveCallbackRef.current(nextData);

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
      }, delay),
    [delay],
  );

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    debouncedSave(formData);

    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave, formData]);

  const flush = useCallback(() => {
    debouncedSave.flush();
  }, [debouncedSave]);

  const cancel = useCallback(() => {
    debouncedSave.cancel();
    setStatus("IDLE");
  }, [debouncedSave]);

  return {
    status,
    error,
    savedAt,
    flush,
    cancel,
  };
}
