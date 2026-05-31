"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

type Task = {
  id: string;
  title: string;
  vocab: boolean;
  listen: boolean;
  learningUnitId?: string;
};

type ToggleField = "vocab" | "listen";

type IconName =
  | "cart"
  | "restaurant"
  | "hospital"
  | "bus"
  | "salon"
  | "bank"
  | "taxi";

type Section = {
  id: string;
  label: string;
  icon: IconName;
  tasks: Task[];
};

type Place = {
  id: string;
  nameVi: string;
  nameJa: string;
  description?: string | null;
};

type Situation = {
  id: string;
  placeId: string;
  titleVi: string;
  titleJa: string;
  description?: string | null;
};

type LearningUnit = {
  id: string;
  situationId: string;
  levelId: string;
  titleVi: string;
  titleJa: string;
  description?: string | null;
};

type SituationFull = Situation & {
  learningUnits: LearningUnit[];
};

type PlaceFull = Place & {
  situations: SituationFull[];
};

type OverallProgressResponse = {
  total_checked_vocab?: number;
  total_checked_listening?: number;
  total_vocab_tasks?: number;
  total_listening_tasks?: number;
  learning_unit_progress?: Record<string, { vocab: boolean; listen: boolean }>;
  learningUnitProgress?: Record<string, { vocab: boolean; listen: boolean }>;
  totalCheckedVocab?: number;
  totalCheckedListening?: number;
  totalVocabTasks?: number;
  totalListeningTasks?: number;
};

type ProgressCounts = {
  totalVocab: number;
  totalListening: number;
  checkedVocab: number;
  checkedListening: number;
};

const LAST_SELECTION_STORAGE_KEY = "vv-last-selection";

// Map places to icon names
const placeIconMap: Record<string, IconName> = {
  super: "cart",
  supermarket: "cart",
  restaurant: "restaurant",
  hospital: "hospital",
  bus: "bus",
  salon: "salon",
  bank: "bank",
  taxi: "taxi",
};

export default function HomeScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [loadingPlaceIds, setLoadingPlaceIds] = useState<string[]>([]);
  const [query, setQuery] = useState<string>("");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMode, setNotificationMode] = useState<
    "login" | "register"
  >("login");
  const [progressCounts, setProgressCounts] = useState<ProgressCounts | null>(
    null,
  );
  const [learningUnitProgress, setLearningUnitProgress] = useState<
    Record<string, { vocab: boolean; listen: boolean }>
  >({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  // Check user role and redirect admin to dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("vietvibe_auth");
    if (!authData) return;

    try {
      const { user } = JSON.parse(authData);
      if (user?.role === "admin") {
        router.push("/dashboard");
      }
    } catch {
      // Ignore parsing errors
    }
  }, [router]);

  // Load overall progress and per-unit states from backend.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadOverallProgress = async () => {
      setIsLoadingProgress(true);
      const accessToken = localStorage.getItem("auth_token");
      if (!accessToken) {
        setProgressCounts(null);
        setLearningUnitProgress({});
        setIsLoadingProgress(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/me/progress`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch overall progress");
        }

        const data: OverallProgressResponse = await response.json();
        const totalVocab = data.total_vocab_tasks ?? data.totalVocabTasks ?? 0;
        const totalListening =
          data.total_listening_tasks ?? data.totalListeningTasks ?? 0;
        const checkedVocab =
          data.total_checked_vocab ?? data.totalCheckedVocab ?? 0;
        const checkedListening =
          data.total_checked_listening ?? data.totalCheckedListening ?? 0;

        setProgressCounts({
          totalVocab,
          totalListening,
          checkedVocab,
          checkedListening,
        });
        setLearningUnitProgress(
          data.learning_unit_progress ?? data.learningUnitProgress ?? {},
        );

        // Reflect DB progress into already-loaded tasks (if user opened sections early)
        setSections((prev) =>
          prev.map((section) => ({
            ...section,
            tasks: section.tasks.map((task) => {
              const dbTask =
                data.learning_unit_progress?.[task.id] ??
                data.learningUnitProgress?.[task.id];
              if (!dbTask) return task;
              return {
                ...task,
                vocab: dbTask.vocab,
                listen: dbTask.listen,
              };
            }),
          })),
        );
      } catch (error) {
        console.error("Failed to load overall progress from API:", error);
        setProgressCounts(null);
        setLearningUnitProgress({});
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadOverallProgress();
  }, [API_BASE_URL]);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);

        // Fetch places only (do not fetch situations/learning units yet)
        const placesRes = await fetch(`${API_BASE_URL}/listening/places`);
        if (!placesRes.ok) throw new Error("Failed to fetch places");
        const places: Place[] = await placesRes.json();

        // Build minimal sections with empty tasks for now
        const nextSections: Section[] = places.map((place) => {
          const placeKey = place.nameVi.toLowerCase().replace(/\s+/g, "-");
          const icon: IconName = Object.keys(placeIconMap).some((key) =>
            placeKey.includes(key),
          )
            ? placeIconMap[
                Object.keys(placeIconMap).find((key) =>
                  placeKey.includes(key),
                ) as string
              ]
            : "cart";

          return {
            id: place.id,
            label: place.nameJa,
            icon,
            tasks: [],
          };
        });

        // Apply persisted progress if any (will be applied once tasks are loaded per-section)
        setSections(nextSections);
        setOpenIds([]);
      } catch (error) {
        console.error("Failed to load data from API:", error);
        setSections([]);
        setOpenIds([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [API_BASE_URL]);

  // Fetch place hierarchy (situations + learning units) when opening it
  const fetchPlaceDetails = async (placeId: string) => {
    // mark this place as loading so UI can show a spinner/skeleton
    setLoadingPlaceIds((prev) =>
      prev.includes(placeId) ? prev : [...prev, placeId],
    );
    try {
      const placeRes = await fetch(
        `${API_BASE_URL}/listening/places/${placeId}/full`,
      );
      if (!placeRes.ok) return;
      const placeFull: PlaceFull = await placeRes.json();

      const tasks = placeFull.situations.flatMap((situation) =>
        situation.learningUnits.map((unit) => ({
          id: unit.id,
          title: unit.titleJa,
          vocab: false,
          listen: false,
          learningUnitId: unit.id,
        })),
      );

      // DB is the source of truth for toggle status
      const mergedTasks = tasks.map((task) => {
        const dbProgress = learningUnitProgress[task.id];
        return {
          ...task,
          vocab: dbProgress?.vocab ?? task.vocab,
          listen: dbProgress?.listen ?? task.listen,
        };
      });

      setSections((prev) =>
        prev.map((section) =>
          section.id === placeId ? { ...section, tasks: mergedTasks } : section,
        ),
      );
    } catch (error) {
      console.error("Failed to fetch place details:", error);
    } finally {
      setLoadingPlaceIds((prev) => prev.filter((id) => id !== placeId));
    }
  };

  const handleToggleSection = async (sectionId: string) => {
    const isOpen = openIds.includes(sectionId);
    if (isOpen) {
      setOpenIds((prev) => prev.filter((id) => id !== sectionId));
      return;
    }

    // Open immediately so UI can render a loading skeleton while we fetch
    setOpenIds((prev) =>
      prev.includes(sectionId) ? prev : [...prev, sectionId],
    );

    // If tasks not loaded yet, fetch them (skeleton will show because of loadingPlaceIds)
    const section = sections.find((s) => s.id === sectionId);
    if (section && section.tasks.length === 0) {
      await fetchPlaceDetails(sectionId);
    }
  };

  // Handle login/register notification
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("vietvibe_auth");
    const hasSuccess = localStorage.getItem("showLoginSuccess");
    const mode =
      (localStorage.getItem("loginSuccessMode") as "login" | "register") ||
      "login";

    let loggedInAt = "";
    let isAdmin = false;

    if (authData) {
      try {
        const parsed = JSON.parse(authData) as {
          loggedInAt?: string;
          user?: { role?: string };
        };
        loggedInAt = parsed.loggedInAt || "";
        isAdmin = String(parsed.user?.role || "").toLowerCase() === "admin";
      } catch {
        loggedInAt = "";
      }
    }

    if (isAdmin) return;

    const lastShown = sessionStorage.getItem("loginToastLastShown") || "";
    const shouldShow = hasSuccess || (loggedInAt && loggedInAt > lastShown);

    if (!shouldShow) return;

    const timer = window.setTimeout(() => {
      setShowNotification(true);
      setNotificationMode(mode);
    }, 0);

    if (loggedInAt) {
      sessionStorage.setItem("loginToastLastShown", loggedInAt);
    }
    localStorage.removeItem("showLoginSuccess");
    localStorage.removeItem("loginSuccessMode");

    return () => window.clearTimeout(timer);
  }, []);

  const progress = (() => {
    if (!progressCounts) return 0;
    const totalTasks =
      progressCounts.totalVocab + progressCounts.totalListening;
    if (totalTasks === 0) return 0;
    return Math.round(
      ((progressCounts.checkedVocab + progressCounts.checkedListening) /
        totalTasks) *
        100,
    );
  })();

  const normalizedQuery = query.trim().toLowerCase();

  const searchSections = useMemo<Section[]>(() => {
    if (!normalizedQuery) return [];

    return sections.reduce<Section[]>((acc, section) => {
      const sectionMatch = section.label
        .toLowerCase()
        .includes(normalizedQuery);
      const taskMatch = section.tasks.some((task) =>
        task.title.toLowerCase().includes(normalizedQuery),
      );

      if (sectionMatch || taskMatch) {
        acc.push(section);
      }

      return acc;
    }, []);
  }, [normalizedQuery, sections]);

  const handleTaskLaunch = (
    sectionId: string,
    taskId: string,
    field: ToggleField,
  ) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        LAST_SELECTION_STORAGE_KEY,
        JSON.stringify({ sectionId, taskId, mode: field }),
      );
    }

    const section = sections.find((item) => item.id === sectionId);
    const task = section?.tasks.find((item) => item.id === taskId);
    const query = task?.learningUnitId
      ? `?learningUnitId=${encodeURIComponent(task.learningUnitId)}`
      : "";

    router.push(`/study${query}`);
  };

  const handleTaskToggle = (
    sectionId: string,
    taskId: string,
    field: ToggleField,
  ) => {
    const nextValue = !sections
      .find((section) => section.id === sectionId)
      ?.tasks.find((task) => task.id === taskId)?.[field];

    const previousSections = sections;
    const previousCounts = progressCounts;
    const previousLearningUnitProgress = learningUnitProgress;

    const nextSections = previousSections.map((section) => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        tasks: section.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, [field]: !task[field] };
        }),
      };
    });

    setSections(nextSections);

    const fallbackCounts =
      previousCounts ??
      previousSections.reduce<ProgressCounts>(
        (acc, section) => {
          for (const task of section.tasks) {
            acc.totalVocab += 1;
            acc.totalListening += 1;
            if (task.vocab) acc.checkedVocab += 1;
            if (task.listen) acc.checkedListening += 1;
          }
          return acc;
        },
        {
          totalVocab: 0,
          totalListening: 0,
          checkedVocab: 0,
          checkedListening: 0,
        },
      );

    const nextCounts: ProgressCounts = {
      ...fallbackCounts,
      checkedVocab:
        field === "vocab"
          ? Math.min(
              fallbackCounts.totalVocab,
              Math.max(0, fallbackCounts.checkedVocab + (nextValue ? 1 : -1)),
            )
          : fallbackCounts.checkedVocab,
      checkedListening:
        field === "listen"
          ? Math.min(
              fallbackCounts.totalListening,
              Math.max(
                0,
                fallbackCounts.checkedListening + (nextValue ? 1 : -1),
              ),
            )
          : fallbackCounts.checkedListening,
    };

    setProgressCounts(nextCounts);
    setLearningUnitProgress({
      ...previousLearningUnitProgress,
      [taskId]: {
        vocab:
          field === "vocab"
            ? nextValue
            : (previousLearningUnitProgress[taskId]?.vocab ?? false),
        listen:
          field === "listen"
            ? nextValue
            : (previousLearningUnitProgress[taskId]?.listen ?? false),
      },
    });

    if (typeof window === "undefined") return;

    try {
      const accessToken = localStorage.getItem("auth_token");

      if (accessToken) {
        void fetch(
          `${API_BASE_URL}/users/me/progress/learning-units/${taskId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              field,
              completed: nextValue,
            }),
          },
        )
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result: OverallProgressResponse = await response.json();
            setProgressCounts({
              totalVocab:
                result.total_vocab_tasks ?? result.totalVocabTasks ?? 0,
              totalListening:
                result.total_listening_tasks ?? result.totalListeningTasks ?? 0,
              checkedVocab:
                result.total_checked_vocab ?? result.totalCheckedVocab ?? 0,
              checkedListening:
                result.total_checked_listening ??
                result.totalCheckedListening ??
                0,
            });
            setLearningUnitProgress(
              result.learning_unit_progress ??
                result.learningUnitProgress ??
                {},
            );
          })
          .catch((error) => {
            console.error("Failed to persist toggle progress", error);
            setSections(previousSections);
            setProgressCounts(previousCounts ?? null);
            setLearningUnitProgress(previousLearningUnitProgress);
          });
      }
    } catch (error) {
      setSections(previousSections);
      setProgressCounts(previousCounts ?? null);
      setLearningUnitProgress(previousLearningUnitProgress);
      console.error("Failed to update task progress", error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#f8f6f2] via-[#f3f7f3] to-[#ecf2ee]">
      {showNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm rounded-2xl bg-white shadow-lg p-4 flex items-center gap-3 mx-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shrink-0">
            ✓
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-green-700">
              {notificationMode === "login"
                ? "ログインが完了しました！"
                : "登録が完了しました！"}
            </p>
            <p className="text-xs text-green-600">VietVibeへようこそ</p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-105 flex-col gap-6 px-4 pb-10 pt-8">
        <header className="relative z-20 flex items-center justify-between vv-rise-in">
          <div className="flex items-center gap-3">
            <div className="vv-logo flex h-12 w-12 items-center justify-center rounded-2xl bg-(--vv-accent) text-lg text-white shadow-[0_12px_20px_rgba(35,70,60,0.25)]">
              VV
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">VietVibe</p>
              <p className="text-xs text-(--vv-muted)">場所を選んで始める</p>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-(--vv-accent) text-sm font-semibold text-white shadow-sm ring-1 ring-(--vv-ring)"
            >
              TH
            </button>
          </div>
        </header>

        <div className="relative z-30 vv-rise-in vv-delay-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-(--vv-muted)" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="場所や状況を検索..."
            className="h-12 w-full rounded-2xl border border-transparent bg-white/90 pl-12 pr-4 text-sm text-foreground shadow-sm ring-1 ring-(--vv-ring) transition focus:border-(--vv-accent) focus:outline-none"
          />
          {normalizedQuery ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl bg-white p-2 shadow-[0_18px_28px_rgba(0,0,0,0.12)] ring-1 ring-(--vv-ring)">
              {searchSections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-(--vv-border) px-3 py-4 text-center text-xs text-(--vv-muted)">
                  該当する結果が見つかりません。
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {searchSections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-(--vv-border) bg-white/80"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleSection(section.id);
                          setQuery("");
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center text-(--vv-accent-strong)">
                            <Icon name={section.icon} className="h-4 w-4" />
                          </span>
                          <div className="text-left">
                            <p className="text-sm font-semibold">
                              {section.label}
                            </p>
                          </div>
                        </div>
                        <ChevronIcon className="h-4 w-4 text-(--vv-muted)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <section className="relative z-10 rounded-3xl bg-white/90 p-4 shadow-[0_18px_32px_rgba(31,43,39,0.08)] ring-1 ring-(--vv-ring) vv-rise-in vv-delay-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-(--vv-muted)">
              全体の進捗
            </p>
            <p className="text-sm font-semibold text-(--vv-accent-strong)">
              {isLoadingProgress ? "..." : `${progress}%`}
            </p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-(--vv-border)">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                isLoadingProgress
                  ? "bg-linear-to-r from-[#d7ddd8] via-[#eef2ec] to-[#d7ddd8] animate-pulse"
                  : "bg-(--vv-accent)"
              }`}
              style={{ width: isLoadingProgress ? "42%" : `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex flex-col gap-3">
            {isLoadingData ? (
              <div className="flex flex-col gap-3 py-1">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-(--vv-border) bg-white/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#e7ebe6] animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-3 w-28 rounded-full bg-[#e7ebe6] animate-pulse" />
                          <div className="h-2 w-20 rounded-full bg-[#edf1ec] animate-pulse" />
                        </div>
                      </div>
                      <div className="h-4 w-4 rounded-full bg-[#e7ebe6] animate-pulse" />
                    </div>
                    <div className="mt-4 grid gap-2">
                      <div className="h-10 rounded-full bg-[#eef1ec] animate-pulse" />
                      <div className="h-10 rounded-full bg-[#eef1ec] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-(--vv-border) bg-white/70 px-4 py-6 text-center text-sm text-(--vv-muted)">
                データを読み込めませんでした。
              </div>
            ) : (
              sections.map((section) => {
                const isOpen = openIds.includes(section.id);

                return (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-(--vv-border) bg-white/80"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSection(section.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center text-(--vv-accent-strong)">
                          <Icon name={section.icon} className="h-5 w-5" />
                        </span>
                        <div className="text-left">
                          <p className="text-sm font-semibold">
                            {section.label}
                          </p>
                          <p className="text-xs text-(--vv-muted)">
                            {section.tasks.length > 0
                              ? `${section.tasks.length} レッスン`
                              : "準備中"}
                          </p>
                        </div>
                      </div>
                      <ChevronIcon
                        className={`h-4 w-4 text-(--vv-muted) transition-transform ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </button>

                    {isOpen ? (
                      <div className="border-t border-(--vv-border) px-4 py-3">
                        {section.tasks.length === 0 ? (
                          loadingPlaceIds.includes(section.id) ? (
                            <div className="flex flex-col gap-2">
                              {[1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="h-10 rounded-full bg-[#eef1ec] animate-pulse"
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-(--vv-muted)">
                              まもなく追加されます。
                            </p>
                          )
                        ) : (
                          <div className="flex flex-col gap-3">
                            {section.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTaskLaunch(
                                      section.id,
                                      task.id,
                                      "listen",
                                    )
                                  }
                                  className="flex-1 text-left text-sm font-medium text-foreground hover:text-(--vv-accent-strong)"
                                >
                                  {task.title}
                                </button>
                                <div className="flex items-center gap-2">
                                  <ToggleButton
                                    label="語彙"
                                    active={task.vocab}
                                    onClick={() =>
                                      handleTaskToggle(
                                        section.id,
                                        task.id,
                                        "vocab",
                                      )
                                    }
                                  />
                                  <ToggleButton
                                    label="聞く"
                                    active={task.listen}
                                    onClick={() =>
                                      handleTaskToggle(
                                        section.id,
                                        task.id,
                                        "listen",
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
        active
          ? "bg-(--vv-accent-soft) text-(--vv-accent-strong)"
          : "bg-white text-(--vv-muted) ring-1 ring-(--vv-border)"
      }`}
    >
      {label}
      {active ? <span aria-hidden="true">✓</span> : null}
    </button>
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

function ChevronIcon({ className }: { className?: string }) {
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

function Icon({ name, className }: { name: IconName; className?: string }) {
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
    case "taxi":
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
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    default:
      return null;
  }
}
