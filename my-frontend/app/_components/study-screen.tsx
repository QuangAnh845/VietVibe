"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type PlayMode = "study" | "continuous";
type AmbientSound = string;

const speeds = ["0.75x", "1.0x"] as const;

type EnvironmentSoundOption = { id: string; label: string; audioUrl?: string };

type TranscriptLine = {
  id: string;
  startTime: number;
  endTime: number;
  textVi: string;
  textJa: string;
  audioUrl?: string | null;
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

type VocabCard = {
  id: string;
  term: string;
  reading?: string;
  tag?: string;
  meaning?: string;
  example?: string;
  note?: string;
};

type ApiEnvironmentSound = {
  id?: string | number;
  _id?: string | number;
  name?: string;
  audio_url?: string;
  audioUrl?: string;
};

type ApiEnvironmentSoundResponse = {
  data?: unknown[];
};

type ApiTranscriptLine = {
  _id?: string | number;
  id?: string | number;
  start_time?: number;
  startTime?: number;
  end_time?: number;
  endTime?: number;
  text_vi?: string;
  textVi?: string;
  text_ja?: string;
  textJa?: string;
  audio_url?: string | null;
  audioUrl?: string | null;
};

type ApiListeningLesson = {
  _id?: string | number;
  id?: string | number;
  learning_unit_id?: string | number;
  learningUnitId?: string | number;
  title_vi?: string;
  titleVi?: string;
  title_ja?: string;
  titleJa?: string;
  audio_url?: string;
  audioUrl?: string;
  duration_seconds?: number;
  durationSeconds?: number;
  description?: string | null;
  transcriptLines?: unknown[];
};

type ApiVocabCard = {
  id?: string | number;
  _id?: string | number;
  wordVi?: string;
  word_vi?: string;
  term?: string;
  learningUnit?: {
    titleJa?: string;
    title_ja?: string;
  };
  tag?: string;
  meaningJa?: string;
  meaning_ja?: string;
  exampleVi?: string;
  example_vi?: string;
  note?: string;
};

const defaultAmbientOptions: EnvironmentSoundOption[] = [
  { id: "cafe", label: "カフェ" },
  { id: "road", label: "道路" },
  { id: "market", label: "市場" },
  { id: "office", label: "オフィス" },
  { id: "off", label: "オフ" },
];

const SETTINGS_STORAGE_KEY = "vv-listening-settings";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const updateProgressOnBackend = async (
  taskId: string,
  field: "vocab" | "listen",
) => {
  if (typeof window === "undefined") return;

  let authData: { accessToken?: string } | null = null;
  try {
    authData = JSON.parse(localStorage.getItem("vietvibe_auth") || "{}");
  } catch {
    authData = null;
  }

  const accessToken =
    localStorage.getItem("auth_token") || authData?.accessToken;
  if (!accessToken) return;

  try {
    await fetch(`${BACKEND_URL}/users/me/progress/learning-units/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ field, completed: true }),
    });
  } catch (error) {
    console.error(`Failed to persist ${field} completion to API`, error);
  }
};

const getApiErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as { message?: string; error?: string };
  return record.message ?? record.error;
};

interface StoredSettings {
  speed: (typeof speeds)[number];
  playMode: PlayMode;
  ambientSound: AmbientSound;
  ambientVolume: number;
}

async function fetchVocabCards(learningUnitId?: string): Promise<VocabCard[]> {
  try {
    let url = `${BACKEND_URL}/vocabulary`;

    if (learningUnitId) {
      url = `${BACKEND_URL}/vocabulary/learning-unit/${learningUnitId}`;
    } else {
      url = `${BACKEND_URL}/vocabulary?limit=100`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      let errorMsg = `HTTP ${res.status}`;

      if (contentType?.includes("application/json")) {
        try {
          const json = await res.json();
          errorMsg = json?.message || json?.error || errorMsg;
        } catch {
          errorMsg = res.statusText || errorMsg;
        }
      }

      throw new Error(`${errorMsg}`);
    }

    const json = (await res.json()) as unknown;
    const data = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown }).data)
        ? ((json as { data?: unknown[] }).data ?? [])
        : [];

    return data.map((item) => {
      const c = item as ApiVocabCard;

      return {
        id: String(c.id ?? c._id ?? ""),
        term: c.wordVi ?? c.word_vi ?? c.term ?? "",
        reading: c.learningUnit?.titleJa ?? c.learningUnit?.title_ja,
        tag: c.tag ?? undefined,
        meaning: c.meaningJa ?? c.meaning_ja ?? "",
        example: c.exampleVi ?? c.example_vi ?? "",
        note: c.note ?? undefined,
      };
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to load vocab cards:", errorMsg);
    throw error;
  }
}

export default function StudyScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const learningUnitId = searchParams.get("learningUnitId");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRequestIdRef = useRef(0);
  const currentIndexRef = useRef(0);
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

  const [activeTab, setActiveTab] = useState<"vocab" | "listen">("listen");

  const [currentIndex, setCurrentIndex] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lesson, setLesson] = useState<ListeningLesson | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [ambientOptions, setAmbientOptions] = useState<
    EnvironmentSoundOption[]
  >(defaultAmbientOptions);
  const [lineAudioUrls, setLineAudioUrls] = useState<Record<string, string>>(
    {},
  );
  const [lineDurations, setLineDurations] = useState<Record<string, number>>(
    {},
  );
  const [vocabIndex, setVocabIndex] = useState(0);
  const [vocabFlipped, setVocabFlipped] = useState(false);
  const [, setVocabFlippedCardIds] = useState<Set<string>>(() => new Set());
  const [vocabCards, setVocabCards] = useState<VocabCard[]>([]);
  const [vocabLoading, setVocabLoading] = useState(true);
  const [vocabError, setVocabError] = useState<string | null>(null);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Load settings from API or localStorage on mount
  useEffect(() => {
    let mounted = true;
    const loadSettingsAndOptions = async () => {
      // Fetch ambient options
      try {
        const envRes = await fetch(`${BACKEND_URL}/environment-sounds`);
        if (envRes.ok) {
          const envData = (await envRes.json()) as ApiEnvironmentSoundResponse;
          const envList = Array.isArray(envData.data) ? envData.data : [];
          if (envList.length > 0) {
            const mapped: EnvironmentSoundOption[] = envList.map((item) => {
              const s = item as ApiEnvironmentSound;

              return {
                id: String(s.id ?? s._id ?? ""),
                label: s.name ?? "",
                audioUrl: s.audio_url ?? s.audioUrl,
              };
            });
            mapped.push({ id: "off", label: "オフ" });
            if (mounted) setAmbientOptions(mapped);
          }
        }
      } catch (e) {
        console.error("Failed to load environment sounds", e);
      }

      // Fetch user settings
      let authData = null;
      try {
        authData = JSON.parse(localStorage.getItem("vietvibe_auth") || "{}");
      } catch {}

      if (authData?.accessToken) {
        try {
          const res = await fetch(
            `${BACKEND_URL}/users/me/listening-settings`,
            {
              headers: { Authorization: `Bearer ${authData.accessToken}` },
            },
          );
          if (res.ok) {
            const settings = await res.json();
            if (mounted && Object.keys(settings).length > 0) {
              setSpeed(settings.playback_speed === 0.75 ? "0.75x" : "1.0x");
              setPlayMode(settings.auto_pause ? "study" : "continuous");
              setAmbientSound(settings.environment_sound_id || "off");
              setAmbientVolume(settings.environment_volume ?? 40);
              setTempAmbientSound(settings.environment_sound_id || "off");
              setTempAmbientVolume(settings.environment_volume ?? 40);
              return; // skip localStorage
            }
          }
        } catch (e) {
          console.error("Failed to fetch listening settings", e);
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored && mounted) {
        try {
          const settings: StoredSettings = JSON.parse(stored);
          setSpeed(settings.speed);
          setPlayMode(settings.playMode);
          setAmbientSound(settings.ambientSound);
          setAmbientVolume(settings.ambientVolume);
          setTempAmbientSound(settings.ambientSound);
          setTempAmbientVolume(settings.ambientVolume);
        } catch (error) {
          console.error("Failed to load settings:", error);
        }
      }
    };
    void loadSettingsAndOptions();
    return () => {
      mounted = false;
    };
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
          const detailPayload = (await detailRes.json()) as unknown;

          if (!detailRes.ok) {
            throw new Error(
              getApiErrorMessage(detailPayload) || `HTTP ${detailRes.status}`,
            );
          }

          const detailJson = detailPayload as ApiListeningLesson;

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
              ? detailJson.transcriptLines.map((line, index: number) => {
                  const lineItem = line as ApiTranscriptLine;

                  return {
                    id: String(lineItem._id ?? lineItem.id ?? `${index}`),
                    startTime: lineItem.start_time ?? lineItem.startTime ?? 0,
                    endTime: lineItem.end_time ?? lineItem.endTime ?? 0,
                    textVi: lineItem.text_vi ?? lineItem.textVi ?? "",
                    textJa: lineItem.text_ja ?? lineItem.textJa ?? "",
                    audioUrl: lineItem.audio_url ?? lineItem.audioUrl ?? null,
                  };
                })
              : [],
          };
        } else {
          const listUrl = `${BACKEND_URL}/listening`;
          console.log(`Fetching listening list from: ${listUrl}`);
          const listRes = await fetch(listUrl);
          const listJson = (await listRes.json()) as unknown;

          if (!listRes.ok) {
            throw new Error(
              getApiErrorMessage(listJson) || `HTTP ${listRes.status}`,
            );
          }

          const lessonsArray: unknown[] = Array.isArray(listJson)
            ? listJson
            : [];
          // Pick by lesson order instead of title: use the second lesson if it exists.
          // With the current seed data, this is the payment lesson.
          const chosen =
            (lessonsArray[1] as ApiListeningLesson | undefined) ||
            (lessonsArray[0] as ApiListeningLesson | undefined) ||
            null;
          if (!chosen) {
            throw new Error("No listening lessons found");
          }

          const id = String(chosen._id ?? chosen.id);
          const detailUrl = `${BACKEND_URL}/listening/${id}`;
          console.log(`Fetching listening detail from: ${detailUrl}`);
          const detailRes = await fetch(detailUrl);
          const detailPayload = (await detailRes.json()) as unknown;

          if (!detailRes.ok) {
            throw new Error(
              getApiErrorMessage(detailPayload) || `HTTP ${detailRes.status}`,
            );
          }

          const detailJson = detailPayload as ApiListeningLesson;

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
              ? detailJson.transcriptLines.map((line, index: number) => {
                  const lineItem = line as ApiTranscriptLine;

                  return {
                    id: String(lineItem._id ?? lineItem.id ?? `${index}`),
                    startTime: lineItem.start_time ?? lineItem.startTime ?? 0,
                    endTime: lineItem.end_time ?? lineItem.endTime ?? 0,
                    textVi: lineItem.text_vi ?? lineItem.textVi ?? "",
                    textJa: lineItem.text_ja ?? lineItem.textJa ?? "",
                    audioUrl: lineItem.audio_url ?? lineItem.audioUrl ?? null,
                  };
                })
              : [],
          };
        }

        if (!mounted) return;

        setLesson(selectedLesson);
        setLines(selectedLesson?.transcriptLines ?? []);
        currentIndexRef.current = 0;
        setCurrentIndex(0);
        setCurrentTime(0);
        setIsPlaying(false);
        setLineAudioUrls({});
        setLineDurations({});

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (error: unknown) {
        if (!mounted) return;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Failed to load listening lesson:", errorMsg);
        setLoadError(errorMsg || "Failed to load listening lesson");
        setLesson(null);
        setLines([]);
        currentIndexRef.current = 0;
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
  const persistSettings = async (
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

    let authData = null;
    try {
      authData = JSON.parse(localStorage.getItem("vietvibe_auth") || "{}");
    } catch {}

    if (authData?.accessToken) {
      try {
        await fetch(`${BACKEND_URL}/users/me/listening-settings`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.accessToken}`,
          },
          body: JSON.stringify({
            playback_speed: newSpeed === "0.75x" ? 0.75 : 1.0,
            auto_pause: newPlayMode === "study",
            environment_sound_id:
              newAmbientSound === "off" ? null : newAmbientSound,
            environment_volume: newAmbientVolume,
          }),
        });
      } catch (e) {
        console.error("Failed to save settings to API", e);
      }
    }
  };

  // Handle speed change (immediate, no reset of progress)
  const handleSpeedChange = (newSpeed: (typeof speeds)[number]) => {
    setSpeed(newSpeed);
    persistSettings(newSpeed, playMode, ambientSound, ambientVolume);
    // Audio playback rate update happens in actual audio player implementation
  };

  // Handle settings modal save
  const handleSettingsSave = async () => {
    const audio = audioRef.current;

    setPlayMode(tempPlayMode);
    setAmbientSound(tempAmbientSound);
    setAmbientVolume(tempAmbientVolume);
    persistSettings(speed, tempPlayMode, tempAmbientSound, tempAmbientVolume);
    setIsSettingsOpen(false);

    playbackRequestIdRef.current += 1;
    audio?.pause();
    setIsPlaying(false);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setCurrentTime(0);

    requestAnimationFrame(() => {
      void seekToLine(0, false);
    });
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
  const isLastLine = lines.length > 0 && currentIndex >= lines.length - 1;

  const vocabCard =
    vocabCards[vocabIndex] ??
    ({ id: "", term: "", meaning: "", example: "" } as VocabCard);
  const isLastVocabCard =
    vocabCards.length > 0 && vocabIndex >= vocabCards.length - 1;

  const vocabTagSummary = useMemo(() => {
    const tags = Array.from(
      new Set(
        vocabCards
          .map((card) => card.tag?.trim())
          .filter((tag): tag is string => Boolean(tag)),
      ),
    );

    if (tags.length === 0) return "";

    const preview = tags.slice(0, 3).join("、");
    return tags.length > 3 ? `${preview}、...` : preview;
  }, [vocabCards]);

  const headerTitle = activeTab === "vocab" ? "語彙" : "聞き取り";
  const headerSubtitle =
    activeTab === "vocab"
      ? `${vocabCards.length}カード${vocabTagSummary ? ` · ${vocabTagSummary}` : ""}`
      : "会話";
  const headerEyebrow = lesson?.titleJa ?? "スーパー / レジで支払う";

  const resolveAudioUrl = useCallback((audioUrl: string) => {
    if (!audioUrl) return "";
    if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
    return audioUrl.startsWith("/")
      ? `${BACKEND_URL}${audioUrl}`
      : `${BACKEND_URL}/${audioUrl}`;
  }, []);

  const buildLineAudioCandidates = useCallback(
    (line: TranscriptLine) => {
      const explicitUrl = line.audioUrl ? [resolveAudioUrl(line.audioUrl)] : [];
      const textVariants = Array.from(
        new Set([
          line.textVi.trim(),
          line.textVi
            .trim()
            .replace(/[.!?。！？…]+$/u, "")
            .trim(),
        ]),
      ).filter(Boolean);
      const folderIds = [lesson?.learningUnitId, lesson?.id].filter(Boolean);

      return [
        ...explicitUrl,
        ...folderIds.flatMap((folderId) =>
          textVariants.map((text) =>
            resolveAudioUrl(
              `/audios/${folderId}/${encodeURIComponent(text)}.mp3`,
            ),
          ),
        ),
      ];
    },
    [lesson?.id, lesson?.learningUnitId, resolveAudioUrl],
  );

  const getFallbackLineDuration = (line: TranscriptLine) =>
    Math.max(line.endTime - line.startTime, 0);

  const getLineDuration = (line: TranscriptLine) =>
    lineDurations[line.id] ?? getFallbackLineDuration(line);

  const getLineStartOffset = (index: number) =>
    lines
      .slice(0, index)
      .reduce((total, line) => total + getLineDuration(line), 0);

  const baseTotalAudioDuration = lines.length
    ? lines.reduce((total, line) => total + getLineDuration(line), 0)
    : (lesson?.durationSeconds ?? 0);
  const totalAudioDuration = audioDuration > 0 ? audioDuration : baseTotalAudioDuration;

  const currentLineAudioUrl = currentLine ? lineAudioUrls[currentLine.id] : "";

  // Compute resolved audio src once to avoid passing an empty string
  // into the `src` attribute (browsers warn and may re-request the page).
  const resolvedAudioSrc =
    currentLineAudioUrl || resolveAudioUrl(lesson?.audioUrl ?? "");

  const selectedAmbientOption = ambientOptions.find(
    (o) => o.id === ambientSound,
  );
  const ambientAudioSrc = selectedAmbientOption?.audioUrl
    ? resolveAudioUrl(selectedAmbientOption.audioUrl)
    : "";

  // Synchronize ambient sound with main player state, volume, and selection
  useEffect(() => {
    const ambientAudio = ambientAudioRef.current;
    if (!ambientAudio) return;

    // 1. Update volume
    ambientAudio.volume = ambientVolume / 100;

    // 2. Play or Pause based on main audio state and setting
    if (isPlaying && ambientSound !== "off") {
      ambientAudio.play().catch((err) => {
        console.error("Failed to play ambient audio:", err);
      });
    } else {
      ambientAudio.pause();
    }
  }, [isPlaying, ambientSound, ambientVolume, ambientAudioSrc]);

  useEffect(() => {
    if (lines.length === 0 || !lesson) {
      return;
    }

    let cancelled = false;

    const readMetadata = (url: string) =>
      new Promise<number>((resolve, reject) => {
        const probe = new Audio();
        probe.preload = "metadata";
        probe.onloadedmetadata = () => {
          if (Number.isFinite(probe.duration) && probe.duration > 0) {
            resolve(probe.duration);
          } else {
            reject(new Error("Invalid audio duration"));
          }
        };
        probe.onerror = () => reject(new Error("Audio metadata unavailable"));
        probe.src = url;
      });

    const loadLineAudioMetadata = async () => {
      const nextUrls: Record<string, string> = {};
      const nextDurations: Record<string, number> = {};

      for (const line of lines) {
        const candidates = buildLineAudioCandidates(line);
        let matched = false;

        for (const candidate of candidates) {
          try {
            const duration = await readMetadata(candidate);
            if (cancelled) return;

            nextUrls[line.id] = candidate;
            nextDurations[line.id] = duration;
            matched = true;
            break;
          } catch {
            // Try the next candidate, then fall back to transcript timing.
          }
        }

        if (!matched) {
          nextDurations[line.id] = getFallbackLineDuration(line);
        }
      }

      if (!cancelled) {
        setLineAudioUrls(nextUrls);
        setLineDurations(nextDurations);
      }
    };

    void loadLineAudioMetadata();

    return () => {
      cancelled = true;
    };
  }, [buildLineAudioCandidates, lines, lesson]);

  const getLineIndexForTime = (time: number) => {
    if (lines.length === 0) return -1;

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (time >= lines[index].startTime) {
        return index;
      }
    }

    return 0;
  };

  const getAudioStartForLine = (line: TranscriptLine) =>
    lineAudioUrls[line.id] ? 0 : line.startTime;

  const getAudioEndForLine = (line: TranscriptLine) =>
    lineAudioUrls[line.id] ? getLineDuration(line) : line.endTime;

  const getDisplayTimeForLine = (index: number, audioTime: number) => {
    const line = lines[index];
    if (!line) return 0;

    const lineElapsed = lineAudioUrls[line.id]
      ? audioTime
      : audioTime - line.startTime;

    return Math.min(
      getLineStartOffset(index) +
        Math.min(Math.max(lineElapsed, 0), getLineDuration(line)),
      totalAudioDuration,
    );
  };

  const getLineIndexForAudioSource = (source: string) => {
    if (!source) return -1;

    return lines.findIndex((line) => lineAudioUrls[line.id] === source);
  };

  const loadAudioSource = (audio: HTMLAudioElement, sourceUrl: string) =>
    new Promise<void>((resolve, reject) => {
      if (!sourceUrl || audio.src === sourceUrl) {
        resolve();
        return;
      }

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", handleLoaded);
        audio.removeEventListener("canplay", handleLoaded);
        audio.removeEventListener("error", handleError);
      };
      const handleLoaded = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("Audio source failed to load"));
      };

      audio.pause();
      audio.addEventListener("loadedmetadata", handleLoaded, { once: true });
      audio.addEventListener("canplay", handleLoaded, { once: true });
      audio.addEventListener("error", handleError, { once: true });
      audio.src = sourceUrl;
      audio.load();
    });

  const playLoadedAudio = async (
    audio: HTMLAudioElement,
    requestId: number,
  ) => {
    try {
      await audio.play();
      if (playbackRequestIdRef.current === requestId) {
        setIsPlaying(true);
      }
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";
      if (errorName !== "AbortError") {
        console.error("Failed to play audio:", error);
      }
      if (playbackRequestIdRef.current === requestId) {
        setIsPlaying(false);
      }
    }
  };

  const waitForNextFrame = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

  const seekToLine = async (index: number, autoPlay = false) => {
    const targetLine = lines[index];
    const audio = audioRef.current;
    const requestId = playbackRequestIdRef.current + 1;
    playbackRequestIdRef.current = requestId;

    if (!targetLine) return;

    currentIndexRef.current = index;
    const startTime = getAudioStartForLine(targetLine);
    setCurrentIndex(index);
    setCurrentTime(getDisplayTimeForLine(index, startTime));

    if (autoPlay) {
      await waitForNextFrame();
    }

    if (playbackRequestIdRef.current !== requestId) return;

    if (audio) {
      audio.playbackRate = speed === "0.75x" ? 0.75 : 1;
      const targetAudioUrl =
        lineAudioUrls[targetLine.id] || resolveAudioUrl(lesson?.audioUrl ?? "");

      await loadAudioSource(audio, targetAudioUrl).catch((error) => {
        console.error("Failed to load audio:", error);
      });

      if (playbackRequestIdRef.current !== requestId) return;

      audio.currentTime = startTime;

      if (autoPlay) {
        await playLoadedAudio(audio, requestId);
      }
    }
  };

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    const requestId = playbackRequestIdRef.current + 1;
    playbackRequestIdRef.current = requestId;

    if (!audio || !resolvedAudioSrc) return;

    if (audio.paused) {
      if (currentLine) {
        const lineEnd = getAudioEndForLine(currentLine);
        const lineStart = getAudioStartForLine(currentLine);
        const needsReset = audio.currentTime >= lineEnd - 0.05;
        if (needsReset) {
          if (isLastLine && playMode === "continuous") {
            await seekToLine(0, true);
            return;
          }

          audio.currentTime = lineStart;
          setCurrentTime(getDisplayTimeForLine(currentIndex, lineStart));
        }
      }

      await loadAudioSource(audio, resolvedAudioSrc).catch((error) => {
        console.error("Failed to load audio:", error);
      });
      if (playbackRequestIdRef.current !== requestId) return;

      await playLoadedAudio(audio, requestId);
      return;
    }

    playbackRequestIdRef.current += 1;
    audio.pause();
    setIsPlaying(false);
    syncProgressToAPI(audio.currentTime);
  };

  const handleAudioTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = audio.currentTime;
    const sourceLineIndex = getLineIndexForAudioSource(audio.src);

    if (sourceLineIndex !== -1) {
      const sourceLine = lines[sourceLineIndex];
      const sourceLineEnd = getAudioEndForLine(sourceLine);
      const sourceLineIsLast = sourceLineIndex >= lines.length - 1;

      if (sourceLineIndex !== currentIndex) {
        currentIndexRef.current = sourceLineIndex;
        setCurrentIndex(sourceLineIndex);
      }

      if (time >= sourceLineEnd) {
        if (playMode === "continuous" && !sourceLineIsLast) {
          void seekToLine(sourceLineIndex + 1, true);
          return;
        }

        audio.pause();
        audio.currentTime = sourceLineEnd;
        setCurrentTime(getDisplayTimeForLine(sourceLineIndex, sourceLineEnd));
        setIsPlaying(false);
        return;
      }

      setCurrentTime(getDisplayTimeForLine(sourceLineIndex, time));
      return;
    }

    if (currentLine) {
      const lineEnd = getAudioEndForLine(currentLine);

      if (time >= lineEnd) {
        if (
          playMode === "continuous" &&
          lineAudioUrls[currentLine.id] &&
          !isLastLine
        ) {
          void seekToLine(currentIndex + 1, true);
          return;
        }

        if (playMode === "study" || lineAudioUrls[currentLine.id]) {
          audio.pause();
          audio.currentTime = lineEnd;
          setCurrentTime(getDisplayTimeForLine(currentIndex, lineEnd));
          setIsPlaying(false);
          return;
        }
      }

      setCurrentTime(getDisplayTimeForLine(currentIndex, time));

      if (playMode === "study" || lineAudioUrls[currentLine.id]) {
        return;
      }
    }

    const activeLineIndex = getLineIndexForTime(time);
    if (activeLineIndex !== -1) {
      if (activeLineIndex !== currentIndex) {
        currentIndexRef.current = activeLineIndex;
        setCurrentIndex(activeLineIndex);
      }
      setCurrentTime(getDisplayTimeForLine(activeLineIndex, time));
    }
  };

  const handleAudioEnded = () => {
    const audio = audioRef.current;
    const sourceLineIndex = audio ? getLineIndexForAudioSource(audio.src) : -1;

    if (sourceLineIndex !== -1) {
      const sourceLine = lines[sourceLineIndex];
      const sourceLineIsLast = sourceLineIndex >= lines.length - 1;

      if (playMode === "continuous" && !sourceLineIsLast) {
        void seekToLine(sourceLineIndex + 1, true);
        return;
      }

      setIsPlaying(false);
      currentIndexRef.current = sourceLineIndex;
      setCurrentIndex(sourceLineIndex);
      setCurrentTime(
        getDisplayTimeForLine(sourceLineIndex, getAudioEndForLine(sourceLine)),
      );

      if (sourceLineIsLast) {
        syncProgressToAPI(totalAudioDuration);
      }

      return;
    }

    if (currentLine && lineAudioUrls[currentLine.id] && !isLastLine) {
      if (playMode === "continuous") {
        void seekToLine(currentIndex + 1, true);
        return;
      }

      setIsPlaying(false);
      setCurrentTime(
        getDisplayTimeForLine(currentIndex, getAudioEndForLine(currentLine)),
      );
      return;
    }

    if (playMode === "continuous" && !isLastLine) {
      void seekToLine(currentIndex + 1, true);
      return;
    }

    setIsPlaying(false);
    if (lines.length > 0) {
      currentIndexRef.current = lines.length - 1;
      setCurrentIndex(lines.length - 1);
      setCurrentTime(totalAudioDuration);
    }
    syncProgressToAPI(totalAudioDuration);
  };

  const syncProgressToAPI = async (progressSeconds: number) => {
    if (!lesson?.id) return;
    let authData = null;
    try {
      authData = JSON.parse(localStorage.getItem("vietvibe_auth") || "{}");
    } catch {}
    if (authData?.accessToken) {
      try {
        await fetch(`${BACKEND_URL}/situations/${lesson.id}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.accessToken}`,
          },
          body: JSON.stringify({ progress_seconds: progressSeconds }),
        });
      } catch (e) {
        console.error("Failed to update progress to API", e);
      }
    }
  };

  const markListeningCompletion = async () => {
    if (!lesson?.learningUnitId) return;

    try {
      await updateProgressOnBackend(lesson.learningUnitId, "listen");
    } catch (error) {
      console.error("Failed to store listening completion", error);
    }
  };

  const markListeningCompletionAndExit = async () => {
    await markListeningCompletion();
    await syncProgressToAPI(totalAudioDuration);
    router.push("/");
  };

  const markVocabCompletion = async () => {
    if (!lesson?.learningUnitId) return;

    try {
      await updateProgressOnBackend(lesson.learningUnitId, "vocab");
      router.push("/");
    } catch (error) {
      console.error("Failed to store vocab completion", error);
    }
  };

  const goPrev = () => {
    void seekToLine(Math.max(currentIndex - 1, 0), isPlaying);
  };
  const goNext = () => {
    if (lines.length === 0) return;
    if (isLastLine) {
      markListeningCompletionAndExit();
      return;
    }
    void seekToLine(Math.min(currentIndex + 1, lines.length - 1), isPlaying);
  };

  const goPrevVocab = () => {
    setVocabIndex((prev) => Math.max(prev - 1, 0));
    setVocabFlipped(false);
  };

  const goNextVocab = async () => {
    if (isLastVocabCard) {
      await markVocabCompletion();
      return;
    }
    setVocabIndex((prev) => Math.min(prev + 1, vocabCards.length - 1));
    setVocabFlipped(false);
  };

  const handleVocabCardFlip = () => {
    if (!vocabCard?.id) return;

    setVocabFlipped((prev) => {
      const nextFlipped = !prev;

      if (nextFlipped) {
        setVocabFlippedCardIds((prevIds) => {
          const nextIds = new Set(prevIds);
          nextIds.add(vocabCard.id);
          return nextIds;
        });
      }

      return nextFlipped;
    });
  };

  const formatSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setVocabLoading(true);
      setVocabError(null);
    });

    fetchVocabCards(learningUnitId ?? undefined)
      .then((result) => {
        if (!mounted) return;
        setVocabCards(result);
        setVocabIndex(0);
        setVocabFlipped(false);
        setVocabFlippedCardIds(new Set());
        setVocabLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("useEffect - Vocab fetch error:", errorMsg);
        setVocabError(errorMsg || "Failed to load vocabulary cards");
        setVocabCards([]);
        setVocabLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [learningUnitId]);

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
                onClick={() => {
                  void handleSettingsSave();
                }}
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
            preload="metadata"
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(e) => {
              const audio = e.target as HTMLAudioElement;
              if (Number.isFinite(audio.duration)) {
                setAudioDuration(audio.duration);
              }
            }}
            onDurationChange={(e) => {
              const audio = e.target as HTMLAudioElement;
              if (Number.isFinite(audio.duration)) {
                setAudioDuration(audio.duration);
              }
            }}
            className="hidden"
          />
        ) : null}

        {ambientAudioSrc ? (
          <audio
            ref={ambientAudioRef}
            src={ambientAudioSrc}
            preload="auto"
            loop
            className="hidden"
          />
        ) : null}

        <div className="vv-rise-in">
          <p className="text-xs font-semibold text-(--vv-muted)">
            {headerEyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {headerTitle}
          </h1>
          <p className="mt-1 text-xs text-(--vv-muted)">{headerSubtitle}</p>
        </div>

        <div className="flex items-center gap-6 border-b border-(--vv-border) text-sm font-semibold vv-rise-in vv-delay-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("vocab");
            }}
            className={`pb-3 transition ${
              activeTab === "vocab"
                ? "relative text-(--vv-accent-strong)"
                : "text-(--vv-muted) hover:text-(--vv-accent-strong)"
            }`}
          >
            語彙
            {activeTab === "vocab" ? (
              <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-(--vv-accent-strong)" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("listen");
            }}
            className={`pb-3 transition ${
              activeTab === "listen"
                ? "relative text-(--vv-accent-strong)"
                : "text-(--vv-muted) hover:text-(--vv-accent-strong)"
            }`}
          >
            聞き取り
            {activeTab === "listen" ? (
              <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-(--vv-accent-strong)" />
            ) : null}
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

        {activeTab === "listen" ? (
          <>
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
            <div className="vv-rise-in vv-delay-3">
              <div className="rounded-3xl bg-[#cfeee3] p-4 shadow-[0_12px_24px_rgba(35,70,60,0.12)]">
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
                            lines.length > 0 && totalAudioDuration > 0
                              ? `${Math.max(
                                  8,
                                  Math.min(
                                    100,
                                    (currentTime / totalAudioDuration) * 100,
                                  ),
                                )}%`
                              : "8%",
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-(--vv-accent-strong)">
                    {formatSeconds(Math.floor(currentTime))} /{" "}
                    {formatSeconds(Math.floor(totalAudioDuration))}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-white/90 p-4 shadow-[0_12px_24px_rgba(31,43,39,0.08)] ring-1 ring-(--vv-ring)">
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

              <div className="mt-4 flex items-center justify-between">
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
            </div>

            <div className="flex flex-col gap-2">
              {lines.map((line, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => {
                      void seekToLine(index, true);
                    }}
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
          </>
        ) : vocabLoading ? (
          <div className="mt-6 text-center text-sm text-(--vv-muted)">
            読み込み中...
          </div>
        ) : vocabError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
            <div className="mb-2 font-semibold text-red-700">エラー</div>
            <div className="mb-3 text-red-600">{vocabError}</div>
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
              <ul className="list-inside list-disc space-y-1 text-xs">
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
                <li>ブラウザの開発ツールのコンソールでエラーを確認</li>
              </ul>
            </div>
          </div>
        ) : vocabCards.length === 0 ? (
          <div className="mt-6 text-center text-sm text-(--vv-muted)">
            単語が見つかりません。
          </div>
        ) : (
          <div>
            <div className="text-xs font-semibold m-2 ">
              カード {vocabLoading ? "..." : vocabIndex + 1} /{" "}
              {vocabLoading ? "..." : vocabCards.length}
            </div>
            <div
              className=" vv-flip"
              data-flipped={vocabFlipped}
              onClick={handleVocabCardFlip}
            >
              <div className="relative vv-flip-inner">
                <div className="vv-flip-side w-full ">
                  <div className="w-full rounded-3xl border border-(--vv-border) bg-white px-6 py-10 text-center shadow-[0_12px_24px_rgba(31,43,39,0.08)]">
                    <span className="inline-flex items-center rounded-full bg-[#b24a3f] px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
                      {vocabCard.tag}
                    </span>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                      {vocabCard.term}
                    </h2>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-(--vv-muted)">
                      {vocabCard.reading}
                    </p>

                    <p className="mt-3 text-xs text-(--vv-muted) italic">
                      “{vocabCard.example}”
                    </p>
                  </div>
                  <p className="mt-6 text-xs font-semibold text-(--vv-muted) text-center">
                    カードをタップして裏返す
                  </p>
                </div>

                <div className="absolute inset-0 h-full w-full vv-flip-side vv-flip-back ">
                  <div className="rounded-3xl border border-(--vv-border) bg-white px-6 py-8 text-left shadow-[0_12px_24px_rgba(31,43,39,0.08)]">
                    <p className="text-base font-semibold text-foreground">
                      {vocabCard.meaning}
                    </p>

                    <p className="mt-3 text-xs text-(--vv-muted)">
                      例：「{vocabCard.example}」
                    </p>

                    <div className="mt-4 rounded-2xl bg-[#f3f4f2] px-4 py-3 text-xs text-(--vv-muted)">
                      メモ: {vocabCard.note}
                    </div>
                  </div>
                  <p className="mt-6 text-xs font-semibold text-(--vv-muted) text-center">
                    カードをタップして表に戻す
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={goPrevVocab}
                disabled={vocabIndex === 0}
                className="inline-flex items-center gap-2 rounded-full bg-[#eef0ec] px-4 py-2 text-xs font-semibold text-(--vv-muted) transition disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                前へ
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goNextVocab();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#dfe5df] px-4 py-2 text-xs font-semibold text-(--vv-accent-strong) transition"
              >
                {isLastVocabCard ? "完了" : "次へ"}
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
