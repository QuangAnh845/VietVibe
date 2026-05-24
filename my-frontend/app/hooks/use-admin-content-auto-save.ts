"use client";

import { useCallback, useState } from "react";
import { useAutoSave, type AutoSaveResult } from "./use-auto-save";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export type AdminContentType = "VOCABULARY" | "LISTENING";

export type AdminContentDraft = {
  contentType: AdminContentType;
  contentId?: string;
  [key: string]: unknown;
};

type UseAdminContentAutoSaveOptions = {
  accessToken?: string;
  delay?: number;
};

export function useAdminContentAutoSave(
  formData: AdminContentDraft,
  options: UseAdminContentAutoSaveOptions = {},
) {
  const [contentId, setContentId] = useState(formData.contentId);

  const saveDraft = useCallback(
    async (data: AdminContentDraft): Promise<AutoSaveResult> => {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/auto-save`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(options.accessToken
            ? { Authorization: `Bearer ${options.accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          ...data,
          contentId: data.contentId ?? contentId,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || json?.error || "Auto-save failed");
      }

      setContentId(json.id);

      return json;
    },
    [contentId, options.accessToken],
  );

  const autoSave = useAutoSave(
    formData,
    saveDraft,
    options.delay,
  );

  return {
    ...autoSave,
    contentId,
  };
}
