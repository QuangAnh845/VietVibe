"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AdminContentDraftPayload,
  createAdminContentDraftId,
  getAdminContentDraftFromBrowser,
  getAdminContentDraftKey,
  publishAdminContentDraft,
  saveAdminContentDraftToBrowser,
} from "@/lib/admin-content-draft-workflow";
import { useAutoSave } from "./use-auto-save";

type UseAdminContentDraftWorkflowOptions = {
  initialDraft?: Partial<AdminContentDraftPayload>;
  delay?: number;
  draftKey?: string;
};

function createEmptyDraft(
  initialDraft: Partial<AdminContentDraftPayload> = {},
  draftKey?: string,
): AdminContentDraftPayload {
  const contentId =
    draftKey || initialDraft.contentId || createAdminContentDraftId();
  const storedDraft = getAdminContentDraftFromBrowser(contentId);

  if (storedDraft) {
    return storedDraft;
  }

  return {
    contentId,
    status: "DRAFT",
    placeId: initialDraft.placeId,
    placeNameVi: initialDraft.placeNameVi || "",
    placeNameJa: initialDraft.placeNameJa || "",
    situationId: initialDraft.situationId,
    situationTitleVi: initialDraft.situationTitleVi || "",
    situationTitleJa: initialDraft.situationTitleJa || "",
    learningUnitId: initialDraft.learningUnitId,
    levelId: initialDraft.levelId,
    titleVi: initialDraft.titleVi || "",
    titleJa: initialDraft.titleJa || "",
    description: initialDraft.description || "",
    vocabCards: initialDraft.vocabCards || [],
    listening: initialDraft.listening || {
      titleVi: "",
      titleJa: "",
      audioUrl: "",
      durationSeconds: 0,
      description: "",
      transcriptLines: [],
    },
  };
}

export function useAdminContentDraftWorkflow(
  options: UseAdminContentDraftWorkflowOptions = {},
) {
  const [draft, setDraft] = useState(() =>
    createEmptyDraft(options.initialDraft, options.draftKey),
  );
  const [publishError, setPublishError] = useState<Error | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const storageKey = useMemo(
    () => getAdminContentDraftKey(draft.contentId),
    [draft.contentId],
  );

  const autoSave = useAutoSave(
    draft,
    async (nextDraft) => saveAdminContentDraftToBrowser(nextDraft),
    options.delay,
  );

  useEffect(() => {
    if (!options.draftKey) {
      return;
    }

    setDraft((currentDraft) => {
      if (currentDraft.contentId === options.draftKey) {
        return currentDraft;
      }

      return createEmptyDraft(options.initialDraft, options.draftKey);
    });
  }, [options.draftKey, options.initialDraft]);

  const updateDraft = useCallback(
    (
      updater: (draft: AdminContentDraftPayload) => AdminContentDraftPayload,
    ) => {
      setDraft((currentDraft) => ({
        ...updater(currentDraft),
        status: "DRAFT",
      }));
    },
    [],
  );

  const publish = useCallback(
    async (overrideDraft?: AdminContentDraftPayload) => {
      setIsPublishing(true);
      setPublishError(null);

      try {
        autoSave.flush();
        const result = await publishAdminContentDraft(overrideDraft ?? draft);
        setDraft((currentDraft) => ({
          ...currentDraft,
          placeId: result.placeId,
          situationId: result.situationId,
          learningUnitId: result.learningUnitId,
          status: "PUBLISHED",
          publishedAt: new Date().toISOString(),
        }));
        return result;
      } catch (error) {
        const nextError =
          error instanceof Error ? error : new Error("Publish failed");
        setPublishError(nextError);
        throw nextError;
      } finally {
        setIsPublishing(false);
      }
    },
    [autoSave, draft],
  );

  return {
    draft,
    setDraft,
    updateDraft,
    autoSaveStatus: autoSave.status,
    autoSaveError: autoSave.error,
    savedAt: autoSave.savedAt,
    storageKey,
    isPublishing,
    publishError,
    publish,
    flushDraft: autoSave.flush,
    cancelPendingAutoSave: autoSave.cancel,
  };
}
