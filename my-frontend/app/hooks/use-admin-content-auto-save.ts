"use client";

import { useCallback, useState } from "react";
import { useAutoSave, type AutoSaveResult } from "./use-auto-save";

const STORAGE_PREFIX = "vietvibe:auto-save-draft";

export type AdminContentType = "VOCABULARY" | "LISTENING";

export type AdminContentDraft = {
  contentType: AdminContentType;
  contentId?: string;
  [key: string]: unknown;
};

type UseAdminContentAutoSaveOptions = {
  delay?: number;
};

function createDraftId(contentType: AdminContentType) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${contentType.toLowerCase()}-${crypto.randomUUID()}`;
  }

  return `${contentType.toLowerCase()}-${Date.now()}`;
}

function getStorageKey(contentType: AdminContentType, contentId: string) {
  return `${STORAGE_PREFIX}:${contentType}:${contentId}`;
}

export function getAdminContentDraft(
  contentType: AdminContentType,
  contentId: string,
): AdminContentDraft | null {
  const rawDraft = localStorage.getItem(getStorageKey(contentType, contentId));

  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as AdminContentDraft;
  } catch {
    return null;
  }
}

export function clearAdminContentDraft(
  contentType: AdminContentType,
  contentId: string,
) {
  localStorage.removeItem(getStorageKey(contentType, contentId));
}

export function useAdminContentAutoSave(
  formData: AdminContentDraft,
  options: UseAdminContentAutoSaveOptions = {},
) {
  const [contentId, setContentId] = useState(
    formData.contentId ?? createDraftId(formData.contentType),
  );

  const saveDraft = useCallback(
    async (data: AdminContentDraft): Promise<AutoSaveResult> => {
      const nextContentId = data.contentId ?? contentId;
      const savedAt = new Date().toISOString();

      localStorage.setItem(
        getStorageKey(data.contentType, nextContentId),
        JSON.stringify({
          ...data,
          contentId: nextContentId,
          status: "DRAFT",
          savedAt,
        }),
      );

      setContentId(nextContentId);

      return {
        id: nextContentId,
        status: "DRAFT",
        savedAt,
      };
    },
    [contentId],
  );

  const autoSave = useAutoSave(formData, saveDraft, options.delay);

  return {
    ...autoSave,
    contentId,
    storageKey: getStorageKey(formData.contentType, contentId),
  };
}
