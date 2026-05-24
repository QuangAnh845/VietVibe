"use client";

import { apiCall } from "@/lib/api";

export type AdminDraftKind =
  | "place"
  | "situation"
  | "learningUnit"
  | "vocabulary"
  | "listeningLesson"
  | "transcriptLine"
  | "audio";

export type AdminDraftStatus = "draft" | "edited" | "published" | "failed";

export type AdminDraftAction = "create" | "update" | "delete";

export type AdminDraftItem<TPayload = unknown> = {
  id: string;
  kind: AdminDraftKind;
  action: AdminDraftAction;
  status: AdminDraftStatus;
  entityId?: string | null;
  parentId?: string | null;
  learningUnitId?: string | null;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  error?: string | null;
};

export type PublishResult = {
  draftId: string;
  ok: boolean;
  response?: unknown;
  error?: string;
};

const DRAFT_STORAGE_KEY = "vv-admin-content-drafts";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createDraftId(kind: AdminDraftKind) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `draft-${kind}-${random}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readDrafts(): AdminDraftItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: AdminDraftItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function resolveEndpoint(draft: AdminDraftItem) {
  switch (draft.kind) {
    case "place":
      return draft.action === "create"
        ? "/listening/admin/places"
        : `/listening/admin/places/${draft.entityId}`;

    case "situation":
      return draft.action === "create"
        ? "/listening/admin/situations"
        : `/listening/admin/situations/${draft.entityId}`;

    case "learningUnit":
      return draft.action === "create"
        ? "/listening/admin/learning-units"
        : `/listening/admin/learning-units/${draft.entityId}`;

    case "vocabulary":
      return draft.action === "create"
        ? "/vocabulary/admin/create"
        : `/vocabulary/${draft.entityId}`;

    case "listeningLesson":
      return draft.action === "create"
        ? "/listening/admin/create"
        : `/listening/${draft.entityId}`;

    case "transcriptLine":
    case "audio":
      return draft.entityId ? `/listening/${draft.entityId}` : "/listening/admin/create";

    default:
      throw new Error(`Unsupported draft kind: ${draft.kind}`);
  }
}

function resolveMethod(action: AdminDraftAction) {
  if (action === "create") return "POST";
  if (action === "update") return "PUT";
  return "DELETE";
}

export const adminDraftPublishService = {
  listDrafts() {
    return readDrafts();
  },

  listDraftsForEntity(entityId: string) {
    return readDrafts().filter((draft) => draft.entityId === entityId);
  },

  hasUnpublishedDrafts(entityId?: string) {
    return readDrafts().some((draft) => {
      const isPending = draft.status === "draft" || draft.status === "edited";
      return entityId ? isPending && draft.entityId === entityId : isPending;
    });
  },

  saveDraft<TPayload>(
    input: Omit<AdminDraftItem<TPayload>, "id" | "status" | "createdAt" | "updatedAt"> & {
      id?: string;
      status?: AdminDraftStatus;
    },
  ) {
    const drafts = readDrafts();
    const existingIndex = input.id
      ? drafts.findIndex((draft) => draft.id === input.id)
      : -1;
    const timestamp = nowIso();

    const nextDraft: AdminDraftItem<TPayload> = {
      id: input.id ?? createDraftId(input.kind),
      kind: input.kind,
      action: input.action,
      status: input.status ?? (input.action === "create" ? "draft" : "edited"),
      entityId: input.entityId ?? null,
      parentId: input.parentId ?? null,
      learningUnitId: input.learningUnitId ?? null,
      payload: input.payload,
      createdAt:
        existingIndex >= 0 ? drafts[existingIndex].createdAt : timestamp,
      updatedAt: timestamp,
      publishedAt: existingIndex >= 0 ? drafts[existingIndex].publishedAt : null,
      error: null,
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = nextDraft;
    } else {
      drafts.push(nextDraft);
    }

    writeDrafts(drafts);
    return nextDraft;
  },

  removeDraft(draftId: string) {
    const nextDrafts = readDrafts().filter((draft) => draft.id !== draftId);
    writeDrafts(nextDrafts);
  },

  clearDrafts(entityId?: string) {
    if (!entityId) {
      writeDrafts([]);
      return;
    }

    writeDrafts(readDrafts().filter((draft) => draft.entityId !== entityId));
  },

  async publishDraft(draftId: string): Promise<PublishResult> {
    const drafts = readDrafts();
    const draft = drafts.find((item) => item.id === draftId);

    if (!draft) {
      return { draftId, ok: false, error: "Draft not found" };
    }

    try {
      const endpoint = resolveEndpoint(draft);
      const method = resolveMethod(draft.action);
      const response =
        method === "DELETE"
          ? await apiCall(endpoint, { method })
          : await apiCall(endpoint, {
              method,
              body: JSON.stringify(draft.payload),
            });

      const timestamp = nowIso();
      writeDrafts(
        drafts.map((item) =>
          item.id === draftId
            ? {
                ...item,
                status: "published",
                publishedAt: timestamp,
                updatedAt: timestamp,
                error: null,
              }
            : item,
        ),
      );

      return { draftId, ok: true, response };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeDrafts(
        drafts.map((item) =>
          item.id === draftId
            ? {
                ...item,
                status: "failed",
                updatedAt: nowIso(),
                error: message,
              }
            : item,
        ),
      );

      return { draftId, ok: false, error: message };
    }
  },

  async publishAll(entityId?: string) {
    const drafts = readDrafts().filter((draft) => {
      const isPending = draft.status === "draft" || draft.status === "edited" || draft.status === "failed";
      return entityId ? isPending && draft.entityId === entityId : isPending;
    });

    const results: PublishResult[] = [];
    for (const draft of drafts) {
      results.push(await this.publishDraft(draft.id));
    }

    return results;
  },

  purgePublished() {
    writeDrafts(readDrafts().filter((draft) => draft.status !== "published"));
  },
};
