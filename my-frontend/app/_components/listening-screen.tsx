"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type PlayMode = "study" | "continuous";
type AmbientSound = "cafe" | "road" | "market" | "office" | "off";

const speeds = ["0.75x", "1.0x"] as const;

type TranscriptLine = {
  id: string;
  startTime: number;
  endTime: number;
  textVi: string;
  textJa: string;
};

type ListeningLesson = {
  id: string;
  learningUnitId: string;
  titleVi: string;
  titleJa: string;
  audioUrl: string;
  durationSeconds: number;
  description?: string | null;
  transcriptLines: TranscriptLine[];
};

const ambientOptions: Array<{ id: AmbientSound; label: string }> = [
  { id: "cafe", label: "カフェ" },
  { id: "road", label: "道路" },
  { id: "market", label: "市場" },
  { id: "office", label: "オフィス" },
  { id: "off", label: "オフ" },
];

const SETTINGS_STORAGE_KEY = "vv-listening-settings";
const PROGRESS_STORAGE_KEY = "vv-task-progress";
const LAST_SELECTION_STORAGE_KEY = "vv-last-selection";
const PROGRESS_EVENT = "vv-progress-updated";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface StoredSettings {
  speed: (typeof speeds)[number];
  playMode: PlayMode;
  ambientSound: AmbientSound;
  ambientVolume: number;
}

export default function ListeningScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const learningUnitId = searchParams.get("learningUnitId");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Persisted settings (applied immediately)
  const [speed, setSpeed] = useState<(typeof speeds)[number]>("1.0x");
  const [playMode, setPlayMode] = useState<PlayMode>("study");
  const [showJapanese, setShowJapanese] = useState(true);

  // Temporary settings (only used in modal, applied on save)
  const [tempPlayMode, setTempPlayMode] = useState<PlayMode>("study");

  // Temporary settings (only used in modal, applied on save)
  const [tempAmbientSound, setTempAmbientSound] =
    useState<AmbientSound>("cafe");
  const [tempAmbientVolume, setTempAmbientVolume] = useState(40);

  // Actual applied settings
  const [ambientSound, setAmbientSound] = useState<AmbientSound>("cafe");
  const [ambientVolume, setAmbientVolume] = useState(40);

  const [currentIndex, setCurrentIndex] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lesson, setLesson] = useState<ListeningLesson | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      try {
        const settings: StoredSettings = JSON.parse(stored);
        setSpeed(settings.speed);
        setPlayMode(settings.playMode);
        setTempPlayMode(settings.playMode);
        setAmbientSound(settings.ambientSound);
        setAmbientVolume(settings.ambientVolume);
        setTempAmbientSound(settings.ambientSound);
        setTempAmbientVolume(settings.ambientVolume);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = speed === "0.75x" ? 0.75 : 1;
  }, [speed, lesson?.audioUrl]);

  useEffect(() => {
    let mounted = true;

    const loadLesson = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        let selectedLesson: ListeningLesson | null = null;

        if (learningUnitId) {
          const url = `${BACKEND_URL}/listening/learning-unit/${learningUnitId}`;
          console.log(`Fetching listening lesson from: ${url}`);
          const detailRes = await fetch(url);
          const detailJson = await detailRes.json();

          if (!detailRes.ok) {
            throw new Error(
              detailJson?.message ||
                detailJson?.error ||
                `HTTP ${detailRes.status}`,
            );
          }

          selectedLesson = {
            id: String(detailJson._id ?? detailJson.id),
            learningUnitId: String(
              detailJson.learning_unit_id ?? detailJson.learningUnitId,
            ),
            titleVi: detailJson.title_vi ?? detailJson.titleVi ?? "",
            titleJa: detailJson.title_ja ?? detailJson.titleJa ?? "",
            audioUrl: detailJson.audio_url ?? detailJson.audioUrl ?? "",
            durationSeconds:
              detailJson.duration_seconds ?? detailJson.durationSeconds ?? 0,
            description: detailJson.description ?? null,
            transcriptLines: Array.isArray(detailJson.transcriptLines)
              ? detailJson.transcriptLines.map((line: any, index: number) => ({
                  id: String(line._id ?? line.id ?? `${index}`),
                  startTime: line.start_time ?? line.startTime ?? 0,
                  endTime: line.end_time ?? line.endTime ?? 0,
                  textVi: line.text_vi ?? line.textVi ?? "",
                  textJa: line.text_ja ?? line.textJa ?? "",
                }))
              : [],
          };
        } else {
          const listUrl = `${BACKEND_URL}/listening`;
          console.log(`Fetching listening list from: ${listUrl}`);
          const listRes = await fetch(listUrl);
          const listJson = await listRes.json();

          if (!listRes.ok) {
            throw new Error(
              listJson?.message || listJson?.error || `HTTP ${listRes.status}`,
            );
          }

          const lessonsArray: any[] = Array.isArray(listJson) ? listJson : [];
          // Pick by lesson order instead of title: use the second lesson if it exists.
          // With the current seed data, this is the payment lesson.
          const chosen = lessonsArray[1] || lessonsArray[0] || null;
          if (!chosen) {
            throw new Error("No listening lessons found");
          }

          const id = String(chosen._id ?? chosen.id);
          const detailUrl = `${BACKEND_URL}/listening/${id}`;
          console.log(`Fetching listening detail from: ${detailUrl}`);
          const detailRes = await fetch(detailUrl);
          const detailJson = await detailRes.json();

          if (!detailRes.ok) {
            throw new Error(
              detailJson?.message ||
                detailJson?.error ||
                `HTTP ${detailRes.status}`,
            );
          }

          selectedLesson = {
            id: String(detailJson._id ?? detailJson.id),
            learningUnitId: String(
              detailJson.learning_unit_id ?? detailJson.learningUnitId,
            ),
            titleVi: detailJson.title_vi ?? detailJson.titleVi ?? "",
            titleJa: detailJson.title_ja ?? detailJson.titleJa ?? "",
            audioUrl: detailJson.audio_url ?? detailJson.audioUrl ?? "",
            durationSeconds:
              detailJson.duration_seconds ?? detailJson.durationSeconds ?? 0,
            description: detailJson.description ?? null,
            transcriptLines: Array.isArray(detailJson.transcriptLines)
              ? detailJson.transcriptLines.map((line: any, index: number) => ({
                  id: String(line._id ?? line.id ?? `${index}`),
                  startTime: line.start_time ?? line.startTime ?? 0,
                  endTime: line.end_time ?? line.endTime ?? 0,
                  textVi: line.text_vi ?? line.textVi ?? "",
                  textJa: line.text_ja ?? line.textJa ?? "",
                }))
              : [],
          };
        }

        if (!mounted) return;

        setLesson(selectedLesson);
        setLines(selectedLesson?.transcriptLines ?? []);
        setCurrentIndex(0);
        setCurrentTime(0);
        setIsPlaying(false);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (error: any) {
        if (!mounted) return;
        console.error("Failed to load listening lesson:", error);
        setLoadError(error?.message || "Failed to load listening lesson");
        setLesson(null);
        setLines([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadLesson();

    return () => {
      mounted = false;
    };
  }, [learningUnitId]);

  // Persist settings whenever they change
  const persistSettings = (
    newSpeed: (typeof speeds)[number],
    newPlayMode: PlayMode,
    newAmbientSound: AmbientSound,
    newAmbientVolume: number,
  ) => {
    const settings: StoredSettings = {
      speed: newSpeed,
      playMode: newPlayMode,
      ambientSound: newAmbientSound,
      ambientVolume: newAmbientVolume,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  };

  // Handle speed change (immediate, no reset of progress)
  const handleSpeedChange = (newSpeed: (typeof speeds)[number]) => {
    setSpeed(newSpeed);
    persistSettings(newSpeed, playMode, ambientSound, ambientVolume);
    // Audio playback rate update happens in actual audio player implementation
  };

  // Handle settings modal save
  const handleSettingsSave = () => {
    setPlayMode(tempPlayMode);
    setAmbientSound(tempAmbientSound);
    setAmbientVolume(tempAmbientVolume);
    persistSettings(speed, tempPlayMode, tempAmbientSound, tempAmbientVolume);
    setIsSettingsOpen(false);
  };

  // Handle settings modal cancel
  const handleSettingsCancel = () => {
    // Reset temporary settings to current values
    setTempPlayMode(playMode);
    setTempAmbientSound(ambientSound);
    setTempAmbientVolume(ambientVolume);
    setIsSettingsOpen(false);
  };

  // Update playMode and persist
  const handlePlayModeChange = (newMode: PlayMode) => {
    setTempPlayMode(newMode);
  };

  const openSettings = () => {
    setTempPlayMode(playMode);
    setTempAmbientSound(ambientSound);
    setTempAmbientVolume(ambientVolume);
    setIsSettingsOpen(true);
  };

  const currentLine = lines[currentIndex];
  const lessonDuration = lesson?.durationSeconds ?? 0;
  const isLastLine = lines.length > 0 && currentIndex >= lines.length - 1;

  const vocabHref = learningUnitId
    ? `/vocab?learningUnitId=${encodeURIComponent(learningUnitId)}`
    : "/vocab";

  const updateLastSelectionMode = (mode: "vocab" | "listen") => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(LAST_SELECTION_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        sectionId: string;
        taskId: string;
        mode: "vocab" | "listen";
      };

      localStorage.setItem(
        LAST_SELECTION_STORAGE_KEY,
        JSON.stringify({ ...parsed, mode }),
      );
    } catch {
      // Ignore parsing errors
    }
  };

  const resolveAudioUrl = (audioUrl: string) => {
    if (!audioUrl) return "";
    if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
    return audioUrl.startsWith("/")
      ? `${BACKEND_URL}${audioUrl}`
      : `${BACKEND_URL}/${audioUrl}`;
  };

  // Compute resolved audio src once to avoid passing an empty string
  // into the `src` attribute (browsers warn and may re-request the page).
  const resolvedAudioSrc = resolveAudioUrl(lesson?.audioUrl ?? "");

  const getLineIndexForTime = (time: number) => {
    if (lines.length === 0) return -1;

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (time >= lines[index].startTime) {
        return index;
      }
    }

    return 0;
  };

  const seekToLine = (index: number, autoPlay = false) => {
    const targetLine = lines[index];
    const audio = audioRef.current;

    if (!targetLine) return;

    setCurrentIndex(index);

    if (audio) {
      audio.currentTime = targetLine.startTime;
      setCurrentTime(targetLine.startTime);

      if (autoPlay) {
        void audio
          .play()
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.error("Failed to play audio:", error);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;

    if (!audio || !lesson?.audioUrl) return;

    if (audio.paused) {
      if (playMode === "study" && currentLine) {
        const needsReset = audio.currentTime >= currentLine.endTime - 0.05;
        if (needsReset) {
          audio.currentTime = currentLine.startTime;
          setCurrentTime(currentLine.startTime);
        }
      }
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((error) => {
          console.error("Failed to play audio:", error);
          setIsPlaying(false);
        });
      return;
    }

    audio.pause();
    setIsPlaying(false);
  };

  const handleAudioTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = audio.currentTime;
    if (playMode === "study" && currentLine) {
      if (time >= currentLine.endTime) {
        audio.pause();
        audio.currentTime = currentLine.endTime;
        setCurrentTime(currentLine.endTime);
        setIsPlaying(false);
        return;
      }

      setCurrentTime(time);
      return;
    }

    setCurrentTime(time);

    const activeLineIndex = getLineIndexForTime(time);
    if (activeLineIndex !== -1 && activeLineIndex !== currentIndex) {
      setCurrentIndex(activeLineIndex);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    markListeningCompletion();
    if (lines.length > 0) {
      setCurrentIndex(lines.length - 1);
      setCurrentTime(lessonDuration);
    }
  };

  const markListeningCompletion = () => {
    if (typeof window === "undefined") return;

    try {
      const lastSelectionRaw = localStorage.getItem(
        LAST_SELECTION_STORAGE_KEY,
      );
      if (!lastSelectionRaw) return;

      const lastSelection = JSON.parse(lastSelectionRaw) as {
        sectionId: string;
        taskId: string;
        mode: "vocab" | "listen";
      };

      if (lastSelection.mode !== "listen") return;

      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
      const progress = stored ? JSON.parse(stored) : {};
      if (!progress[lastSelection.sectionId]) {
        progress[lastSelection.sectionId] = {};
      }
      if (!progress[lastSelection.sectionId][lastSelection.taskId]) {
        progress[lastSelection.sectionId][lastSelection.taskId] = {};
      }

      if (progress[lastSelection.sectionId][lastSelection.taskId].listen) {
        return;
      }

      progress[lastSelection.sectionId][lastSelection.taskId].listen = true;
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      window.dispatchEvent(new Event(PROGRESS_EVENT));
    } catch (error) {
      console.error("Failed to store listening completion", error);
    }
  };

  const markListeningCompletionAndExit = () => {
    markListeningCompletion();
    router.push("/");
  };

  const goPrev = () => seekToLine(Math.max(currentIndex - 1, 0), isPlaying);
  const goNext = () => {
    if (lines.length === 0) return;
    if (isLastLine) {
      markListeningCompletionAndExit();
      return;
    }
    seekToLine(Math.min(currentIndex + 1, lines.length - 1), isPlaying);
  };

  const formatSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#f8f6f2] via-[#f3f7f3] to-[#ecf2ee]">
      {isSettingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleSettingsCancel}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-[0_24px_50px_rgba(0,0,0,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  再生設定
                </h2>
              </div>
              <button
                type="button"
                className="text-lg font-semibold text-(--vv-muted)"
                onClick={handleSettingsCancel}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Play Mode Selection */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-(--vv-muted)">
                再生モード
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => handlePlayModeChange("study")}
                  className={`flex-1 rounded-3xl px-5 py-3 text-sm font-semibold transition ${
                    tempPlayMode === "study"
                      ? "bg-(--vv-accent-strong) text-white"
                      : "bg-(--vv-border) text-(--vv-muted)"
                  }`}
                >
                  学習モード
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayModeChange("continuous")}
                  className={`flex-1 rounded-3xl px-5 py-3 text-sm font-semibold transition ${
                    tempPlayMode === "continuous"
                      ? "bg-(--vv-accent-strong) text-white"
                      : "bg-(--vv-border) text-(--vv-muted)"
                  }`}
                >
                  連続再生
                </button>
              </div>
            </div>

            {/* Ambient Sound Selection (Temporary) */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-(--vv-muted)">
                環境音の練習
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ambientOptions.map((option) => {
                  const isActive = tempAmbientSound === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTempAmbientSound(option.id)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-(--vv-accent-soft) text-(--vv-accent-strong)"
                          : "bg-(--vv-border) text-(--vv-muted)"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ambient Sound Volume (Temporary) - Only show when not "off" */}
            {tempAmbientSound !== "off" && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-(--vv-muted)">
                    環境音の音量
                  </p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tempAmbientVolume}
                  onChange={(event) =>
                    setTempAmbientVolume(Number(event.target.value))
                  }
                  className="vv-range w-full"
                />
              </div>
            )}

            {/* Save / Cancel Buttons */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleSettingsCancel}
                className="flex-1 rounded-full bg-(--vv-border) px-4 py-3 text-sm font-semibold text-(--vv-muted) transition hover:bg-(--vv-border)/80"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSettingsSave}
                className="flex-1 rounded-full bg-(--vv-accent-strong) px-4 py-3 text-sm font-semibold text-white transition hover:bg-(--vv-accent-strong)/90"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-105 flex-col gap-5 px-4 pb-10 pt-6">
        {resolvedAudioSrc ? (
          <audio
            ref={audioRef}
            src={resolvedAudioSrc}
            preload="metadata"
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        ) : null}

        <div className="vv-rise-in">
          <p className="text-xs font-semibold text-(--vv-muted)">
            {lesson?.titleVi ?? "スーパー / レジで支払う"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            聞き取り
          </h1>
          <p className="mt-1 text-xs text-(--vv-muted)">
            {lesson?.titleJa ?? "会話"}
          </p>
        </div>

        <div className="flex items-center gap-6 border-b border-(--vv-border) text-sm font-semibold vv-rise-in vv-delay-1">
          <Link
            href={vocabHref}
            onClick={() => updateLastSelectionMode("vocab")}
            className="pb-3 text-(--vv-muted) transition hover:text-(--vv-accent-strong)"
          >
            語彙
          </Link>
          <span className="relative pb-3 text-(--vv-accent-strong)">
            聞き取り
            <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-(--vv-accent-strong)" />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 vv-rise-in vv-delay-2">
          <button
            type="button"
            onClick={() => setShowJapanese((prev) => !prev)}
            aria-pressed={showJapanese}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-(--vv-muted) ring-1 ring-(--vv-border)"
          >
            {showJapanese ? "日本語" : "日本語を隠す"}
            <ChevronDownIcon className="h-4 w-4" />
          </button>

          {/* Speed Control Buttons */}
          <div className="flex items-center gap-2 rounded-full bg-white ring-1 ring-(--vv-border) p-1">
            {speeds.map((item) => {
              const isActive = item === speed;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSpeedChange(item)}
                  title={
                    item === "0.75x" ? "通常より25%遅い速度" : "通常の速度"
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-(--vv-accent-strong) text-white"
                      : "text-(--vv-muted) hover:text-(--vv-accent-strong)"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={openSettings}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-(--vv-border) transition hover:bg-(--vv-border)/20"
            aria-label="Settings"
            title="再生設定を開く"
          >
            <SettingsIcon className="h-5 w-5 text-(--vv-muted)" />
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white/90 p-4 text-center text-sm text-(--vv-muted) ring-1 ring-(--vv-ring)">
            読み込み中...
          </div>
        ) : loadError ? (
          <div className="rounded-3xl bg-red-50 p-4 text-sm ring-1 ring-red-200">
            <div className="mb-2 font-semibold text-red-700">エラー</div>
            <div className="mb-3 text-red-600">{loadError}</div>
            <div className="border-t border-red-200 pt-3 text-xs text-red-600">
              <p className="mb-2 font-semibold">デバッグ情報:</p>
              <p>
                Backend URL: <code className="font-mono">{BACKEND_URL}</code>
              </p>
              {learningUnitId && (
                <p>
                  Learning Unit ID:{" "}
                  <code className="font-mono">{learningUnitId}</code>
                </p>
              )}
              <p className="mt-2 font-semibold">トラブルシューティング:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  バックエンドが起動しているか確認:{" "}
                  <code className="font-mono">npm run start:dev</code>
                </li>
                <li>バックエンドがポート3001で起動していることを確認</li>
                <li>
                  Swagger ドキュメント:{" "}
                  <a
                    href="http://localhost:3001/api/docs"
                    target="_blank"
                    className="underline"
                  >
                    http://localhost:3001/api/docs
                  </a>
                </li>
                <li>ブラウザのコンソールでエラーを確認</li>
              </ul>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl bg-[#cfeee3] p-4 shadow-[0_12px_24px_rgba(35,70,60,0.12)] vv-rise-in vv-delay-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={!lesson?.audioUrl}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-(--vv-accent-strong) text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Play"
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5" />
              ) : (
                <PlayIcon className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1">
              <div className="h-2 w-full rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-(--vv-accent-strong)"
                  style={{
                    width:
                      lines.length > 0 && lessonDuration > 0
                        ? `${Math.max(
                            8,
                            Math.min(100, (currentTime / lessonDuration) * 100),
                          )}%`
                        : "8%",
                  }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-(--vv-accent-strong)">
              {formatSeconds(Math.floor(currentTime))} /{" "}
              {formatSeconds(lessonDuration)}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 p-4 shadow-[0_12px_24px_rgba(31,43,39,0.08)] ring-1 ring-(--vv-ring)">
          {currentLine ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                {currentLine.textVi}
              </p>
              <p className="mt-2 text-xs text-(--vv-muted)">
                {showJapanese ? currentLine.textJa : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-(--vv-muted)">
              会話データがありません。
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-(--vv-muted) ring-1 ring-(--vv-border) disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            前の文
          </button>
          <span className="text-xs font-semibold text-(--vv-muted)">
            {lines.length === 0 ? 0 : currentIndex + 1} / {lines.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={lines.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-(--vv-muted) ring-1 ring-(--vv-border) disabled:opacity-50"
          >
            {isLastLine ? "完了" : "次の文"}
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {lines.map((line, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={line.id}
                type="button"
                onClick={() => seekToLine(index, isPlaying)}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  isActive
                    ? "bg-[#cfeee3]"
                    : "bg-white/80 ring-1 ring-(--vv-border)"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isActive
                      ? "bg-(--vv-accent-strong) text-white"
                      : "bg-(--vv-border) text-(--vv-muted)"
                  }`}
                >
                  <PlayIcon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {line.textVi}
                  </p>
                  <p className="mt-1 text-xs text-(--vv-muted)">
                    {showJapanese ? line.textJa : ""}
                  </p>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .35 2l.04.05a2 2 0 1 1-2.83 2.83l-.05-.04a1.8 1.8 0 0 0-2-.35 1.8 1.8 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.07a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .35l-.05.04a2 2 0 1 1-2.83-2.83l.04-.05a1.8 1.8 0 0 0 .35-2 1.8 1.8 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.07a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.35-2l-.04-.05A2 2 0 1 1 7.11 3.1l.05.04a1.8 1.8 0 0 0 2 .35 1.8 1.8 0 0 0 1-1.6V2a2 2 0 1 1 4 0v.07a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.35l.05-.04a2 2 0 1 1 2.83 2.83l-.04.05a1.8 1.8 0 0 0-.35 2 1.8 1.8 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.07a1.8 1.8 0 0 0-1.53 1z" />
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
      <path d="M8 5.5v13l10-6.5-10-6.5z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 5.5h3v13H7v-13zm7 0h3v13h-3v-13z" />
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

function ChevronLeftIcon({ className }: { className?: string }) {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
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
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
