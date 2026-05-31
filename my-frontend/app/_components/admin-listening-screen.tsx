"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminSidebar from "./admin-sidebar";
import { api } from "@/lib/api";
import {
  buildTranscriptPayload,
  secondsToTimestamp,
  timestampToSeconds,
  validateTranscriptRows,
  type TranscriptEditorRow,
} from "@/lib/transcript-time";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001";

type AdminLessonSummary = {
  id: string;
  learningUnitId: string;
  titleVi: string;
  titleJa: string;
  audioUrl: string;
  durationSeconds: number;
  unitTitleVi?: string | null;
  situationTitleVi?: string | null;
  placeTitleVi?: string | null;
  placeId?: string | null;
  situationId?: string | null;
};

type ApiTranscriptLine = {
  _id?: string;
  id?: string;
  start_time?: number;
  startTime?: number;
  end_time?: number;
  endTime?: number;
  text_vi?: string;
  textVi?: string;
  text_ja?: string;
  textJa?: string;
};

type LessonDetail = {
  _id?: string;
  id?: string;
  title_vi?: string;
  titleVi?: string;
  title_ja?: string;
  titleJa?: string;
  audio_url?: string;
  audioUrl?: string;
  duration_seconds?: number;
  durationSeconds?: number;
  learning_unit_id?: string;
  learningUnitId?: string;
  transcriptLines?: ApiTranscriptLine[];
};

type LearningUnitOption = {
  id: string;
  titleVi: string;
  situationTitleVi?: string | null;
  placeTitleVi?: string | null;
};

type PlaceOption = { id: string; nameVi: string };

function resolveAudioUrl(audioUrl: string) {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http")) return audioUrl;
  return `${API_BASE_URL}${audioUrl}`;
}

function mapTranscriptLines(lines: ApiTranscriptLine[]): TranscriptEditorRow[] {
  return lines.map((line, index) => ({
    id: String(line._id ?? line.id ?? index),
    vi: line.text_vi ?? line.textVi ?? "",
    jp: line.text_ja ?? line.textJa ?? "",
    startTime: line.start_time ?? line.startTime ?? 0,
    endTime: line.end_time ?? line.endTime ?? 0,
  }));
}

function stripTimestampPrefix(filename: string) {
  return filename.replace(/^\d{13}-/, "");
}

export default function AdminListeningScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentStopRef = useRef<number | null>(null);

  const [lessons, setLessons] = useState<AdminLessonSummary[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [filterPlaceId, setFilterPlaceId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null);
  const [rows, setRows] = useState<TranscriptEditorRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unitsWithoutLesson, setUnitsWithoutLesson] = useState<
    LearningUnitOption[]
  >([]);
  const [createForm, setCreateForm] = useState({
    learningUnitId: "",
    titleVi: "",
    titleJa: "",
    audioUrl: "",
  });
  
  const [uploadedAudios, setUploadedAudios] = useState<{ filename: string; url: string }[]>([]);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [customAudioName, setCustomAudioName] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const loadLessons = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterPlaceId) params.set("placeId", filterPlaceId);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const query = params.toString();
      const data = await api.get<AdminLessonSummary[]>(
        `/listening/admin/lessons${query ? `?${query}` : ""}`,
      );
      setLessons(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách bài nghe.",
      );
    } finally {
      setListLoading(false);
    }
  }, [filterPlaceId, searchQuery]);

  const loadLessonDetail = useCallback(async (lessonId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await api.get<LessonDetail>(`/listening/${lessonId}`);
      setLessonDetail(detail);
      const nextAudioUrl = detail.audio_url ?? detail.audioUrl ?? "";
      const nextDuration =
        detail.duration_seconds ?? detail.durationSeconds ?? 0;
      setAudioUrl(nextAudioUrl);
      setSelectedAudioUrl(nextAudioUrl);
      setDurationSeconds(nextDuration);
      const transcript = Array.isArray(detail.transcriptLines)
        ? mapTranscriptLines(detail.transcriptLines)
        : [];
      setRows(transcript);
      setSelectedRowIndex(0);
      setIsDirty(false);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được chi tiết bài nghe.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    void api
      .get<PlaceOption[]>("/listening/places")
      .then(setPlaces)
      .catch(() => undefined);
  }, []);

  const loadAudios = useCallback(async () => {
    try {
      const list = await api.get<{ filename: string; url: string }[]>("/listening/admin/audios");
      setUploadedAudios(list);
    } catch {}
  }, []);

  useEffect(() => {
    void loadAudios();
  }, [loadAudios]);

  useEffect(() => {
    const learningUnitId = searchParams.get("learningUnitId");
    if (!learningUnitId || !lessons.length) return;
    const match = lessons.find(
      (lesson) => lesson.learningUnitId === learningUnitId,
    );
    if (match) {
      setSelectedLessonId(match.id);
    }
  }, [searchParams, lessons]);

  useEffect(() => {
    if (!selectedLessonId) {
      setLessonDetail(null);
      setRows([]);
      return;
    }
    void loadLessonDetail(selectedLessonId);
  }, [selectedLessonId, loadLessonDetail]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (
        segmentStopRef.current !== null &&
        audio.currentTime >= segmentStopRef.current
      ) {
        audio.pause();
        segmentStopRef.current = null;
        setIsPlaying(false);
      }
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationSeconds(Math.floor(audio.duration));
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioUrl, selectedLessonId]);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );

  const resolvedAudioSrc = resolveAudioUrl(audioUrl);

  const markStart = () => {
    const time = audioRef.current?.currentTime ?? currentTime;
    setRows((prev) =>
      prev.map((row, index) =>
        index === selectedRowIndex
          ? { ...row, startTime: Math.floor(time * 10) / 10 }
          : row,
      ),
    );
    setIsDirty(true);
    showToast(`Đã gán START cho dòng #${selectedRowIndex + 1}`);
  };

  const markEnd = () => {
    const time = audioRef.current?.currentTime ?? currentTime;
    setRows((prev) =>
      prev.map((row, index) =>
        index === selectedRowIndex
          ? { ...row, endTime: Math.floor(time * 10) / 10 }
          : row,
      ),
    );
    setIsDirty(true);
    showToast(`Đã gán END cho dòng #${selectedRowIndex + 1}`);
  };

  const playSegment = (index: number) => {
    const row = rows[index];
    if (!row || !audioRef.current) return;
    const audio = audioRef.current;
    segmentStopRef.current = row.endTime > row.startTime ? row.endTime : null;
    audio.currentTime = row.startTime;
    setSelectedRowIndex(index);
    void audio.play();
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    segmentStopRef.current = null;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const updateRowField = (
    index: number,
    field: "vi" | "jp" | "startTime" | "endTime",
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        if (field === "vi" || field === "jp") {
          return { ...row, [field]: value };
        }
        if (field === "startTime") {
          return { ...row, startTime: timestampToSeconds(value) };
        }
        return { ...row, endTime: timestampToSeconds(value) };
      }),
    );
    setIsDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        vi: "",
        jp: "",
        startTime: 0,
        endTime: 0,
      },
    ]);
    setSelectedRowIndex(rows.length);
    setIsDirty(true);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setSelectedRowIndex((prev) =>
      Math.max(0, Math.min(prev, rows.length - 2)),
    );
    setIsDirty(true);
  };

  const uploadAudioFile = async (file: File, customName?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (customName) {
      formData.append("customName", customName);
    }
    const result = await api.upload<{ audioUrl: string }>(
      "/listening/admin/upload-audio",
      formData,
    );
    return result.audioUrl;
  };

  const loadAudioDuration = (url: string) =>
    new Promise<number>((resolve) => {
      const probe = new Audio(resolveAudioUrl(url));
      probe.addEventListener("loadedmetadata", () => {
        resolve(
          Number.isFinite(probe.duration) ? Math.floor(probe.duration) : 0,
        );
      });
      probe.addEventListener("error", () => resolve(0));
    });

  const handleSave = async () => {
    if (!selectedLessonId) return;

    const validationError = validateTranscriptRows(rows, durationSeconds);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const transcriptLines = buildTranscriptPayload(rows, durationSeconds);
      await api.put(`/listening/admin/${selectedLessonId}/transcript`, {
        transcriptLines,
        durationSeconds,
        audioUrl,
      });
      setIsDirty(false);
      showToast("Đã lưu timestamp.");
      await loadLessonDetail(selectedLessonId);
      await loadLessons();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không lưu được transcript.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const units = await api.get<LearningUnitOption[]>(
        "/listening/admin/learning-units-without-lesson",
      );
      setUnitsWithoutLesson(units);
      if (units[0]) {
        setCreateForm((prev) => ({
          ...prev,
          learningUnitId: units[0].id,
          titleVi: units[0].titleVi,
          titleJa: units[0].titleJa,
        }));
      }
    } catch {
      setUnitsWithoutLesson([]);
    }
  };

  const handleCreateLesson = async () => {
    if (!createForm.learningUnitId || !createForm.titleVi.trim()) {
      setError("Cần chọn learning unit và nhập tiêu đề.");
      return;
    }
    if (!createForm.audioUrl) {
      setError("Cần chọn file audio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const detectedDuration = await loadAudioDuration(createForm.audioUrl);
      const created = await api.post<LessonDetail>("/listening/admin/create", {
        learningUnitId: createForm.learningUnitId,
        titleVi: createForm.titleVi.trim(),
        titleJa: createForm.titleJa.trim() || createForm.titleVi.trim(),
        audioUrl: createForm.audioUrl,
        durationSeconds: detectedDuration || 1,
        transcriptLines: [],
      });
      const lessonId = String(created._id ?? created.id);
      setShowCreateModal(false);
      setCreateForm({
        learningUnitId: "",
        titleVi: "",
        titleJa: "",
        audioUrl: "",
      });
      await loadLessons();
      setSelectedLessonId(lessonId);
      showToast("Đã tạo bài nghe mới.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Không tạo được bài nghe.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUploadNewAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const url = await uploadAudioFile(file, customAudioName);
      await loadAudios();
      setSelectedAudioUrl(url);
      setCustomAudioName("");
      showToast("Tải lên file thành công. Hãy chọn file rồi bấm 'Xác nhận thay' để gắn vào bài nghe.");
    } catch (e) {
      setError("Tải lên file thất bại.");
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleRenameAudio = async () => {
    if (!selectedAudioUrl) return;
    const currentAudio = uploadedAudios.find(a => a.url === selectedAudioUrl);
    const oldName = currentAudio ? stripTimestampPrefix(currentAudio.filename).replace(/\.[^/.]+$/, "") : "";
    const newName = window.prompt("Nhập tên mới cho file audio (không cần ghi đuôi .mp3):", oldName);
    if (!newName || !newName.trim()) return;

    try {
      const res = await api.put<{ oldUrl: string; newUrl: string }>("/listening/admin/audios/rename", {
        oldUrl: selectedAudioUrl,
        newName: newName.trim(),
      });
      await loadAudios();
      if (audioUrl === res.oldUrl) {
        setAudioUrl(res.newUrl);
      }
      setSelectedAudioUrl(res.newUrl);
      showToast("Đã đổi tên file thành công.");
      await loadLessons();
      if (selectedLessonId) await loadLessonDetail(selectedLessonId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đổi tên thất bại.");
    }
  };

  const handleAttachAudio = async () => {
    if (!selectedLessonId || !selectedAudioUrl) return;
    const confirmed = window.confirm(
      "Thay file audio sẽ xóa toàn bộ timestamp hiện tại. Tiếp tục?",
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const detectedDuration = await loadAudioDuration(selectedAudioUrl);
      setAudioUrl(selectedAudioUrl);
      setDurationSeconds(detectedDuration);
      setRows([]);
      await api.put(`/listening/admin/${selectedLessonId}/transcript`, {
        transcriptLines: [],
        durationSeconds: detectedDuration,
        audioUrl: selectedAudioUrl,
      });
      setIsDirty(false);
      showToast("Đã gắn file audio.");
      await loadLessonDetail(selectedLessonId);
      await loadLessons();
    } catch (replaceError) {
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : "Không thay được file audio.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-[#1f2b27]">
      <AdminSidebar active="listening" />
      <main className="ml-56 min-h-screen bg-[#F2F4F2] p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Bài nghe & Timestamp</h1>
            <p className="mt-1 text-xs text-[#7b8b83]">
              Upload audio và gán thời gian cho từng câu thoại
            </p>
          </div>
          <button
            type="button"
            onClick={() => void openCreateModal()}
            className="rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white"
          >
            + Tạo bài nghe
          </button>
        </header>

        {error ? (
          <p className="mb-4 rounded-2xl border border-[#f0c3c3] bg-[#fff5f5] px-4 py-3 text-xs text-[#c65d5d]">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-4 rounded-3xl border border-[#eef2ee] bg-white p-4">
            <div className="flex flex-col gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm theo tiêu đề..."
                className="h-9 rounded-xl border border-[#dfe6df] px-3 text-xs"
              />
              <select
                value={filterPlaceId}
                onChange={(event) => setFilterPlaceId(event.target.value)}
                className="h-9 rounded-xl border border-[#dfe6df] px-3 text-xs"
              >
                <option value="">Tất cả địa điểm</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.nameVi}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadLessons()}
                className="rounded-full border border-[#dfe6df] px-3 py-1.5 text-[11px] font-semibold text-[#7b8b83]"
              >
                Lọc / Tải lại
              </button>
            </div>

            <div className="mt-4 max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto">
              {listLoading ? (
                <p className="text-xs text-[#7b8b83]">Đang tải...</p>
              ) : lessons.length === 0 ? (
                <p className="text-xs text-[#7b8b83]">Chưa có bài nghe.</p>
              ) : (
                lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left text-xs transition ${
                      selectedLessonId === lesson.id
                        ? "border-[#2f5d50] bg-[#eaf6ef]"
                        : "border-[#eef2ee] bg-[#f8faf7]"
                    }`}
                  >
                    <p className="font-semibold text-[#1f2b27]">
                      {lesson.titleVi}
                    </p>
                    <p className="mt-1 text-[#7b8b83]">
                      {[lesson.placeTitleVi, lesson.situationTitleVi]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-[#9aa8a2]">
                      {secondsToTimestamp(lesson.durationSeconds)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="col-span-8 rounded-3xl border border-[#eef2ee] bg-white p-5">
            {!selectedLessonId ? (
              <div className="flex h-96 items-center justify-center text-sm text-[#7b8b83]">
                Chọn một bài nghe để chỉnh timestamp
              </div>
            ) : detailLoading ? (
              <div className="flex h-96 items-center justify-center text-sm text-[#7b8b83]">
                Đang tải bài nghe...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {lessonDetail?.title_vi ??
                        lessonDetail?.titleVi ??
                        selectedLesson?.titleVi}
                    </h2>
                    <p className="mt-1 text-xs text-[#7b8b83]">
                      {selectedLesson?.unitTitleVi}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDirty ? (
                      <span className="text-[11px] font-semibold text-[#b4771e]">
                        Chưa lưu
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSave()}
                      className="rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {saving ? "Đang lưu..." : "Lưu timestamp"}
                    </button>
                  </div>
                </div>

                {resolvedAudioSrc ? (
                  <audio ref={audioRef} src={resolvedAudioSrc} preload="metadata" />
                ) : null}

                <div className="mt-4 rounded-2xl bg-[#2f5d50] p-4 text-white">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm"
                    >
                      {isPlaying ? "❚❚" : "▶"}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={durationSeconds || 1}
                      step={0.1}
                      value={currentTime}
                      onChange={(event) =>
                        handleSeek(Number(event.target.value))
                      }
                      className="flex-1"
                    />
                    <span className="text-xs tabular-nums">
                      {secondsToTimestamp(currentTime)} /{" "}
                      {secondsToTimestamp(durationSeconds)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={markStart}
                    className="rounded-full border border-[#2f5d50] px-3 py-1.5 text-[11px] font-semibold text-[#2f5d50]"
                  >
                    Đánh dấu START (#{selectedRowIndex + 1})
                  </button>
                  <button
                    type="button"
                    onClick={markEnd}
                    className="rounded-full border border-[#2f5d50] px-3 py-1.5 text-[11px] font-semibold text-[#2f5d50]"
                  >
                    Đánh dấu END (#{selectedRowIndex + 1})
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-full bg-[#eaf6ef] px-3 py-1.5 text-[11px] font-semibold text-[#2f5d50]"
                  >
                    + Thêm câu
                  </button>
                </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-dashed border-[#dfe6df] px-4 py-4 text-xs">
                    <div className="flex items-center gap-3">
                      <label className="font-semibold text-[#7b8b83]">
                        Chọn audio đã upload:
                      </label>
                      <select
                        value={selectedAudioUrl}
                        onChange={(e) => setSelectedAudioUrl(e.target.value)}
                        className="flex-1 h-9 rounded-xl border border-[#dfe6df] px-3"
                      >
                        <option value="">-- Chọn file audio --</option>
                        {uploadedAudios.map(audio => (
                          <option key={audio.url} value={audio.url}>
                            {stripTimestampPrefix(audio.filename)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedAudioUrl || saving}
                        onClick={() => void handleRenameAudio()}
                        className="rounded-full border border-[#dfe6df] px-3 py-1.5 text-[11px] font-semibold text-[#7b8b83] disabled:opacity-50 whitespace-nowrap"
                      >
                        ✏️ Đổi tên
                      </button>
                      <button
                        type="button"
                        disabled={!selectedAudioUrl || saving}
                        onClick={() => void handleAttachAudio()}
                        className="rounded-full bg-[#b4771e] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-50 whitespace-nowrap"
                      >
                        Xác nhận thay
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 border-t border-[#f0f2f0] pt-3">
                      <label className="font-semibold text-[#7b8b83]">
                        Hoặc upload file mới:
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Tên file mới (tuỳ chọn)..."
                          value={customAudioName}
                          onChange={(e) => setCustomAudioName(e.target.value)}
                          className="h-9 w-48 rounded-xl border border-[#dfe6df] px-3 text-xs"
                          disabled={uploadingFile}
                        />
                        <label className="cursor-pointer rounded-xl border border-[#2f5d50] px-4 py-2 text-xs font-semibold text-[#2f5d50] hover:bg-[#eaf6ef] transition">
                          ↑ Tải lên file mới
                          <input
                            type="file"
                            className="hidden"
                            accept=".mp3,.wav,.m4a,audio/*"
                            onChange={handleUploadNewAudio}
                            disabled={uploadingFile}
                          />
                        </label>
                        {uploadingFile && <span className="text-[#b4771e]">Đang tải lên...</span>}
                      </div>
                    </div>
                  </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[#eef2ee]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#f8faf7] text-[#7b8b83]">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Tiếng Việt</th>
                        <th className="px-3 py-2">Tiếng Nhật</th>
                        <th className="px-3 py-2">Start</th>
                        <th className="px-3 py-2">End</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr
                          key={row.id ?? index}
                          className={`border-t border-[#eef2ee] ${
                            selectedRowIndex === index ? "bg-[#eaf6ef]" : ""
                          }`}
                          onClick={() => setSelectedRowIndex(index)}
                        >
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              value={row.vi}
                              onChange={(event) =>
                                updateRowField(index, "vi", event.target.value)
                              }
                              className="h-8 w-full rounded-lg border border-[#dfe6df] px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.jp}
                              onChange={(event) =>
                                updateRowField(index, "jp", event.target.value)
                              }
                              className="h-8 w-full rounded-lg border border-[#dfe6df] px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={secondsToTimestamp(row.startTime)}
                              onChange={(event) =>
                                updateRowField(
                                  index,
                                  "startTime",
                                  event.target.value,
                                )
                              }
                              className="h-8 w-16 rounded-lg border border-[#dfe6df] px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={secondsToTimestamp(row.endTime)}
                              onChange={(event) =>
                                updateRowField(
                                  index,
                                  "endTime",
                                  event.target.value,
                                )
                              }
                              className="h-8 w-16 rounded-lg border border-[#dfe6df] px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  playSegment(index);
                                }}
                                className="rounded-full bg-[#eaf6ef] px-2 py-1 text-[10px] font-semibold text-[#2f5d50]"
                              >
                                Nghe
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeRow(index);
                                }}
                                className="rounded-full bg-[#fff0f0] px-2 py-1 text-[10px] font-semibold text-[#c65d5d]"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-[#7b8b83]">
                      Thêm câu thoại rồi dùng START/END khi nghe audio.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/content?learningUnitId=${selectedLesson?.learningUnitId ?? ""}`,
                    )
                  }
                  className="mt-4 text-xs text-[#2f5d50] underline"
                >
                  ← Quay lại quản lý nội dung (từ vựng)
                </button>
              </>
            )}
          </section>
        </div>
      </main>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold">Tạo bài nghe mới</h3>
            <div className="mt-4 space-y-3 text-xs">
              <select
                value={createForm.learningUnitId}
                onChange={(event) => {
                  const unit = unitsWithoutLesson.find(
                    (item) => item.id === event.target.value,
                  );
                  setCreateForm((prev) => ({
                    ...prev,
                    learningUnitId: event.target.value,
                    titleVi: unit?.titleVi ?? prev.titleVi,
                    titleJa: unit?.titleJa ?? prev.titleJa,
                  }));
                }}
                className="h-9 w-full rounded-xl border border-[#dfe6df] px-3"
              >
                <option value="">Chọn learning unit</option>
                {unitsWithoutLesson.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {[unit.placeTitleVi, unit.situationTitleVi, unit.titleVi]
                      .filter(Boolean)
                      .join(" · ")}
                  </option>
                ))}
              </select>
              <input
                value={createForm.titleVi}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    titleVi: event.target.value,
                  }))
                }
                placeholder="Tiêu đề tiếng Việt"
                className="h-9 w-full rounded-xl border border-[#dfe6df] px-3"
              />
              <input
                value={createForm.titleJa}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    titleJa: event.target.value,
                  }))
                }
                placeholder="Tiêu đề tiếng Nhật"
                className="h-9 w-full rounded-xl border border-[#dfe6df] px-3"
              />
              <select
                value={createForm.audioUrl || ""}
                onChange={(e) => setCreateForm(p => ({ ...p, audioUrl: e.target.value }))}
                className="h-9 w-full rounded-xl border border-[#dfe6df] px-3"
              >
                <option value="">-- Chọn audio đã upload --</option>
                {uploadedAudios.map(audio => (
                  <option key={audio.url} value={audio.url}>{stripTimestampPrefix(audio.filename)}</option>
                ))}
              </select>
              <div className="flex items-center gap-3 mt-2">
                <label className="cursor-pointer rounded-xl border border-[#2f5d50] px-4 py-2 text-xs font-semibold text-[#2f5d50] hover:bg-[#eaf6ef] transition">
                  ↑ Tải lên file mới
                  <input
                    type="file"
                    className="hidden"
                    accept=".mp3,.wav,.m4a,audio/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setUploadingFile(true);
                        uploadAudioFile(file).then(url => {
                          loadAudios();
                          setCreateForm(p => ({ ...p, audioUrl: url }));
                          setUploadingFile(false);
                        }).catch(() => {
                          setError("Tải lên thất bại");
                          setUploadingFile(false);
                        });
                      }
                      event.target.value = "";
                    }}
                    disabled={uploadingFile}
                  />
                </label>
                {uploadingFile && <span className="text-[#b4771e] text-xs">Đang tải lên...</span>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleCreateLesson()}
                className="rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-white px-4 py-3 text-sm shadow-lg ring-1 ring-[#dfe6df]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
