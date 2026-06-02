import { api } from "@/lib/api";

export type PublishStatus = "DRAFT" | "PUBLISHED";

export type AdminDraftVocabCard = {
  id?: string;
  term: string;
  type?: string;
  meaning: string;
  example?: string;
  exampleJa?: string;
  note?: string;
};

export type AdminDraftTranscriptLine = {
  id?: string;
  vi: string;
  jp?: string;
  timestamp?: string;
  startTime?: number;
  endTime?: number;
};

export type AdminContentDraftPayload = {
  contentId: string;
  status: PublishStatus;
  placeId?: string;
  placeNameVi: string;
  placeNameJa?: string;
  situationId?: string;
  situationTitleVi: string;
  situationTitleJa?: string;
  learningUnitId?: string;
  levelId?: string;
  titleVi: string;
  titleJa?: string;
  description?: string;
  vocabCards: AdminDraftVocabCard[];
  listening?: {
    lessonId?: string;
    titleVi: string;
    titleJa?: string;
    audioUrl?: string;
    durationSeconds?: number;
    description?: string;
    ambientSoundIds?: string[];
    transcriptLines: AdminDraftTranscriptLine[];
  };
  savedAt?: string;
  publishedAt?: string;
};

export type PublishResult = {
  placeId: string;
  situationId: string;
  learningUnitId: string;
  listeningLessonId?: string;
  vocabularyCardIds: string[];
};

const DRAFT_PREFIX = "vietvibe:admin-content-draft";

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createAdminContentDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `content-${crypto.randomUUID()}`;
  }

  return `content-${Date.now()}`;
}

export function getAdminContentDraftKey(contentId: string) {
  return `${DRAFT_PREFIX}:${contentId}`;
}

export function saveAdminContentDraftToBrowser(
  draft: AdminContentDraftPayload,
) {
  const nextDraft: AdminContentDraftPayload = {
    ...draft,
    status: "DRAFT",
    savedAt: new Date().toISOString(),
  };

  if (canUseBrowserStorage()) {
    localStorage.setItem(
      getAdminContentDraftKey(nextDraft.contentId),
      JSON.stringify(nextDraft),
    );
  }

  return nextDraft;
}

export function getAdminContentDraftFromBrowser(contentId: string) {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const rawDraft = localStorage.getItem(getAdminContentDraftKey(contentId));

  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as AdminContentDraftPayload;
  } catch {
    return null;
  }
}

export function deleteAdminContentDraftFromBrowser(contentId: string) {
  if (!canUseBrowserStorage()) {
    return;
  }

  localStorage.removeItem(getAdminContentDraftKey(contentId));
}

export function listAdminContentDraftsFromBrowser() {
  if (!canUseBrowserStorage()) {
    return [];
  }

  return Object.keys(localStorage)
    .filter((key) => key.startsWith(`${DRAFT_PREFIX}:`))
    .map((key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || "null") as
          | AdminContentDraftPayload
          | null;
      } catch {
        return null;
      }
    })
    .filter((draft): draft is AdminContentDraftPayload => draft !== null);
}

export function timestampToSeconds(timestamp?: string) {
  if (!timestamp) {
    return 0;
  }

  const parts = timestamp.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return 0;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

function assertPublishable(draft: AdminContentDraftPayload) {
  if (!draft.placeNameVi.trim()) {
    throw new Error("Cần nhập địa điểm trước khi xuất bản.");
  }

  if (!draft.situationTitleVi.trim()) {
    throw new Error("Cần nhập tình huống trước khi xuất bản.");
  }

  if (!draft.titleVi.trim()) {
    throw new Error("Cần nhập tên bài học trước khi xuất bản.");
  }

  const invalidCard = draft.vocabCards.find(
    (card) => !card.term.trim() || !card.meaning.trim(),
  );
  if (invalidCard) {
    throw new Error("Mỗi thẻ từ vựng cần có từ/cụm từ và nghĩa tiếng Nhật.");
  }

  const listening = draft.listening;
  if (!listening) {
    return;
  }

  const hasListeningContent =
    listening.titleVi.trim() ||
    listening.audioUrl?.trim() ||
    listening.transcriptLines.length > 0;

  if (!hasListeningContent) {
    return;
  }

  if (!listening.titleVi.trim()) {
    throw new Error("Bài nghe cần có tiêu đề trước khi xuất bản.");
  }

  if (!listening.audioUrl?.trim()) {
    throw new Error("Bài nghe cần có audioUrl trước khi xuất bản.");
  }

  const invalidLine = listening.transcriptLines.find((line) => !line.vi.trim());
  if (invalidLine) {
    throw new Error("Mỗi câu thoại cần có nội dung tiếng Việt.");
  }
}

async function createOrReusePlace(draft: AdminContentDraftPayload) {
  if (draft.placeId) {
    return draft.placeId;
  }

  const place = await api.post<{ id: string }>("/listening/admin/places", {
    nameVi: draft.placeNameVi,
    nameJa: draft.placeNameJa || draft.placeNameVi,
    description: draft.description || null,
    avatarUrl: null,
  });

  return place.id;
}

async function createOrReuseSituation(
  draft: AdminContentDraftPayload,
  placeId: string,
) {
  if (draft.situationId) {
    return draft.situationId;
  }

  const situation = await api.post<{ id: string }>("/listening/admin/situations", {
    placeId,
    titleVi: draft.situationTitleVi,
    titleJa: draft.situationTitleJa || draft.situationTitleVi,
    description: draft.description || null,
  });

  return situation.id;
}

async function createOrReuseLearningUnit(
  draft: AdminContentDraftPayload,
  situationId: string,
) {
  if (draft.learningUnitId) {
    return draft.learningUnitId;
  }

  const existingUnits = await api.get<Array<{ id: string }>>(
    `/listening/situations/${situationId}/learning-units`,
    { skipAuth: true },
  );
  if (existingUnits.length > 0) {
    return existingUnits[0].id;
  }

  if (!draft.levelId) {
    throw new Error("Cần chọn level trước khi xuất bản tình huống mới.");
  }

  const unit = await api.post<{ id: string }>("/listening/admin/learning-units", {
    situationId,
    levelId: draft.levelId,
    titleVi: draft.titleVi,
    titleJa: draft.titleJa || draft.titleVi,
    description: draft.description || null,
  });

  return unit.id;
}

async function publishVocabularyCards(
  draft: AdminContentDraftPayload,
  learningUnitId: string,
) {
  const createdIds: string[] = [];
  const existingResponse = await api.get<{ data?: Array<{ id?: string }> }>(
    `/vocabulary/learning-unit/${learningUnitId}`,
  );
  const existingCards = Array.isArray(existingResponse.data)
    ? existingResponse.data
    : [];
  const nextCardIds = new Set(
    draft.vocabCards.map((card) => card.id).filter((id): id is string => !!id),
  );

  await Promise.all(
    existingCards
      .map((card) => card.id)
      .filter((id): id is string => Boolean(id) && !nextCardIds.has(id as string))
      .map((id) =>
        api.delete(`/vocabulary/admin/${id}`),
      ),
  );

  for (const card of draft.vocabCards) {
    const payload = {
      learning_unit_id: learningUnitId,
      word_vi: card.term,
      meaning_ja: card.meaning,
      example_vi: card.example || null,
      example_ja: card.exampleJa || null,
      note: card.note || null,
      tag: card.type || null,
    };

    if (card.id) {
      const result = await api.put<{ data?: { id?: string }; id?: string }>(
        `/vocabulary/admin/${card.id}`,
        payload,
      );
      const id = result.data?.id || result.id || card.id;
      if (id) {
        createdIds.push(id);
      }
      continue;
    }

    const result = await api.post<{ data?: { id?: string }; id?: string }>(
      "/vocabulary/admin/create",
      payload,
    );

    const id = result.data?.id || result.id;
    if (id) {
      createdIds.push(id);
    }
  }

  return createdIds;
}

async function publishListeningLesson(
  draft: AdminContentDraftPayload,
  learningUnitId: string,
) {
  const listening = draft.listening;
  if (!listening || !listening.titleVi.trim() || !listening.audioUrl?.trim()) {
    return undefined;
  }

  const transcriptLines = listening.transcriptLines.map((line, index, lines) => {
    const startTime = line.startTime ?? timestampToSeconds(line.timestamp);
    const nextLine = lines[index + 1];
    const nextStartTime =
      nextLine?.startTime ?? timestampToSeconds(nextLine?.timestamp);
    const endTime = line.endTime ?? Math.max(nextStartTime || startTime + 3, startTime + 1);

    return {
      startTime,
      endTime,
      textVi: line.vi,
      textJa: line.jp || "",
    };
  });

  const payload = {
    learningUnitId,
    titleVi: listening.titleVi,
    titleJa: listening.titleJa || listening.titleVi,
    audioUrl: listening.audioUrl,
    durationSeconds: listening.durationSeconds || 1,
    description: listening.description || draft.description || null,
    transcriptLines,
    ambientSoundIds: listening.ambientSoundIds || [],
  };

  if (listening.lessonId) {
    const lesson = await api.put<{ id?: string; _id?: string }>(
      `/listening/${listening.lessonId}`,
      payload,
    );

    return lesson.id || lesson._id || listening.lessonId;
  }

  const lesson = await api.post<{ id?: string; _id?: string }>(
    "/listening/admin/create",
    payload,
  );

  return lesson.id || lesson._id;
}

export async function publishAdminContentDraft(
  draft: AdminContentDraftPayload,
): Promise<PublishResult> {
  assertPublishable(draft);

  const placeId = await createOrReusePlace(draft);
  const situationId = await createOrReuseSituation(draft, placeId);
  const learningUnitId = await createOrReuseLearningUnit(draft, situationId);
  const vocabularyCardIds = await publishVocabularyCards(draft, learningUnitId);
  const listeningLessonId = await publishListeningLesson(draft, learningUnitId);

  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    const publishedVocabCards = draft.vocabCards.map((card, index) => ({
      ...card,
      id: vocabularyCardIds[index] ?? card.id,
    }));

    const publishedDraft: AdminContentDraftPayload = {
      ...draft,
      vocabCards: publishedVocabCards,
      status: "PUBLISHED",
      publishedAt: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      getAdminContentDraftKey(draft.contentId),
      JSON.stringify(publishedDraft),
    );
  }

  return {
    placeId,
    situationId,
    learningUnitId,
    listeningLessonId,
    vocabularyCardIds,
  };
}
