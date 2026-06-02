"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { apiCall } from "@/lib/api";
import { getAdminContentDraftFromBrowser } from "@/lib/admin-content-draft-workflow";
import type { AdminContentDraftPayload } from "@/lib/admin-content-draft-workflow";
import { AutoSaveIndicator } from "./auto-save-indicator";
import { useAdminContentDraftWorkflow } from "../hooks/use-admin-content-draft-workflow";
import AdminSidebar from "./admin-sidebar";

type Status = "published" | "edited" | "draft";

type Unit = {
  id: string;
  title: string;
  status: Status;
  vocabCount: number;
  listeningCount: number;
  duration: string;
  learningUnitId?: string;
};

type Location = {
  id: string;
  label: string;
  icon: IconName;
  status: Status;
  units: Unit[];
};

type IconName = "cart" | "restaurant" | "hospital" | "bus" | "salon" | "bank";

type SelectedUnit = {
  locationId: string;
  unitId: string;
} | null;

type ListeningModal = "replace-audio" | "ambient" | "import-csv" | null;

type ScriptDraft = {
  vi: string;
  jp: string;
  timestamp: string;
};

type ScriptRow = ScriptDraft & {
  index: string;
  endTimeSeconds?: number;
};

type VocabRow = {
  id?: string;
  index: string;
  term: string;
  type: string;
  meaning: string;
  example: string;
  pronunciation?: string;
};

type ListeningPlaceResponse = {
  id: string;
  nameVi?: string;
  nameJa?: string;
};

type ListeningPlaceFullResponse = ListeningPlaceResponse & {
  situations?: ListeningSituationFullResponse[];
};

type ListeningSituationResponse = {
  id: string;
  titleVi?: string;
  titleJa?: string;
};

type ListeningSituationFullResponse = ListeningSituationResponse & {
  learningUnits?: LearningUnitResponse[];
};

type LearningUnitResponse = {
  id: string;
  levelId?: string;
  titleVi?: string;
  titleJa?: string;
  level?: {
    id?: string;
    code?: string;
    nameVi?: string | null;
    nameJa?: string | null;
  } | null;
};

type LevelResponse = {
  id: string;
  code?: string;
  nameVi?: string | null;
  nameJa?: string | null;
};

type ListeningLessonResponse = {
  id?: string;
  _id?: string;
  title_vi?: string;
  title_ja?: string;
  audio_url?: string;
  duration_seconds?: number;
  transcriptLines?: TranscriptLineResponse[];
};

type TranscriptLineResponse = {
  _id?: string;
  id?: string;
  text_vi?: string;
  text_ja?: string;
  start_time?: number;
  end_time?: number;
};

type VocabLearningUnitResponse = {
  data?: VocabCardResponse[];
  meta?: { total?: number };
};

type VocabCardResponse = {
  id?: string;
  wordVi?: string;
  meaningJa?: string;
  exampleVi?: string;
  exampleJa?: string;
  note?: string;
  tag?: string;
};

type EnvironmentSoundResponse = {
  data?: EnvironmentSoundItem[];
};

type EnvironmentSoundItem = {
  id?: string;
  name?: string;
  audio_url?: string;
};

type AmbientOption = {
  id: string;
  title: string;
  filename: string;
  duration: string;
  audioUrl?: string;
};

const initialLocations: Location[] = [];

const initialListeningRows: ScriptRow[] = [];

const formatDuration = (value?: number) => {
  const totalSeconds = Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatTimestamp = (value?: number) => formatDuration(value ?? 0);

const normalizeVocabRows = (rows: VocabRow[]) =>
  rows.map((row, index) => ({
    ...row,
    index: String(index + 1),
  }));

const getAudioFileName = (url?: string) => {
  if (!url) return "Chưa có file";
  const parts = url.split("/");
  return parts[parts.length - 1] || url;
};

export default function AdminContentScreen() {
  const [isSidebarOpen] = useState(true);
  const [isContentSidebarOpen, setIsContentSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"vocab" | "listening">("vocab");
  const [expandedIds, setExpandedIds] = useState<string[]>(["super"]);
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit>(null);
  const [listeningModal, setListeningModal] = useState<ListeningModal>(null);
  const [contentQuery, setContentQuery] = useState("");
  const [ambientQuery, setAmbientQuery] = useState("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<string | null>(null);
  const [timestampToast, setTimestampToast] = useState<string | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [editDraft, setEditDraft] = useState<ScriptDraft>({
    vi: "",
    jp: "",
    timestamp: "",
  });
  const [newRow, setNewRow] = useState<ScriptDraft>({
    vi: "",
    jp: "",
    timestamp: "0:00",
  });
  const [listeningRows, setListeningRows] =
    useState<ScriptRow[]>(initialListeningRows);
  const [activeLesson, setActiveLesson] =
    useState<ListeningLessonResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isVocabImportOpen, setIsVocabImportOpen] = useState(false);
  const [vocabRows, setVocabRows] = useState<VocabRow[]>([]);
  const [locationsState, setLocationsState] =
    useState<Location[]>(initialLocations);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [ambientOptions, setAmbientOptions] = useState<AmbientOption[]>([]);
  const [levels, setLevels] = useState<LevelResponse[]>([]);
  const [learningUnitOptions, setLearningUnitOptions] = useState<
    LearningUnitResponse[]
  >([]);
  const [selectedLearningUnitId, setSelectedLearningUnitId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [learningUnitTitleInput, setLearningUnitTitleInput] = useState("");
  const [isCreateLearningUnitMode, setIsCreateLearningUnitMode] =
    useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({
    id: "",
    label: "",
    icon: "",
  });
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(
    null,
  );
  const [isAddSituationOpen, setIsAddSituationOpen] = useState(false);
  const [isEditSituationOpen, setIsEditSituationOpen] = useState(false);
  const [situationForm, setSituationForm] = useState({ id: "", title: "" });
  const [deleteLocationIdState, setDeleteLocationIdState] = useState<
    string | null
  >(null);
  const [locationToast, setLocationToast] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [vocabModal, setVocabModal] = useState<"add" | "edit" | null>(null);
  const [vocabForm, setVocabForm] = useState({
    index: "",
    term: "",
    type: "",
    pronunciation: "",
    example: "",
    meaning: "",
  });
  const [vocabToEditIndex, setVocabToEditIndex] = useState<string | null>(null);
  const [deleteVocabIndex, setDeleteVocabIndex] = useState<string | null>(null);
  const [vocabToast, setVocabToast] = useState<string | null>(null);
  const draftWorkflow = useAdminContentDraftWorkflow({ delay: 2000 });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedAudioFile(e.target.files[0]);
    }
  };

  const handleDropAudio = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOverAudio = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleConfirmReplaceAudio = async () => {
    if (!selectedAudioFile || !activeUnit) return;
    
    setUploadingAudio(true);
    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;
    try {
      const audioObj = new Audio(URL.createObjectURL(selectedAudioFile));
      const durationPromise = new Promise<number>((resolve) => {
        audioObj.onloadedmetadata = () => resolve(audioObj.duration);
        audioObj.onerror = () => resolve(0);
      });

      const formData = new FormData();
      formData.append("file", selectedAudioFile);

      const [response, duration] = await Promise.all([
        apiCall<{ audioUrl: string }>("/listening/admin/upload-audio", {
          method: "POST",
          body: formData as any,
          signal: controller.signal,
        }),
        durationPromise
      ]);

      if (response.audioUrl) {
        const roundedDuration = Math.round(duration) || 0;
        
        setDetailError(null);
        setActiveLesson((prev) => {
          if (prev) {
            return {
              ...prev,
              audio_url: response.audioUrl,
              duration_seconds: roundedDuration,
            };
          }
          return {
            title_vi: activeUnit?.title || "",
            title_ja: activeUnit?.title || "",
            audio_url: response.audioUrl,
            duration_seconds: roundedDuration,
            transcriptLines: [],
          };
        });
        
        draftWorkflow.setDraft((currentDraft) => ({
          ...currentDraft,
          listening: {
            ...(currentDraft.listening ?? {
              titleVi: activeUnit?.title || "",
              titleJa: activeUnit?.title || "",
              audioUrl: "",
              durationSeconds: 0,
              description: "",
              transcriptLines: [],
            }),
            audioUrl: response.audioUrl,
            durationSeconds: roundedDuration,
          },
        }));

        setListeningModal(null);
        setSelectedAudioFile(null);
      }
    } catch (error) {
      console.error("Audio upload failed", error);
      setLocationToast(error instanceof Error ? error.message : "Tải file lên thất bại.");
      window.setTimeout(() => setLocationToast(null), 3000);
    } finally {
      setUploadingAudio(false);
      uploadAbortControllerRef.current = null;
    }
  };

  const handleCloseReplaceAudio = () => {
    if (uploadingAudio) {
      uploadAbortControllerRef.current?.abort();
      setUploadingAudio(false);
    }
    setListeningModal(null);
    setSelectedAudioFile(null);
  };

  const activeLocation = useMemo(() => {
    if (!selectedUnit) return null;
    return locationsState.find(
      (location) => location.id === selectedUnit.locationId,
    );
  }, [locationsState, selectedUnit]);

  const activeUnit = useMemo(() => {
    if (!selectedUnit || !activeLocation) return null;
    return activeLocation.units.find((unit) => unit.id === selectedUnit.unitId);
  }, [selectedUnit, activeLocation]);

  const activeUnitId = activeUnit?.id ?? null;
  const activeLearningUnitId =
    selectedLearningUnitId || activeUnit?.learningUnitId || null;
  const activeUnitTitle = activeUnit?.title ?? "";
  const activeLocationId = activeLocation?.id ?? null;
  const activeLessonId = activeLesson?.id ?? activeLesson?._id ?? null;
  const defaultAmbientIds = useMemo(() => ambientOptions.slice(0, 2).map((item) => item.id), [ambientOptions]);
  const selectedAmbientIds =
    draftWorkflow.draft.listening?.ambientSoundIds ?? defaultAmbientIds;

  const filteredLocations = useMemo(() => {
    const normalized = contentQuery.trim().toLowerCase();
    if (!normalized) return locationsState;
    return locationsState.filter((location) =>
      [location.label, ...location.units.map((unit) => unit.title)].some(
        (value) => value.toLowerCase().includes(normalized),
      ),
    );
  }, [contentQuery, locationsState]);

  const filteredAmbientOptions = useMemo(() => {
    const normalized = ambientQuery.trim().toLowerCase();
    if (!normalized) return ambientOptions;
    return ambientOptions.filter((item) =>
      [item.title, item.filename].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [ambientQuery, ambientOptions]);

  useEffect(() => {
    let isMounted = true;

    const loadEnvironmentSounds = async () => {
      try {
        const response = await apiCall<EnvironmentSoundResponse>(
          "/environment-sounds",
        );
        const options = (response.data ?? []).map((item) => {
          const audioUrl = item.audio_url ?? "";
          return {
            id: String(item.id ?? ""),
            title: item.name ?? "",
            filename: getAudioFileName(audioUrl),
            duration: "--:--",
            audioUrl,
          };
        });

        if (isMounted) {
          setAmbientOptions(options);
        }
      } catch (error) {
        console.error("Failed to load environment sounds", error);
      }
    };

    void loadEnvironmentSounds();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      uploadAbortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLevels = async () => {
      try {
        const response = await apiCall<LevelResponse[]>("/listening/levels");
        if (isMounted) {
          setLevels(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        console.error("Failed to load levels", error);
      }
    };

    void loadLevels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLearningUnitsForSituation = async () => {
      if (!activeUnitId) {
        if (isMounted) {
          setLearningUnitOptions([]);
          setSelectedLearningUnitId("");
          setIsCreateLearningUnitMode(false);
          setSelectedLevelId("");
          setLearningUnitTitleInput("");
        }
        return;
      }

      try {
        const units = await apiCall<LearningUnitResponse[]>(
          `/listening/situations/${activeUnitId}/learning-units`,
        );
        if (!isMounted) return;

        const normalizedUnits = Array.isArray(units) ? units : [];
        setLearningUnitOptions(normalizedUnits);

        if (normalizedUnits.length > 0) {
          const defaultUnit = normalizedUnits[0];
          setSelectedLearningUnitId(defaultUnit.id);
          setSelectedLevelId(defaultUnit.levelId || defaultUnit.level?.id || "");
          setLearningUnitTitleInput(defaultUnit.titleVi || defaultUnit.titleJa || "");
          setIsCreateLearningUnitMode(false);
        } else {
          setSelectedLearningUnitId("");
          setIsCreateLearningUnitMode(true);
          setSelectedLevelId((current) => current || levels[0]?.id || "");
          setLearningUnitTitleInput(activeUnit?.title || "");
        }
      } catch (error) {
        console.error("Failed to load learning units for situation", error);
        if (!isMounted) return;
        setLearningUnitOptions([]);
        setSelectedLearningUnitId("");
        setIsCreateLearningUnitMode(true);
      }
    };

    void loadLearningUnitsForSituation();

    return () => {
      isMounted = false;
    };
  }, [activeUnitId, activeUnit?.title, levels]);

  useEffect(() => {
    let isMounted = true;

    const loadUnitDetails = async () => {
      if (!activeUnitId) {
        if (isMounted) {
          setActiveLesson(null);
          setListeningRows([]);
          setVocabRows([]);
          setDetailError(null);
        }
        return;
      }

      if (!activeLearningUnitId) {
        if (isMounted) {
          setActiveLesson(null);
          setListeningRows([]);
          setVocabRows([]);

        }
        return;
      }

      try {
        setDetailLoading(true);
        setDetailError(null);

        let backendLesson: ListeningLessonResponse | null = null;
        let backendVocab: VocabLearningUnitResponse = { data: [] };

        try {
          backendLesson = await apiCall<ListeningLessonResponse>(
            `/listening/learning-unit/${activeLearningUnitId}`,
          );
        } catch (err) {
          console.warn("No backend lesson found", err);
        }

        try {
          backendVocab = await apiCall<VocabLearningUnitResponse>(
            `/vocabulary/learning-unit/${activeLearningUnitId}`,
          );
        } catch (err) {
          console.warn("No backend vocab found", err);
        }

        const draftId = `admin-content-${activeUnitId}`;
        const localDraft = getAdminContentDraftFromBrowser(draftId);

        if (isMounted) {
          let nextListeningRows: ScriptRow[] = [];
          let nextVocabRows: VocabRow[] = [];
          let finalLesson: ListeningLessonResponse | null = null;

          if (localDraft && localDraft.listening) {
            finalLesson = {
              id: localDraft.listening.lessonId,
              title_vi: localDraft.listening.titleVi,
              title_ja: localDraft.listening.titleJa,
              audio_url: localDraft.listening.audioUrl,
              duration_seconds: localDraft.listening.durationSeconds,
            };

            nextListeningRows = (localDraft.listening.transcriptLines || []).map((line) => ({
              index: line.id || "",
              vi: line.vi || "",
              jp: line.jp || "",
              timestamp: line.timestamp || "0:00",
            }));

            nextVocabRows = (localDraft.vocabCards || []).map((card, index) => ({
              id: card.id,
              index: String(index + 1),
              term: card.term || "",
              type: card.type || "",
              meaning: card.meaning || "",
              example: card.example || "",
              pronunciation: card.note || "",
            }));
          } else {
            if (backendLesson) {
              finalLesson = backendLesson;
              const transcriptLines = Array.isArray(backendLesson.transcriptLines)
                ? backendLesson.transcriptLines
                : [];
              nextListeningRows = transcriptLines.map((line, index) => ({
                index: String(index + 1),
                vi: line.text_vi ?? "",
                jp: line.text_ja ?? "",
                timestamp: formatTimestamp(line.start_time ?? 0),
                endTimeSeconds: line.end_time,
              }));
            }

            const vocabCards = Array.isArray(backendVocab.data) ? backendVocab.data : [];
            nextVocabRows = vocabCards.map((card, index) => ({
              id: card.id,
              index: String(index + 1),
              term: card.wordVi ?? "",
              type: card.tag ?? "",
              meaning: card.meaningJa ?? "",
              example: card.exampleVi ?? "",
              pronunciation: card.note ?? "",
            }));
          }

          setActiveLesson(finalLesson);
          setListeningRows(nextListeningRows);
          setVocabRows(nextVocabRows);
          setEditingRow(null);
          setIsAddingRow(false);

          setLocationsState((prev) =>
            prev.map((location) => ({
              ...location,
              units: location.units.map((unit) =>
                unit.id === activeUnitId
                  ? unit.vocabCount === nextVocabRows.length &&
                    unit.listeningCount === nextListeningRows.length &&
                    unit.duration === formatDuration(finalLesson?.duration_seconds)
                    ? unit
                    : {
                        ...unit,
                        vocabCount: nextVocabRows.length,
                        listeningCount: nextListeningRows.length,
                        duration: formatDuration(finalLesson?.duration_seconds),
                      }
                  : unit,
              ),
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load unit details", error);
        if (isMounted) {
          setDetailError(
            error instanceof Error ? error.message : "Không tải được dữ liệu.",
          );
          setActiveLesson(null);
          setListeningRows([]);
          setVocabRows([]);
        }
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
      }
    };

    void loadUnitDetails();

    return () => {
      isMounted = false;
    };
  }, [activeUnitId, activeLearningUnitId, activeLocationId, activeUnitTitle]);

  useEffect(() => {
    if (!activeUnit || !activeLocation) {
      return;
    }

    const lessonTitleVi = activeLesson?.title_vi || activeUnit.title;
    const lessonTitleJa = activeLesson?.title_ja || activeUnit.title;
    const lessonAudioUrl = activeLesson?.audio_url || "";
    const lessonDurationSeconds = activeLesson?.duration_seconds ?? 0;

    draftWorkflow.setDraft((currentDraft) => {
      const nextDraft = {
        ...currentDraft,
        contentId: `admin-content-${activeUnit.id}`,
        status:
          currentDraft.status === "PUBLISHED"
            ? "PUBLISHED"
            : currentDraft.publishedAt
              ? "DRAFT"
              : activeUnit.status === "published"
                ? "PUBLISHED"
                : "DRAFT",
        placeId: activeLocation.id,
        placeNameVi: activeLocation.label,
        placeNameJa: activeLocation.label,
        situationId: activeUnit.id,
        situationTitleVi: activeUnit.title,
        situationTitleJa: activeUnit.title,
        learningUnitId: activeLearningUnitId ?? undefined,
        levelId:
          selectedLevelId ||
          learningUnitOptions.find((unit) => unit.id === activeLearningUnitId)
            ?.levelId,
        titleVi: learningUnitTitleInput || lessonTitleVi,
        titleJa: learningUnitTitleInput || lessonTitleJa,
        description: `Nội dung luyện nghe và từ vựng cho tình huống ${activeUnit.title}.`,
        vocabCards: vocabRows.map((row) => ({
          id: row.id,
          term: row.term,
          type: row.type,
          meaning: row.meaning,
          example: row.example,
          note: row.pronunciation,
        })),
        listening: {
          lessonId: activeLessonId ?? undefined,
          titleVi: lessonTitleVi,
          titleJa: lessonTitleJa,
          audioUrl: lessonAudioUrl,
          durationSeconds: lessonDurationSeconds,
          description: `Bài nghe cho tình huống ${activeUnit.title}.`,
          ambientSoundIds:
            currentDraft.listening?.ambientSoundIds ?? defaultAmbientIds,
          transcriptLines: listeningRows.map((row) => ({
            id: row.index,
            vi: row.vi,
            jp: row.jp,
            timestamp: row.timestamp,
          })),
        },
      };

      return JSON.stringify(nextDraft) === JSON.stringify(currentDraft)
        ? currentDraft
        : nextDraft;
    });
  }, [
    activeLocation,
    activeUnit,
    activeLesson,
    activeLessonId,
    activeLearningUnitId,
    selectedLevelId,
    learningUnitTitleInput,
    learningUnitOptions,
    listeningRows,
    vocabRows,
    defaultAmbientIds,
    draftWorkflow.setDraft,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      try {
        setIsContentLoading(true);
        setContentError(null);

        const places =
          await apiCall<ListeningPlaceResponse[]>("/listening/places");

        const nextLocations = await Promise.all(
          places.map(async (place) => {
            const placeFull = await apiCall<ListeningPlaceFullResponse>(
              `/listening/places/${place.id}/full`,
            );

            return {
              id: placeFull.id,
              label: placeFull.nameJa || placeFull.nameVi || "Tên mới",
              icon: "cart" as IconName,
              status: "draft" as Status,
              units: (placeFull.situations ?? []).map((situation) => {
                const learningUnitId =
                  situation.learningUnits?.[0]?.id ?? undefined;

                return {
                  id: situation.id,
                  title:
                    situation.titleJa || situation.titleVi || "Tình huống mới",
                  status: "draft" as Status,
                  vocabCount: 0,
                  listeningCount: 0,
                  duration: "0:00",
                  learningUnitId,
                };
              }),
            };
          }),
        );

        if (isMounted) {
          setLocationsState(nextLocations);
          setSaveStatus("saved");
        }
      } catch (error) {
        console.error("Failed to load admin content", error);
        if (isMounted) {
          setSaveStatus("error");
          setContentError(
            error instanceof Error ? error.message : "Không tải được dữ liệu.",
          );
        }
      } finally {
        if (isMounted) {
          setIsContentLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedAmbientOptions = ambientOptions.filter((option) =>
    selectedAmbientIds.includes(option.id),
  );

  const activeDurationLabel = formatDuration(activeLesson?.duration_seconds);
  const activeAudioFileName = getAudioFileName(activeLesson?.audio_url);

  const startEditRow = (row: (typeof listeningRows)[number]) => {
    setEditingRow(row.index);
    setEditDraft({ vi: row.vi, jp: row.jp, timestamp: row.timestamp });
  };

  const cancelEditRow = () => {
    setEditingRow(null);
  };

  const resetNewRow = () => {
    setNewRow({ vi: "", jp: "", timestamp: "0:00" });
    setIsAddingRow(false);
  };

  const applyLocalListeningRows = (nextRows: ScriptRow[]) => {
    setListeningRows(nextRows);
    setLocationsState((prev) =>
      prev.map((location) => ({
        ...location,
        units: location.units.map((unit) =>
          unit.id === activeUnitId
            ? {
                ...unit,
                listeningCount: nextRows.length,
              }
            : unit,
        ),
      })),
    );
  };

  const applyLocalVocabRows = (nextRows: VocabRow[]) => {
    setVocabRows(nextRows);
    setLocationsState((prev) =>
      prev.map((location) => ({
        ...location,
        units: location.units.map((unit) =>
          unit.id === activeUnitId
            ? {
                ...unit,
                vocabCount: nextRows.length,
              }
            : unit,
        ),
      })),
    );
  };

  const buildCurrentDraftSnapshot = (): AdminContentDraftPayload => ({
    ...draftWorkflow.draft,
    contentId: `admin-content-${activeUnit?.id ?? draftWorkflow.draft.contentId}`,
    status:
      draftWorkflow.draft.status === "PUBLISHED"
        ? "PUBLISHED"
        : "DRAFT",
    placeId: activeLocation?.id ?? draftWorkflow.draft.placeId,
    placeNameVi: activeLocation?.label ?? draftWorkflow.draft.placeNameVi,
    placeNameJa: activeLocation?.label ?? draftWorkflow.draft.placeNameJa,
    situationId: activeUnit?.id ?? draftWorkflow.draft.situationId,
    situationTitleVi: activeUnit?.title ?? draftWorkflow.draft.situationTitleVi,
    situationTitleJa: activeUnit?.title ?? draftWorkflow.draft.situationTitleJa,
    learningUnitId: activeLearningUnitId ?? draftWorkflow.draft.learningUnitId,
    levelId:
      selectedLevelId ||
      learningUnitOptions.find((unit) => unit.id === activeLearningUnitId)?.levelId ||
      draftWorkflow.draft.levelId,
    titleVi:
      learningUnitTitleInput ||
      activeLesson?.title_vi ||
      activeUnit?.title ||
      draftWorkflow.draft.titleVi,
    titleJa:
      learningUnitTitleInput ||
      activeLesson?.title_ja ||
      activeUnit?.title ||
      draftWorkflow.draft.titleJa,
    description:
      draftWorkflow.draft.description ||
      `Nội dung luyện nghe và từ vựng cho tình huống ${activeUnit?.title ?? ""}.`,
    vocabCards: vocabRows.map((row) => ({
      id: row.id,
      term: row.term,
      type: row.type,
      meaning: row.meaning,
      example: row.example,
      note: row.pronunciation,
    })),
    listening: {
      lessonId: activeLessonId ?? draftWorkflow.draft.listening?.lessonId,
      titleVi: activeLesson?.title_vi || activeUnit?.title || draftWorkflow.draft.listening?.titleVi || "",
      titleJa: activeLesson?.title_ja || activeUnit?.title || draftWorkflow.draft.listening?.titleJa || "",
      audioUrl: activeLesson?.audio_url || draftWorkflow.draft.listening?.audioUrl || "",
      durationSeconds:
        activeLesson?.duration_seconds ?? draftWorkflow.draft.listening?.durationSeconds ?? 0,
      description:
        draftWorkflow.draft.listening?.description ||
        `Bài nghe cho tình huống ${activeUnit?.title ?? ""}.`,
      ambientSoundIds:
        draftWorkflow.draft.listening?.ambientSoundIds ?? defaultAmbientIds,
      transcriptLines: listeningRows.map((row) => ({
        id: row.index,
        vi: row.vi,
        jp: row.jp,
        timestamp: row.timestamp,
      })),
    },
  });

  const saveNewRow = () => {
    const nextRows = [
      ...listeningRows,
      {
        index: String(listeningRows.length + 1),
        vi: newRow.vi,
        jp: newRow.jp,
        timestamp: newRow.timestamp,
      },
    ];

    applyLocalListeningRows(nextRows);
    resetNewRow();
  };

  const handleCopyTimestamp = async (rowIndex: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error(error);
    }
    setTimestampToast(`Đã lấy thời gian cho #${rowIndex}.`);
    window.setTimeout(() => setTimestampToast(null), 2200);
  };

  const toggleAmbientSelection = (id: string) => {
    draftWorkflow.setDraft((currentDraft) => {
      const currentAmbientIds =
        currentDraft.listening?.ambientSoundIds ?? defaultAmbientIds;
      const nextAmbientIds = currentAmbientIds.includes(id)
        ? currentAmbientIds.filter((item) => item !== id)
        : [...currentAmbientIds, id];

      return {
        ...currentDraft,
        listening: {
          ...(currentDraft.listening ?? {
            titleVi: "",
            titleJa: "",
            audioUrl: "",
            durationSeconds: 0,
            description: "",
            transcriptLines: [],
          }),
          ambientSoundIds: nextAmbientIds,
        },
      };
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteRow) {
      return;
    }

    const nextRows = listeningRows
      .filter((row) => row.index !== deleteRow)
      .map((row, index) => ({ ...row, index: String(index + 1) }));

    applyLocalListeningRows(nextRows);
    setDeleteRow(null);
  };

  const handlePublishActiveUnit = async () => {
    if (!activeUnit || !activeLocation) {
      return;
    }

    if (!selectedLearningUnitId && !selectedLevelId) {
      setSaveStatus("error");
      setLocationToast("Can chon level truoc khi tao LearningUnit moi.");
      window.setTimeout(() => setLocationToast(null), 3000);
      return;
    }

    if (!selectedLearningUnitId && !learningUnitTitleInput.trim()) {
      setSaveStatus("error");
      setLocationToast("Can nhap ten bai hoc truoc khi publish.");
      window.setTimeout(() => setLocationToast(null), 3000);
      return;
    }

    setSaveStatus("saving");

    try {
      const publishResult = await draftWorkflow.publish(buildCurrentDraftSnapshot());
      setLocationsState((prev) =>
        prev.map((location) =>
          location.id === activeLocation.id
            ? {
                ...location,
                units: location.units.map((unit) =>
                  unit.id === activeUnit.id
                    ? {
                        ...unit,
                        status: "published",
                        vocabCount: vocabRows.length,
                        listeningCount: listeningRows.length,
                        learningUnitId: publishResult.learningUnitId,
                      }
                    : unit,
                ),
              }
            : location,
        ),
      );
      setSelectedLearningUnitId(publishResult.learningUnitId);
      setIsCreateLearningUnitMode(false);
      setSaveStatus("saved");
      setLocationToast(
        "Đã xuất bản nội dung. Learner có thể xem nội dung mới.",
      );
    } catch (error) {
      console.error("Failed to publish admin content", error);
      setSaveStatus("error");
      setLocationToast(
        error instanceof Error ? error.message : "Không thể xuất bản nội dung.",
      );
    }

    window.setTimeout(() => setLocationToast(null), 3000);
  };

  const handleSaveVocab = async () => {
    const isDraftOnly = !activeLearningUnitId;

    setSaveStatus("saving");

    try {
      if (vocabModal === "add") {
        if (isDraftOnly) {
          const nextRows = normalizeVocabRows([
            ...vocabRows,
            {
              id: undefined,
              index: String(vocabRows.length + 1),
              term: vocabForm.term,
              type: vocabForm.type,
              meaning: vocabForm.meaning,
              example: vocabForm.example,
              pronunciation: vocabForm.pronunciation,
            },
          ]);

          setVocabRows(nextRows);
          setLocationsState((prev) =>
            prev.map((location) => ({
              ...location,
              units: location.units.map((unit) =>
                unit.id === activeUnitId
                  ? { ...unit, vocabCount: nextRows.length }
                  : unit,
              ),
            })),
          );

          setSaveStatus("saved");
          setVocabModal(null);
          setVocabToast("Da luu nhap local. Bam Xuat ban de dong bo len he thong.");
          window.setTimeout(() => setVocabToast(null), 2400);
          return;
        }

        const payload = {
          learning_unit_id: activeLearningUnitId,
          word_vi: vocabForm.term,
          meaning_ja: vocabForm.meaning,
          example_vi: vocabForm.example || undefined,
          note: vocabForm.pronunciation || undefined,
          tag: vocabForm.type || undefined,
        };

        const created = await apiCall<{ data?: VocabCardResponse }>(
          "/vocabulary/admin/create",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        const createdCard = created.data ?? (created as VocabCardResponse);
        const nextRows = normalizeVocabRows([
          ...vocabRows,
          {
            id: createdCard.id,
            index: String(vocabRows.length + 1),
            term: createdCard.wordVi ?? vocabForm.term,
            type: createdCard.tag ?? vocabForm.type,
            meaning: createdCard.meaningJa ?? vocabForm.meaning,
            example: createdCard.exampleVi ?? vocabForm.example,
            pronunciation: createdCard.note ?? vocabForm.pronunciation,
          },
        ]);

        setVocabRows(nextRows);
        setLocationsState((prev) =>
          prev.map((location) => ({
            ...location,
            units: location.units.map((unit) =>
              unit.id === activeUnitId ? { ...unit, vocabCount: nextRows.length } : unit,
            ),
          })),
        );

        setSaveStatus("saved");
        setVocabModal(null);
        setVocabToast("Da them the tu vung.");
      } else if (vocabModal === "edit" && vocabToEditIndex) {
        const existingRow = vocabRows.find((row) => row.index === vocabToEditIndex);

        if (!isDraftOnly && existingRow?.id) {
          const payload = {
            learning_unit_id: activeLearningUnitId,
            word_vi: vocabForm.term,
            meaning_ja: vocabForm.meaning,
            example_vi: vocabForm.example || undefined,
            note: vocabForm.pronunciation || undefined,
            tag: vocabForm.type || undefined,
          };

          const updated = await apiCall<{ data?: VocabCardResponse }>(
            `/vocabulary/admin/${existingRow.id}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            },
          );

          const updatedCard = updated.data ?? (updated as VocabCardResponse);
          const nextRows = normalizeVocabRows(
            vocabRows.map((row) =>
              row.index === vocabToEditIndex
                ? {
                    ...row,
                    term: updatedCard.wordVi ?? vocabForm.term,
                    type: updatedCard.tag ?? vocabForm.type,
                    meaning: updatedCard.meaningJa ?? vocabForm.meaning,
                    example: updatedCard.exampleVi ?? vocabForm.example,
                    pronunciation: updatedCard.note ?? vocabForm.pronunciation,
                  }
                : row,
            ),
          );

          setVocabRows(nextRows);
        } else {
          const nextRows = normalizeVocabRows(
            vocabRows.map((row) =>
              row.index === vocabToEditIndex
                ? {
                    ...row,
                    term: vocabForm.term,
                    type: vocabForm.type,
                    meaning: vocabForm.meaning,
                    example: vocabForm.example,
                    pronunciation: vocabForm.pronunciation,
                  }
                : row,
            ),
          );

          setVocabRows(nextRows);
        }

        setSaveStatus("saved");
        setVocabModal(null);
        setVocabToEditIndex(null);
        setVocabToast(
          isDraftOnly
            ? "Da luu nhap local. Bam Xuat ban de dong bo len he thong."
            : "Da cap nhat the tu vung.",
        );
      }
    } catch (error) {
      console.error("Failed to save vocab", error);
      setSaveStatus("error");
      setVocabToast(
        error instanceof Error ? error.message : "Khong the luu the tu vung.",
      );

      applyLocalVocabRows(nextRows);
      setSaveStatus("saved");
      setVocabModal(null);
      setVocabToEditIndex(null);
      setVocabToast("Đã lưu nháp thẻ từ vựng.");
    }

    window.setTimeout(() => setVocabToast(null), 2400);
  };
  const handleDeleteVocab = async () => {
    if (!deleteVocabIndex) {
      return;
    }

    const nextRows = normalizeVocabRows(
      vocabRows.filter((row) => row.index !== deleteVocabIndex),
    );
    applyLocalVocabRows(nextRows);
    setSaveStatus("saved");
    setVocabToast(`Đã xóa nháp thẻ #${deleteVocabIndex}.`);

    setDeleteVocabIndex(null);
    window.setTimeout(() => setVocabToast(null), 2400);
  };

  return (
    <div
      className="min-h-screen w-full text-[#1f2b27]"
      data-save-status={saveStatus}
    >
      <div className="relative min-h-screen w-full">
        {isSidebarOpen ? <AdminSidebar active="content" /> : null}

        <main
          className={`h-screen overflow-hidden bg-white ${
            isSidebarOpen ? "ml-56 w-[calc(100%-14rem)]" : "w-full"
          }`}
        >
          <div className="h-full ml-8.75 bg-white/90">
            <div className="flex h-full">
              {isContentSidebarOpen ? (
                <section className="w-90 shrink-0 border-r border-[#eef2ee] px-6 py-6">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#9aa8a2]">
                          Nội dung
                        </p>
                        <h1 className="mt-1 text-xl font-semibold">Nội dung</h1>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddLocationOpen(true);
                          setLocationForm({
                            id: `loc-${Date.now()}`,
                            label: "",
                            icon: "",
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Thêm địa điểm
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-full border border-[#e6ece6] bg-white px-4 py-2 text-xs text-[#9aa8a2]">
                      <SearchIcon className="h-4 w-4" />
                      <input
                        value={contentQuery}
                        onChange={(event) =>
                          setContentQuery(event.target.value)
                        }
                        placeholder="Tìm kiếm địa điểm hoặc tình huống"
                        className="w-full bg-transparent text-xs text-[#1f2b27] placeholder:text-[#9aa8a2] focus:outline-none"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-[#7b8b83]">
                      <LegendDot color="#2f5d50" />
                      <span>Đã xuất bản</span>
                      <LegendDot color="#f4b24f" />
                      <span>Đã sửa đổi</span>
                      <LegendDot color="#e16f5c" />
                      <span>Nháp</span>
                    </div>

                    <div className="mt-6 flex-1 overflow-y-auto pr-2">
                      <div className="space-y-3">
                        {isContentLoading ? (
                          <p className="px-3 text-xs text-[#9aa8a2]">
                            Đang tải dữ liệu...
                          </p>
                        ) : contentError ? (
                          <p className="px-3 text-xs text-[#c65d5d]">
                            {contentError}
                          </p>
                        ) : (
                          filteredLocations.map((location) => {
                            const isExpanded = expandedIds.includes(
                              location.id,
                            );
                            const normalizedQuery = contentQuery
                              .trim()
                              .toLowerCase();
                            const filteredUnits = normalizedQuery
                              ? location.units.filter((unit) =>
                                  unit.title
                                    .toLowerCase()
                                    .includes(normalizedQuery),
                                )
                              : location.units;

                            return (
                              <div key={location.id} className="group bg-white">
                                <div className="flex items-center justify-between px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedIds((prev) =>
                                        prev.includes(location.id)
                                          ? prev.filter(
                                              (id) => id !== location.id,
                                            )
                                          : [...prev, location.id],
                                      )
                                    }
                                    className="flex items-center gap-2 text-sm font-semibold"
                                  >
                                    <ChevronDownIcon
                                      className={`h-4 w-4 text-[#9aa8a2] transition-transform ${
                                        isExpanded ? "rotate-0" : "-rotate-90"
                                      }`}
                                    />
                                    <LocationIcon
                                      name={location.icon}
                                      className="h-4 w-4 text-[#2f5d50]"
                                    />
                                    {location.label}
                                  </button>
                                  <div className="invisible flex items-center gap-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                                    <IconButton
                                      ariaLabel="Edit"
                                      onClick={() => {
                                        setIsEditLocationOpen(true);
                                        setLocationForm({
                                          id: location.id,
                                          label: location.label,
                                          icon: location.icon,
                                        });
                                      }}
                                    >
                                      <EditIcon className="h-4 w-4" />
                                    </IconButton>
                                    <IconButton
                                      ariaLabel="Delete"
                                      onClick={() =>
                                        setDeleteLocationIdState(location.id)
                                      }
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </IconButton>
                                    <StatusDot
                                      status={
                                        location.units.some(
                                          (unit) => unit.id === activeUnit?.id,
                                        ) && draftWorkflow.draft.status ===
                                          "PUBLISHED"
                                          ? "published"
                                          : location.units.some(
                                                (unit) =>
                                                  unit.id === activeUnit?.id,
                                              ) && draftWorkflow.draft.publishedAt
                                            ? "draft"
                                            : location.status
                                      }
                                    />
                                  </div>
                                </div>

                                {isExpanded ? (
                                  <div className="border-[#eef2ee] px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsAddSituationOpen(true);
                                        setCurrentLocationId(location.id);
                                        setSituationForm({
                                          id: `unit-${Date.now()}`,
                                          title: "",
                                        });
                                      }}
                                      className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-[#7b8b83]"
                                    >
                                      <PlusIcon className="h-3.5 w-3.5" />
                                      Thêm tình huống
                                    </button>
                                    <div className="mt-1 space-y-2">
                                      {filteredUnits.map((unit) => (
                                        <button
                                          key={unit.id}
                                          type="button"
                                          onClick={() =>
                                            setSelectedUnit({
                                              locationId: location.id,
                                              unitId: unit.id,
                                            })
                                          }
                                          className={`group flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm transition ${
                                            selectedUnit?.unitId === unit.id
                                              ? "bg-(--vv-accent-soft)"
                                              : "hover:bg-[#f6f8f6]"
                                          }`}
                                        >
                                          <span>{unit.title}</span>
                                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconButton
                                              ariaLabel="Edit"
                                              onClick={() => {
                                                setIsEditSituationOpen(true);
                                                setCurrentLocationId(location.id);
                                                setSituationForm({
                                                  id: unit.id,
                                                  title: unit.title,
                                                });
                                              }}
                                            >
                                              <EditIcon className="h-4 w-4" />
                                            </IconButton>

                                            <IconButton
                                              ariaLabel="Duplicate"
                                              onClick={() => {
                                                const newUnit = {
                                                  id: `unit-${Date.now()}`,
                                                  title: `${unit.title} (Copy)`,
                                                  status: "draft" as Status,
                                                  vocabCount: unit.vocabCount ?? 0,
                                                  listeningCount: unit.listeningCount ?? 0,
                                                  duration: unit.duration ?? "0:00",
                                                };
                                                setLocationsState((prev) =>
                                                  prev.map((l) =>
                                                    l.id === location.id
                                                      ? { ...l, units: [...l.units, newUnit] }
                                                      : l,
                                                  ),
                                                );
                                                setLocationToast("Đã nhân bản tình huống (chỉ nháp).");
                                                window.setTimeout(() => setLocationToast(null), 2000);
                                              }}
                                            >
                                              <PlusIcon className="h-4 w-4" />
                                            </IconButton>

                                            <div>
                                              <StatusDot
                                                status={
                                                  unit.id === activeUnit?.id
                                                    ? draftWorkflow.draft.status ===
                                                      "PUBLISHED"
                                                      ? "published"
                                                      : draftWorkflow.draft.publishedAt
                                                        ? "draft"
                                                        : "draft"
                                                    : unit.status
                                                }
                                                ariaLabel="Edit situation"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  setIsEditSituationOpen(true);
                                                  setCurrentLocationId(location.id);
                                                  setSituationForm({
                                                    id: unit.id,
                                                    title: unit.title,
                                                  });
                                                }}
                                              />
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                      {filteredUnits.length === 0 ? (
                                        <p className="px-2 pb-2 text-xs text-[#9aa8a2]">
                                          Chưa có tình huống
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <section
                className={`flex-1 overflow-y-auto ${
                  isContentSidebarOpen ? "" : "w-full"
                }`}
              >
                {activeUnit ? (
                  <div className=" border border-[#eef2ee] bg-white ">
                    <div className="border-b border-[#eef2ee] bg-white px-8 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setIsContentSidebarOpen((prev) => !prev)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e6ece6] bg-white text-[#7b8b83]"
                            aria-label="Toggle content sidebar"
                          >
                            {isContentSidebarOpen ? (
                              <MenuIcon className="h-4 w-4" />
                            ) : (
                              <SidebarClosedIcon className="h-4 w-4" />
                            )}
                          </button>
                          <div>
                            <p className="text-[11px] text-[#9aa8a2]">
                              {activeLocation?.label} / {activeUnit.title}
                            </p>
                            <h2 className="mt-1 text-xl font-semibold">
                              {activeUnit.title}
                            </h2>
                            <p className="mt-1 text-[11px] text-[#9aa8a2]">
                              {vocabRows.length} thẻ từ vựng •{" "}
                              {listeningRows.length} câu hội thoại •{" "}
                              {activeDurationLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <AutoSaveIndicator
                            status={draftWorkflow.autoSaveStatus}
                          />
                          {draftWorkflow.draft.status === "PUBLISHED" ? (
                            <span className="rounded-full bg-[#d7f0e5] border border-(--vv-accent-strong) px-3 py-2 text-[11px] font-semibold text-[#2f5d50]">
                              Đã xuất bản
                            </span>
                          ) : draftWorkflow.draft.publishedAt ? (
                            <span className="rounded-full border border-[#f4b24f] bg-[#fdf6e3] px-3 py-2 text-[11px] font-semibold text-[#b4771e]">
                              Nháp
                            </span>
                          ) : (
                            <span className="rounded-full px-3 py-2 text-[11px] font-semibold text-[#b4771e] border border-[#f4b24f] bg-[#fdf6e3]">
                              Nháp
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={handlePublishActiveUnit}
                            disabled={draftWorkflow.isPublishing}
                            className={`rounded-full px-4 py-2 text-[11px] font-semibold flex items-center gap-2 
                                bg-[#2f5d50] text-white disabled:opacity-60
                            `}
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>
                              {draftWorkflow.isPublishing
                                ? "Đang xuất bản..."
                                : "Xuất bản"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-[#eef2ee] bg-[#fafcfb] px-8 py-4">
                      <p className="text-xs font-semibold text-[#2f5d50]">
                        Cau truc noi dung: Dia diem -&gt; Tinh huong -&gt; Bai hoc (Learning Unit)
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <label className="flex flex-col gap-1 text-xs text-[#7b8b83]">
                          Chon bai hoc da co
                          <select
                            value={selectedLearningUnitId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              setSelectedLearningUnitId(nextId);
                              const selectedUnitOption = learningUnitOptions.find(
                                (unit) => unit.id === nextId,
                              );
                              if (selectedUnitOption) {
                                setSelectedLevelId(
                                  selectedUnitOption.levelId ||
                                    selectedUnitOption.level?.id ||
                                    "",
                                );
                                setLearningUnitTitleInput(
                                  selectedUnitOption.titleVi ||
                                    selectedUnitOption.titleJa ||
                                    "",
                                );
                                setIsCreateLearningUnitMode(false);
                              }
                            }}
                            className="h-10 rounded-xl border border-[#e6ece6] bg-white px-3 text-sm text-[#1f2b27]"
                          >
                            <option value="">Tao bai hoc moi</option>
                            {learningUnitOptions.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {(unit.titleVi || unit.titleJa || "Bai hoc") +
                                  (unit.level?.code ? ` (${unit.level.code})` : "")}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-[#7b8b83]">
                          Level
                          <select
                            value={selectedLevelId}
                            onChange={(e) => {
                              setSelectedLevelId(e.target.value);
                              if (selectedLearningUnitId) {
                                setSelectedLearningUnitId("");
                                setIsCreateLearningUnitMode(true);
                              }
                            }}
                            className="h-10 rounded-xl border border-[#e6ece6] bg-white px-3 text-sm text-[#1f2b27]"
                          >
                            <option value="">Chon level</option>
                            {levels.map((level) => (
                              <option key={level.id} value={level.id}>
                                {level.code || level.nameVi || level.nameJa || level.id}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-[#7b8b83]">
                          Ten bai hoc
                          <input
                            value={learningUnitTitleInput}
                            onChange={(e) => {
                              setLearningUnitTitleInput(e.target.value);
                              if (selectedLearningUnitId) {
                                setSelectedLearningUnitId("");
                                setIsCreateLearningUnitMode(true);
                              }
                            }}
                            placeholder="VD: Thanh toan tai sieu thi"
                            className="h-10 rounded-xl border border-[#e6ece6] bg-white px-3 text-sm text-[#1f2b27]"
                          />
                        </label>
                      </div>
                      <p className="mt-2 text-[11px] text-[#7b8b83]">
                        {!isCreateLearningUnitMode && selectedLearningUnitId
                          ? "Dang su dung LearningUnit da co. Publish se dung learningUnitId nay."
                          : "Dang o che do tao moi. Publish se tao LearningUnit moi theo level + ten bai hoc."}
                      </p>
                    </div>

                    <div className=" flex items-center gap-4 border-b px-8 pt-4 border-[#eef2ee] text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => setActiveTab("vocab")}
                        className={`pb-4 ${
                          activeTab === "vocab"
                            ? "border-b-2 border-[#2f5d50]"
                            : "text-[#7b8b83]"
                        }`}
                      >
                        Từ vựng
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("listening")}
                        className={`pb-4 ${
                          activeTab === "listening"
                            ? "border-b-2 border-[#2f5d50]"
                            : "text-[#7b8b83]"
                        }`}
                      >
                        Bài nghe
                      </button>
                    </div>
                    <main className="px-8 pt-4">
                      {activeTab === "vocab" ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                              {detailLoading
                                ? "Đang tải..."
                                : `${vocabRows.length} thẻ từ vựng`}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setIsVocabImportOpen(true)}
                                className="rounded-full border border-[#dfe6df] px-3 py-1 text-[11px] font-semibold text-[#7b8b83]"
                              >
                                Import CSV
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVocabModal("add");
                                  setVocabForm({
                                    index: (vocabRows.length + 1).toString(),
                                    term: "",
                                    type: "",
                                    pronunciation: "",
                                    example: "",
                                    meaning: "",
                                  });
                                }}
                                className="rounded-full bg-[#2f5d50] px-3 py-1 text-[11px] font-semibold text-white"
                              >
                                + Thêm thẻ
                              </button>
                            </div>
                          </div>

                          {detailError ? (
                            <p className="mt-2 text-[11px] text-[#c65d5d]">
                              {detailError}
                            </p>
                          ) : null}

                          {detailLoading ? (
                            <div className="mt-3 rounded-2xl border border-[#eef2ee] px-4 py-6 text-center text-[11px] text-[#7b8b83]">
                              Đang tải...
                            </div>
                          ) : (
                            <div className="mt-3 overflow-hidden rounded-2xl border border-[#eef2ee]">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-[#f8faf7] text-[#7b8b83]">
                                  <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Từ / cụm từ</th>
                                    <th className="px-4 py-3">Loại</th>
                                    <th className="px-4 py-3">
                                      Nghĩa tiếng Nhật
                                    </th>
                                    <th className="px-4 py-3">
                                      Ví dụ câu (Việt)
                                    </th>
                                    <th className="px-4 py-3"></th>
                                  </tr>
                                </thead>
                                <tbody className="text-[#1f2b27]">
                                  {vocabRows.map((row) => (
                                    <tr
                                      key={row.index}
                                      className="border-t border-[#eef2ee]"
                                    >
                                      <td className="px-4 py-3">{row.index}</td>
                                      <td className="px-4 py-3 font-semibold">
                                        {row.term}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={getTagClass(row.type)}>
                                          {row.type}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        {row.meaning}
                                      </td>
                                      <td className="px-4 py-3">
                                        {row.example}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <IconButton
                                            ariaLabel="Edit"
                                            onClick={() => {
                                              setVocabModal("edit");
                                              setVocabToEditIndex(row.index);
                                              setVocabForm({
                                                index: row.index,
                                                term: row.term,
                                                type: row.type,
                                                pronunciation:
                                                  row.pronunciation ?? "",
                                                example: row.example,
                                                meaning: row.meaning,
                                              });
                                            }}
                                          >
                                            <EditIcon className="h-4 w-4" />
                                          </IconButton>
                                          <IconButton
                                            ariaLabel="Delete"
                                            onClick={() =>
                                              setDeleteVocabIndex(row.index)
                                            }
                                          >
                                            <TrashIcon className="h-4 w-4 text-[#d46b6b]" />
                                          </IconButton>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-2 text-[11px] text-[#7b8b83]">
                            <InfoIcon className="h-4 w-4" />
                            <span>
                              Bấm vào để sửa thẻ — gồm cả nghĩa tiếng Nhật, ví
                              dụ câu tiếng Việt và ghi chú (mặt sau flashcard)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="rounded-2xl bg-[#36584e] px-4 py-5 text-white">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7f0e5] text-[#2f5d50]"
                              >
                                <PlayIcon className="h-4 w-4" />
                              </button>
                              <div className="flex-1">
                                <div className="h-2 w-full rounded-full bg-[#5f7a71]">
                                  <div className="h-full w-[65%] rounded-full bg-[#d7f0e5]" />
                                </div>
                              </div>
                              <div className="text-xs text-[#d7f0e5]">
                                0:00 / {activeDurationLabel}{" "}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setListeningModal("replace-audio")
                                  }
                                  className="underline"
                                >
                                  Thay file
                                </button>
                              </div>
                            </div>
                          </div>

                          {detailLoading ? (
                            <p className="mt-3 text-[11px] text-[#7b8b83]">
                              Đang tải dữ liệu bài nghe...
                            </p>
                          ) : null}

                          <div className="mt-3 py-4 flex items-center gap-2 text-[11px] text-[#7b8b83]">
                            <ClockIcon className="h-4 w-4" />
                            <span>
                              Bấm nút đồng hồ ở từng dòng để tự điền timestamp
                              tại vị trí đang phát
                            </span>
                          </div>

                          {detailError ? (
                            <p className="text-[11px] text-[#c65d5d]">
                              {detailError}
                            </p>
                          ) : null}

                          <div className="mt-6">
                            <p className="text-sm font-semibold">
                              Âm thanh môi trường
                            </p>
                            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#eef2ee] bg-white px-3 py-2 text-xs text-[#7b8b83]">
                              {selectedAmbientOptions.length > 0 ? (
                                selectedAmbientOptions.map((option) => (
                                  <span
                                    key={option.id}
                                    className="flex items-center gap-1 rounded-full bg-(--vv-accent-soft) px-3 py-1 text-[#2f5d50]"
                                  >
                                    {option.title}
                                    <span className="text-[#7b8b83]">×</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-[#9aa8a2]">
                                  Chưa chọn
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setListeningModal("ambient")}
                                className="text-[#9aa8a2]"
                              >
                                + Thêm...
                              </button>
                            </div>
                          </div>

                          <div className="mt-6">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">
                                Script hội thoại {listeningRows.length} câu
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setListeningModal("import-csv")
                                  }
                                  className="rounded-full border border-[#dfe6df] px-3 py-1 text-[11px] font-semibold text-[#7b8b83]"
                                >
                                  Import CSV
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full bg-[#2f5d50] px-3 py-1 text-[11px] font-semibold text-white"
                                  onClick={() => {
                                    setIsAddingRow(true);
                                    setNewRow({
                                      vi: "",
                                      jp: "",
                                      timestamp: "0:00",
                                    });
                                  }}
                                >
                                  + Thêm câu
                                </button>
                              </div>
                            </div>

                            {detailLoading ? (
                              <div className="mt-3 rounded-2xl border border-[#eef2ee] px-4 py-6 text-center text-[11px] text-[#7b8b83]">
                                Đang tải...
                              </div>
                            ) : (
                              <div className="mt-3 overflow-hidden rounded-2xl border border-[#eef2ee]">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-[#f8faf7] text-[#7b8b83]">
                                    <tr>
                                      <th className="px-4 py-3">#</th>
                                      <th className="px-4 py-3">Tiếng Việt</th>
                                      <th className="px-4 py-3">Tiếng Nhật</th>
                                      <th className="px-4 py-3">Timestamp</th>
                                      <th className="px-4 py-3"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-[#1f2b27]">
                                    {listeningRows.map((row) => (
                                      <tr
                                        key={row.index}
                                        className={`border-t border-[#eef2ee] ${
                                          editingRow === row.index
                                            ? "bg-[#eaf6ef]"
                                            : ""
                                        }`}
                                      >
                                        <td className="px-4 py-3">
                                          {row.index}
                                        </td>
                                        {editingRow === row.index ? (
                                          <>
                                            <td className="px-4 py-3">
                                              <input
                                                value={editDraft.vi}
                                                onChange={(event) =>
                                                  setEditDraft((prev) => ({
                                                    ...prev,
                                                    vi: event.target.value,
                                                  }))
                                                }
                                                placeholder="Nhập câu tiếng Việt..."
                                                className="h-9 w-full rounded-xl border border-(--vv-accent) bg-white px-3 text-[11px] text-[#1f2b27] focus:outline-none"
                                              />
                                            </td>
                                            <td className="px-4 py-3">
                                              <input
                                                value={editDraft.jp}
                                                onChange={(event) =>
                                                  setEditDraft((prev) => ({
                                                    ...prev,
                                                    jp: event.target.value,
                                                  }))
                                                }
                                                placeholder="Nhập câu tiếng Nhật..."
                                                className="h-9 w-full rounded-xl border border-(--vv-accent) bg-white px-3 text-[11px] text-[#1f2b27] focus:outline-none"
                                              />
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2">
                                                <input
                                                  value={editDraft.timestamp}
                                                  onChange={(event) =>
                                                    setEditDraft((prev) => ({
                                                      ...prev,
                                                      timestamp:
                                                        event.target.value,
                                                    }))
                                                  }
                                                  className="h-9 w-16 rounded-xl border border-(--var-accent) bg-white px-2 text-[11px] text-[#1f2b27] focus:outline-none"
                                                />
                                                <ClockIcon className="h-3.5 w-3.5 text-[#7b8b83]" />
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2">
                                                <IconButton
                                                  ariaLabel="Save"
                                                  onClick={() => {
                                                    const nextRows =
                                                      listeningRows.map(
                                                        (item) =>
                                                          item.index ===
                                                          row.index
                                                            ? {
                                                                ...item,
                                                                vi: editDraft.vi,
                                                                jp: editDraft.jp,
                                                                timestamp:
                                                                  editDraft.timestamp,
                                                              }
                                                            : item,
                                                      );

                                                    applyLocalListeningRows(
                                                      nextRows,
                                                    );
                                                    setEditingRow(null);
                                                  }}
                                                  className="border-[#a9d7c1] bg-white text-[#2f5d50]"
                                                >
                                                  <CheckIcon className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton
                                                  ariaLabel="Cancel"
                                                  onClick={cancelEditRow}
                                                  className="border-[#f0c3c3] bg-white text-[#c65d5d]"
                                                >
                                                  <CloseIcon className="h-4 w-4" />
                                                </IconButton>
                                              </div>
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="px-4 py-3">
                                              {row.vi}
                                            </td>
                                            <td className="px-4 py-3">
                                              {row.jp}
                                            </td>
                                            <td className="px-4 py-3">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleCopyTimestamp(
                                                    row.index,
                                                    row.timestamp,
                                                  )
                                                }
                                                className="flex items-center gap-2"
                                              >
                                                <span>{row.timestamp}</span>
                                                <ClockIcon className="h-3.5 w-3.5 text-[#7b8b83]" />
                                              </button>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2">
                                                <IconButton
                                                  ariaLabel="Edit"
                                                  onClick={() =>
                                                    startEditRow(row)
                                                  }
                                                >
                                                  <EditIcon className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton
                                                  ariaLabel="Delete"
                                                  onClick={() =>
                                                    setDeleteRow(row.index)
                                                  }
                                                >
                                                  <TrashIcon className="h-4 w-4 text-[#d46b6b]" />
                                                </IconButton>
                                              </div>
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    ))}
                                    {isAddingRow ? (
                                      <tr className="border-t border-[#eef2ee] bg-[#eaf6ef]">
                                        <td className="px-4 py-3">5</td>
                                        <td className="px-4 py-3">
                                          <input
                                            value={newRow.vi}
                                            onChange={(event) =>
                                              setNewRow((prev) => ({
                                                ...prev,
                                                vi: event.target.value,
                                              }))
                                            }
                                            placeholder="Nhập câu tiếng Việt..."
                                            className="h-9 w-full rounded-xl border border-(--var-accent) bg-white px-3 text-[11px] text-[#1f2b27] focus:outline-none"
                                          />
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            value={newRow.jp}
                                            onChange={(event) =>
                                              setNewRow((prev) => ({
                                                ...prev,
                                                jp: event.target.value,
                                              }))
                                            }
                                            placeholder="Nhập câu tiếng Nhật..."
                                            className="h-9 w-full rounded-xl border border-(--var-accent) bg-white px-3 text-[11px] text-[#1f2b27] focus:outline-none"
                                          />
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <input
                                              value={newRow.timestamp}
                                              onChange={(event) =>
                                                setNewRow((prev) => ({
                                                  ...prev,
                                                  timestamp: event.target.value,
                                                }))
                                              }
                                              className="h-9 w-16 rounded-xl border border-(--vv-accent) bg-white px-2 text-[11px] text-[#1f2b27] focus:outline-none"
                                            />
                                            <ClockIcon className="h-3.5 w-3.5 text-[#7b8b83]" />
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <IconButton
                                              ariaLabel="Save"
                                              className="border-[#a9d7c1] bg-white text-[#2f5d50]"
                                              onClick={saveNewRow}
                                            >
                                              <CheckIcon className="h-4 w-4" />
                                            </IconButton>
                                            <IconButton
                                              ariaLabel="Cancel"
                                              className="border-[#f0c3c3] bg-white text-[#c65d5d]"
                                              onClick={resetNewRow}
                                            >
                                              <CloseIcon className="h-4 w-4" />
                                            </IconButton>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : null}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </main>
                  </div>
                ) : (
                  <div className="flex h-105 items-center justify-center rounded-2xl border border-[#eef2ee] bg-white">
                    <div className="flex flex-col items-center gap-2 text-center text-sm text-[#7b8b83]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f7f3] text-[#9aa8a2]">
                        <SearchIcon className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-[#1f2b27]">
                        Vui lòng chọn tình huống
                      </p>
                      <p className="text-[11px]">
                        Chọn tình huống cần chỉnh sửa từ danh sách bên trái.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>

      {listeningModal === "replace-audio" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={handleCloseReplaceAudio}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UploadIcon className="h-4 w-4 text-[#2f5d50]" />
                Thay file audio
              </div>
              <button
                type="button"
                onClick={handleCloseReplaceAudio}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 pb-6 pt-4 text-xs text-[#7b8b83]">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-[#9aa8a2]">
                  FILE HIỆN TẠI
                </p>
                <div className="flex items-center justify-between rounded-2xl bg-[#f7f9f7] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#d7f0e5] text-[#2f5d50]">
                      <VolumeIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1f2b27]">
                        {activeAudioFileName}
                      </p>
                      <p className="text-[11px] text-[#9aa8a2]">
                        {activeDurationLabel} · Nguồn backend
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#e7f1ed] px-3 py-1 text-[11px] font-semibold text-[#2f5d50]">
                    Đang dùng
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-[11px] font-semibold text-[#9aa8a2]">
                  FILE MỚI
                </p>
                <div 
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7dfd9] bg-[#f7f9f7] px-6 py-7 text-center"
                  onDrop={handleDropAudio}
                  onDragOver={handleDragOverAudio}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ee] text-[#7b8b83]">
                    <UploadIcon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs text-[#7b8b83]">
                    Kéo thả file vào đây hoặc{" "}
                    <label htmlFor="audio-upload" className="font-semibold text-[#2f5d50] cursor-pointer">
                      chọn file
                    </label>
                    <input 
                      type="file" 
                      accept=".mp3,.wav,.m4a" 
                      className="hidden" 
                      id="audio-upload"
                      onChange={handleAudioFileChange}
                    />
                  </p>
                  <p className="mt-2 text-[11px] text-[#9aa8a2]">
                    MP3, WAV, M4A · Tối đa 50MB
                  </p>
                  {selectedAudioFile && (
                    <p className="mt-2 text-xs font-semibold text-[#2f5d50]">
                      Đã chọn: {selectedAudioFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f1d6a7] bg-[#fff8e8] px-4 py-3 text-[11px] text-[#b4771e]">
                <WarningIcon className="mt-0.5 h-4 w-4" />
                <p>
                  Thay file audio sẽ xóa toàn bộ timestamp trong script hiện
                  tại. Bạn cần gán lại timestamp sau khi thay file mới lên.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={handleCloseReplaceAudio}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white ${
                  !selectedAudioFile || uploadingAudio ? "bg-[#b6c4bf] cursor-not-allowed" : "bg-[#2f5d50]"
                }`}
                onClick={handleConfirmReplaceAudio}
                disabled={!selectedAudioFile || uploadingAudio}
              >
                {uploadingAudio ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <UploadIcon className="h-4 w-4" />
                )}
                Xác nhận thay
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {listeningModal === "ambient" ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-6 pt-20"
          onClick={() => setListeningModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#f0f2f0] px-6 py-4">
              <p className="text-sm font-semibold">Âm thanh môi trường</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#d7dfd9] bg-white px-3 py-2 text-xs text-[#7b8b83]">
                {selectedAmbientOptions.length > 0 ? (
                  selectedAmbientOptions.map((option) => (
                    <span
                      key={option.id}
                      className="flex items-center gap-2 rounded-full bg-[#d7f0e5] px-3 py-1 text-[#2f5d50]"
                    >
                      {option.title} <span className="text-[#7b8b83]">×</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[#9aa8a2]">Chưa chọn</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#e6ece6] bg-[#f7f9f7] px-4 py-2 text-xs text-[#9aa8a2]">
                <SearchIcon className="h-4 w-4" />
                <input
                  value={ambientQuery}
                  onChange={(event) => setAmbientQuery(event.target.value)}
                  placeholder="Tìm âm thanh..."
                  className="w-full bg-transparent text-xs text-[#1f2b27] placeholder:text-[#9aa8a2] focus:outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 text-xs">
              <div className="space-y-3">
                {filteredAmbientOptions.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 text-[#1f2b27]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmbientIds.includes(item.id)}
                      onChange={() => toggleAmbientSelection(item.id)}
                      className="peer sr-only"
                    />
                    <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-md border border-[#cfe1d8] bg-white text-transparent peer-checked:border-[#2f5d50] peer-checked:bg-[#2f5d50] peer-checked:text-white">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-[11px] text-[#9aa8a2]">
                        {item.filename} · {item.duration}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {listeningModal === "import-csv" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={() => setListeningModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UploadIcon className="h-4 w-4 text-[#2f5d50]" />
                Import CSV hội thoại
              </div>
              <button
                type="button"
                onClick={() => setListeningModal(null)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-6 pb-6 pt-5">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7dfd9]  px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ee] text-[#7b8b83]">
                  <FileIcon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs text-[#7b8b83]">
                  Kéo thả vào đây hoặc{" "}
                  <span className="font-semibold text-[#2f5d50]">
                    chọn file
                  </span>
                </p>
                <p className="mt-2 text-[11px] text-[#9aa8a2]">
                  Định dạng: câu_tiếng_việt, câu_tiếng_nhật, timestamp
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setListeningModal(null)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-[#b6c4bf] px-4 py-2 text-xs font-semibold text-white"
              >
                <UploadIcon className="h-4 w-4" />
                Import
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isVocabImportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={() => setIsVocabImportOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UploadIcon className="h-4 w-4 text-[#2f5d50]" />
                Import CSV từ vựng
              </div>
              <button
                type="button"
                onClick={() => setIsVocabImportOpen(false)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 pb-6 pt-5">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7dfd9]  px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ee] text-[#7b8b83]">
                  <FileIcon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs text-[#7b8b83]">
                  Kéo thả vào đây hoặc{" "}
                  <span className="font-semibold text-[#2f5d50]">
                    chọn file
                  </span>
                </p>
                <p className="mt-2 text-[11px] text-[#9aa8a2]">
                  Định dạng: từ, loại_từ, nghĩa_nhật, ví_dụ_việt, ví_dụ_nhật,
                  ghi_chú
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setIsVocabImportOpen(false)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => setIsVocabImportOpen(false)}
                className="inline-flex items-center gap-2 rounded-full bg-[#b6c4bf] px-4 py-2 text-xs font-semibold text-white"
              >
                <UploadIcon className="h-4 w-4" />
                Import
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {vocabModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={() => setVocabModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <EditIcon className="h-4 w-4 text-[#2f5d50]" />
                {vocabModal === "add"
                  ? "Thêm thẻ từ vựng"
                  : "Chỉnh sửa thẻ từ vựng"}
              </div>
              <button
                type="button"
                onClick={() => setVocabModal(null)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 pb-6 pt-5 text-xs text-[#7b8b83]">
              <p className="text-[11px] font-semibold text-[#2f5d50]">
                MẶT TRƯỚC
              </p>
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-2 text-black">
                  Từ / Cụm từ (tiếng Việt)
                  <input
                    value={vocabForm.term}
                    onChange={(e) =>
                      setVocabForm((p) => ({ ...p, term: e.target.value }))
                    }
                    placeholder="chém gió"
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                  />
                </label>

                <div className="flex gap-4">
                  <label className="flex-1 flex flex-col gap-2 text-black">
                    Loại từ
                    <input
                      value={vocabForm.type}
                      onChange={(e) =>
                        setVocabForm((p) => ({ ...p, type: e.target.value }))
                      }
                      className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                    />
                  </label>
                  <label className="flex-1 flex flex-col gap-2 text-black">
                    Phát âm (tùy chọn)
                    <input
                      value={vocabForm.pronunciation}
                      onChange={(e) =>
                        setVocabForm((p) => ({
                          ...p,
                          pronunciation: e.target.value,
                        }))
                      }
                      placeholder="VD: chém zó"
                      className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <div></div>

                  <input
                    value={vocabForm.example}
                    onChange={(e) =>
                      setVocabForm((p) => ({ ...p, example: e.target.value }))
                    }
                    placeholder='"Anh ấy hay chém gió lắm."'
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                  />
                </label>

                <p className="text-[11px] font-semibold text-[#2f5d50]">
                  MẶT SAU
                </p>
                <label className="flex flex-col gap-2 text-black">
                  Nghĩa tiếng Nhật
                  <input
                    value={vocabForm.meaning}
                    onChange={(e) =>
                      setVocabForm((p) => ({ ...p, meaning: e.target.value }))
                    }
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setVocabModal(null)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveVocab}
                className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white"
              >
                <SaveIcon className="h-4 w-4" />
                Lưu thẻ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteVocabIndex ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={() => setDeleteVocabIndex(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eef2ee] pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#9f3d3a]">
                <TrashIcon className="h-4 w-4 text-[#9F403D]" />
                Xóa thẻ từ vựng
              </div>
              <button
                type="button"
                onClick={() => setDeleteVocabIndex(null)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="mt-4 text-sm text-[#2D3432]">
              Bạn có chắc chắn muốn xóa thẻ #{deleteVocabIndex}?
            </p>
            <div className="mt-5 border-t border-[#eef2ee] pt-4">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteVocabIndex(null)}
                  className="text-sm font-semibold text-[#7b8b83]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleDeleteVocab}
                  className="inline-flex items-center gap-2 rounded-full bg-[#9F403D] px-4 py-2 text-xs font-semibold text-white"
                >
                  <TrashIcon className="h-4 w-4" />
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {vocabToast ? (
        <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8eee2] text-[#2f5d50]">
            ✓
          </div>
          <p className="text-sm text-[#1f2b27]">{vocabToast}</p>
          <button
            type="button"
            onClick={() => setVocabToast(null)}
            className="text-[#9aa8a2]"
          >
            ×
          </button>
        </div>
      ) : null}

      {isAddLocationOpen || isEditLocationOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={() => {
            setIsAddLocationOpen(false);
            setIsEditLocationOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-black">
                <PlusIcon className="h-4 w-4 text-[#2f5d50]" />
                {isAddLocationOpen
                  ? "Thêm địa điểm"
                  : "Chỉnh sửa tên địa điểm và biểu tượng"}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddLocationOpen(false);
                  setIsEditLocationOpen(false);
                }}
                className="text-[#9aa8a2]"
              >
                ×
              </button>
            </div>
            <div className="px-6 pb-6 pt-5 text-xs text-black">
              <label className="flex flex-col gap-2">
                Tên địa điểm
                <input
                  value={locationForm.label}
                  onChange={(e) =>
                    setLocationForm((p) => ({ ...p, label: e.target.value }))
                  }
                  placeholder="VD: Siêu thị"
                  className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 mt-4">
                Biểu tượng
                <input
                  value={locationForm.icon}
                  onChange={(e) =>
                    setLocationForm((p) => ({ ...p, icon: e.target.value }))
                  }
                  placeholder="Dán biểu tượng cảm xúc — VD 🏬"
                  className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                />
                <p className="text-[11px] text-[#9aa8a2]">
                  Tìm kiếm biểu tượng cảm xúc trên emojipedia.org và dán vào đây
                </p>
              </label>
              <div className="mt-6 flex items-center justify-between text-xs text-[#7b8b83]">
                <div className="text-black">
                  <div className="text-[11px] font-semibold">Trạng thái</div>
                  <div className="ml-4">Nháp </div>
                </div>
                <div className="text-[11px] text-[#9aa8a2]">
                  Tự động thiết lập theo tình huống
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsAddLocationOpen(false);
                  setIsEditLocationOpen(false);
                }}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const nextLabel = locationForm.label || "Tên mới";
                  const nextIcon = (locationForm.icon as IconName) || "cart";

                  if (isAddLocationOpen) {
                    const tempId = `loc-${Date.now()}`;
                    setLocationsState((prev) => [
                      ...prev,
                      {
                        id: tempId,
                        label: nextLabel,
                        icon: nextIcon,
                        status: "draft",
                        units: [],
                      },
                    ]);
                    setSaveStatus("saving");

                    try {
                      const created = await apiCall<ListeningPlaceResponse>(
                        "/listening/admin/places",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            nameVi: nextLabel,
                            nameJa: nextLabel,
                            description: null,
                            avatarUrl: null,
                          }),
                        },
                      );

                      setLocationsState((prev) =>
                        prev.map((l) =>
                          l.id === tempId
                            ? {
                                ...l,
                                id: created.id,
                                label:
                                  created.nameVi || created.nameJa || nextLabel,
                              }
                            : l,
                        ),
                      );
                      setSaveStatus("saved");
                      setLocationToast("Đã thêm địa điểm.");
                    } catch (error) {
                      console.error("Failed to create place", error);
                      setLocationsState((prev) =>
                        prev.filter((l) => l.id !== tempId),
                      );
                      setSaveStatus("error");
                      setLocationToast("Không thể thêm địa điểm.");
                    }

                    setIsAddLocationOpen(false);
                  } else {
                    setSaveStatus("saving");

                    try {
                      await apiCall(
                        `/listening/admin/places/${locationForm.id}`,
                        {
                          method: "PUT",
                          body: JSON.stringify({
                            nameVi: nextLabel,
                            nameJa: nextLabel,
                            description: null,
                            avatarUrl: null,
                          }),
                        },
                      );

                      setLocationsState((prev) =>
                        prev.map((l) =>
                          l.id === locationForm.id
                            ? {
                                ...l,
                                label: nextLabel,
                                icon: nextIcon,
                              }
                            : l,
                        ),
                      );
                      setSaveStatus("saved");
                      setLocationToast("Đã cập nhật địa điểm.");
                    } catch (error) {
                      console.error("Failed to update place", error);
                      setSaveStatus("error");
                      setLocationToast("Không thể cập nhật địa điểm.");
                    }

                    setIsEditLocationOpen(false);
                  }
                  window.setTimeout(() => setLocationToast(null), 2400);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white"
              >
                <SaveIcon className="h-4 w-4" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAddSituationOpen || isEditSituationOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={() => {
            setIsAddSituationOpen(false);
            setIsEditSituationOpen(false);
            setCurrentLocationId(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <PlusIcon className="h-4 w-4 text-[#2f5d50]" />
                {isAddSituationOpen
                  ? "Thêm tình huống"
                  : "Chỉnh sửa tên tình huống"}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddSituationOpen(false);
                  setIsEditSituationOpen(false);
                  setCurrentLocationId(null);
                }}
                className="text-[#9aa8a2]"
              >
                ×
              </button>
            </div>
            <div className="px-6 pb-6 pt-5 text-xs text-[#7b8b83]">
              <label className="flex flex-col gap-2 text-black">
                Tên tình huống
                <input
                  value={situationForm.title}
                  onChange={(e) =>
                    setSituationForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="VD: レジで支払う"
                  className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                />
              </label>
              <div className="mt-6 flex items-center justify-between text-xs text-[#7b8b83]">
                <div>
                  <div className="text-[11px] text-black">Trạng thái</div>
                  <div className="ml-4 text-black">Nháp</div>
                </div>
                <div className="text-[11px] text-[#9aa8a2]">
                  Nhấn &quot;Xuất bản&quot; sau khi thay đổi
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsAddSituationOpen(false);
                  setIsEditSituationOpen(false);
                  setCurrentLocationId(null);
                }}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentLocationId) {
                    setCurrentLocationId(null);
                    return;
                  }

                  const nextTitle = situationForm.title || "Tình huống mới";

                  if (isAddSituationOpen) {
                    const tempId = situationForm.id || `unit-${Date.now()}`;
                    setLocationsState((prev) =>
                      prev.map((l) =>
                        l.id === currentLocationId
                          ? {
                              ...l,
                              units: [
                                ...l.units,
                                {
                                  id: tempId,
                                  title: nextTitle,
                                  status: "draft",
                                  vocabCount: 0,
                                  listeningCount: 0,
                                  duration: "0:00",
                                },
                              ],
                            }
                          : l,
                      ),
                    );
                    setSaveStatus("saving");

                    try {
                      const created = await apiCall<ListeningSituationResponse>(
                        "/listening/admin/situations",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            placeId: currentLocationId,
                            titleVi: nextTitle,
                            titleJa: nextTitle,
                            description: null,
                          }),
                        },
                      );

                      setLocationsState((prev) =>
                        prev.map((l) =>
                          l.id === currentLocationId
                            ? {
                                ...l,
                                units: l.units.map((u) =>
                                  u.id === tempId
                                    ? {
                                        ...u,
                                        id: created.id,
                                        title:
                                          created.titleVi ||
                                          created.titleJa ||
                                          nextTitle,
                                      }
                                    : u,
                                ),
                              }
                            : l,
                        ),
                      );
                      setSaveStatus("saved");
                      setLocationToast("Đã thêm tình huống.");
                    } catch (error) {
                      console.error("Failed to create situation", error);
                      setLocationsState((prev) =>
                        prev.map((l) =>
                          l.id === currentLocationId
                            ? {
                                ...l,
                                units: l.units.filter((u) => u.id !== tempId),
                              }
                            : l,
                        ),
                      );
                      setSaveStatus("error");
                      const statusCode =
                        typeof error === "object" &&
                        error !== null &&
                        "statusCode" in error
                          ? Number((error as { statusCode?: unknown }).statusCode)
                          : undefined;
                      setLocationToast(
                        statusCode === 403
                          ? "Bạn không có quyền admin. Vui lòng đăng nhập bằng tài khoản admin."
                          : "Không thể thêm tình huống.",
                      );
                    }

                    setIsAddSituationOpen(false);
                  } else if (isEditSituationOpen) {
                    setSaveStatus("saving");

                    try {
                      await apiCall(
                        `/listening/admin/situations/${situationForm.id}`,
                        {
                          method: "PUT",
                          body: JSON.stringify({
                            placeId: currentLocationId,
                            titleVi: nextTitle,
                            titleJa: nextTitle,
                            description: null,
                          }),
                        },
                      );

                      setLocationsState((prev) =>
                        prev.map((l) =>
                          l.id === currentLocationId
                            ? {
                                ...l,
                                units: l.units.map((u) =>
                                  u.id === situationForm.id
                                    ? { ...u, title: nextTitle }
                                    : u,
                                ),
                              }
                            : l,
                        ),
                      );
                      setSaveStatus("saved");
                      setLocationToast("Đã cập nhật tình huống.");
                    } catch (error) {
                      console.error("Failed to update situation", error);
                      setSaveStatus("error");
                      setLocationToast("Không thể cập nhật tình huống.");
                    }

                    setIsEditSituationOpen(false);
                  }

                  window.setTimeout(() => setLocationToast(null), 2400);
                  setCurrentLocationId(null);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white"
              >
                <SaveIcon className="h-4 w-4" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteLocationIdState ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6"
          onClick={() => setDeleteLocationIdState(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eef2ee] pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#9f3d3a]">
                <TrashIcon className="h-4 w-4 text-[#9F403D]" />
                Xóa địa điểm
              </div>
              <button
                type="button"
                onClick={() => setDeleteLocationIdState(null)}
                className="text-[#9aa8a2]"
              >
                ×
              </button>
            </div>
            <p className="mt-4 text-sm text-[#2D3432]">
              Bạn có chắc chắn muốn xóa{" "}
              {
                locationsState.find((l) => l.id === deleteLocationIdState)
                  ?.label
              }
              ?
            </p>
            <div className="mt-5 border-t border-[#eef2ee] pt-4">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteLocationIdState(null)}
                  className="text-sm font-semibold text-[#7b8b83]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = deleteLocationIdState;
                    setSaveStatus("saving");

                    try {
                      await apiCall(`/listening/admin/places/${id}`, {
                        method: "DELETE",
                      });

                      setLocationsState((prev) =>
                        prev.filter((l) => l.id !== id),
                      );
                      setSaveStatus("saved");
                      setLocationToast("Đã xóa địa điểm.");
                    } catch (error) {
                      console.error("Failed to delete place", error);
                      setSaveStatus("error");
                      setLocationToast("Không thể xóa địa điểm.");
                    }

                    setDeleteLocationIdState(null);
                    window.setTimeout(() => setLocationToast(null), 2400);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#9F403D] px-4 py-2 text-xs font-semibold text-white"
                >
                  <TrashIcon className="h-4 w-4" />
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {locationToast ? (
        <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8eee2] text-[#2f5d50]">
            ✓
          </div>
          <p className="text-sm text-[#1f2b27]">{locationToast}</p>
          <button
            type="button"
            onClick={() => setLocationToast(null)}
            className="text-[#9aa8a2]"
          >
            ×
          </button>
        </div>
      ) : null}

      {deleteRow ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-6 pt-16"
          onClick={() => setDeleteRow(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-[0_18px_32px_rgba(0,0,0,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#9f3d3a]">
                <TrashIcon className="h-4 w-4" />
                Xóa câu thoại
              </div>
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-[#7b8b83]">
              Bạn có chắc chắn muốn xóa câu thoại #{deleteRow}?
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-5 py-3">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 rounded-full bg-[#9f3d3a] px-4 py-2 text-xs font-semibold text-white"
              >
                <TrashIcon className="h-4 w-4" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {timestampToast ? (
        <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d8eee2] text-[#2f5d50]">
            <CheckIcon className="h-4 w-4" />
          </div>
          <p className="text-sm text-[#1f2b27]">{timestampToast}</p>
          <button
            type="button"
            onClick={() => setTimestampToast(null)}
            className="text-[#9aa8a2]"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StatusDot({
  status,
  onClick,
  ariaLabel,
}: {
  status: Status;
  onClick?: (event: React.MouseEvent<HTMLSpanElement>) => void;
  ariaLabel?: string;
}) {
  const colors = {
    published: "bg-[#2f5d50]",
    edited: "bg-[#f4b24f]",
    draft: "bg-[#e16f5c]",
  };

  if (onClick) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={ariaLabel || "Edit"}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick(event as unknown as React.MouseEvent<HTMLSpanElement>);
          }
        }}
        className={`h-2.5 w-2.5 rounded-full ${colors[status]}`}
      />
    );
  }

  return <span className={`h-2.5 w-2.5 rounded-full ${colors[status]}`} />;
}

function LegendDot({ color }: { color: string }) {
  return (
    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
  );
}

function getTagClass(type: string) {
  switch (type) {
    case "từ lóng":
      return "rounded-full bg-(--vv-red) px-2 py-1 text-[10px]  text-white";
    case "thành ngữ":
      return "rounded-full bg-(--vv-accent-strong) px-2 py-1 text-[10px] text-white";
    case "từ chuyên ngành":
      return "rounded-full bg-[#dff2ea] px-2 py-1 text-[10px]  text-black ";
    default:
      return "rounded-full bg-[#eef2ee] px-2 py-1 text-[10px]  ";
  }
}

function IconButton({
  children,
  ariaLabel,
  onClick,
  className,
}: {
  children: ReactNode;
  ariaLabel: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`flex h-7 w-7 items-center justify-center rounded-full border border-[#eef2ee] text-[#9aa8a2] ${className || ""}`}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LocationIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  switch (name) {
    case "cart":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      );
    case "restaurant":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      );
    case "hospital":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 21h18" />
          <path d="M7 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
          <path d="M3 21v-9a2 2 0 0 1 2-2h2" />
          <path d="M17 10h2a2 2 0 0 1 2 2v9" />
          <path d="M12 7v4" />
          <path d="M10 9h4" />
        </svg>
      );
    case "bus":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 17H4v-9c0-1.1.9-2 2-2h12c1.6 0 3 1.2 3.4 2.7l.6 2.3v4c0 1.1-.9 2-2 2h-1" />
          <circle cx="17" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="7" cy="17" r="2" />
          <path d="M4 11h18" />
          <path d="M10 6v5" />
          <path d="M15 6v5" />
        </svg>
      );
    case "salon":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      );
    case "bank":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 9h16l-8-6-8 6Z" />
          <path d="M6 12v6" />
          <path d="M10 12v6" />
          <path d="M14 12v6" />
          <path d="M18 12v6" />
          <path d="M3 21h18" />
        </svg>
      );
    default:
      return null;
  }
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <line x1="10" y1="6" x2="10" y2="18" />
      <path d="m16 9-3 3 3 3" />
    </svg>
  );
}

function SidebarClosedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="17" x2="19" y2="17" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V6" />
      <path d="M8 10l4-4 4 4" />
      <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M19 9a5 5 0 0 1 0 6" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}


