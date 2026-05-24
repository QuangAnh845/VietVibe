"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type VocabCard = {
  id: string;
  term: string;
  reading?: string;
  tag?: string;
  meaning?: string;
  example?: string;
  note?: string;
};

type RawVocabCard = {
  _id?: string;
  id?: string;
  wordVi?: string;
  word_vi?: string;
  term?: string;
  learningUnit?: {
    titleJa?: string;
  };
  tag?: string | null;
  meaningJa?: string;
  meaning_ja?: string;
  exampleVi?: string;
  example_vi?: string;
  note?: string | null;
};

type VocabularyProgressResponse = {
  success: boolean;
  viewedCardsCount: number;
  totalVocabularyCards: number;
  completed: boolean;
};

// Backend base URL (can be overridden with NEXT_PUBLIC_BACKEND_URL)
const DEFAULT_BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const PROGRESS_STORAGE_KEY = "vv-task-progress";
const LAST_SELECTION_STORAGE_KEY = "vv-last-selection";
const PROGRESS_EVENT = "vv-progress-updated";

async function fetchVocabCards(learningUnitId?: string): Promise<VocabCard[]> {
  try {
    let url = `${DEFAULT_BACKEND}/vocabulary`;

    // If learningUnitId is provided, fetch vocabulary for that specific unit
    if (learningUnitId) {
      url = `${DEFAULT_BACKEND}/vocabulary/learning-unit/${learningUnitId}`;
    } else {
      url = `${DEFAULT_BACKEND}/vocabulary?limit=100`;
    }

    console.log(`Fetching vocab from: ${url}`);

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
          // response.json() failed, use status text
          errorMsg = res.statusText || errorMsg;
        }
      }

      throw new Error(`${errorMsg}`);
    }

    const json = await res.json();

    // Handle both array response and { data: [...] } response
    const data = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
        ? json.data
        : [];
    return data.map((c: RawVocabCard) => ({
      id: c.id ?? String(c._id ?? ""),
      term: c.wordVi ?? c.word_vi ?? c.term ?? "",
      reading: c.learningUnit?.titleJa ?? undefined,
      tag: c.tag ?? undefined,
      meaning: c.meaningJa ?? c.meaning_ja ?? "",
      example: c.exampleVi ?? c.example_vi ?? "",
      note: c.note ?? undefined,
    }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to load vocab cards:", errorMsg);
    throw error;
  }
}

export default function VocabScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const learningUnitId = searchParams.get("learningUnitId");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [cards, setCards] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const card =
    cards[index] ??
    ({ id: "", term: "", meaning: "", example: "" } as VocabCard);

  const isLastCard = cards.length > 0 && index >= cards.length - 1;

  const syncLocalVocabularyCompletion = () => {
    if (typeof window === "undefined") return;

    try {
      const lastSelectionRaw = localStorage.getItem(LAST_SELECTION_STORAGE_KEY);
      if (!lastSelectionRaw) return;

      const lastSelection = JSON.parse(lastSelectionRaw) as {
        sectionId: string;
        taskId: string;
        mode: "vocab" | "listen";
      };

      if (lastSelection.mode !== "vocab") return;

      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
      const progress = stored ? JSON.parse(stored) : {};

      if (!progress[lastSelection.sectionId]) {
        progress[lastSelection.sectionId] = {};
      }
      if (!progress[lastSelection.sectionId][lastSelection.taskId]) {
        progress[lastSelection.sectionId][lastSelection.taskId] = {};
      }

      if (progress[lastSelection.sectionId][lastSelection.taskId].vocab) {
        return;
      }

      progress[lastSelection.sectionId][lastSelection.taskId].vocab = true;
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      window.dispatchEvent(new Event(PROGRESS_EVENT));
    } catch (error) {
      console.error("Failed to store vocab completion", error);
    }
  };

  const persistViewedCardProgress = async () => {
    if (!learningUnitId || !card.id || typeof window === "undefined") {
      return;
    }

    const accessToken = localStorage.getItem("auth_token");
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(
        `${DEFAULT_BACKEND}/users/me/progress/vocabulary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            learningUnitId,
            vocabularyCardId: card.id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = (await response.json()) as VocabularyProgressResponse;
      if (result.completed) {
        syncLocalVocabularyCompletion();
      }
    } catch (error) {
      console.error("Failed to persist vocabulary progress", error);
    }
  };

  const goNext = async () => {
    await persistViewedCardProgress();

    if (isLastCard) {
      router.push("/");
      return;
    }

    setIndex((prev) => Math.min(prev + 1, cards.length - 1));
    setFlipped(false);
  };

  const goPrev = async () => {
    await persistViewedCardProgress();

    setIndex((prev) => Math.max(prev - 1, 0));
    setFlipped(false);
  };

  useEffect(() => {
    let mounted = true;

    const loadCards = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchVocabCards(learningUnitId ?? undefined);
        if (!mounted) return;
        setCards(result);
        setIndex(0);
        setFlipped(false);
      } catch (error) {
        if (!mounted) return;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("useEffect - Vocab fetch error:", errorMsg);
        setError(errorMsg || "Failed to load vocabulary cards");
        setCards([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadCards();

    return () => {
      mounted = false;
    };
  }, [learningUnitId]);

  const handleCardFlip = () => {
    if (!card?.id) return;

    setFlipped((prev) => !prev);
  };

  return (
    <div className="min-h-screen w-full bg-[#f6f7f3]">
      <div className="mx-auto flex w-full max-w-105 flex-col gap-6 px-4 pb-10 pt-8">
        <header className="flex items-center justify-between vv-rise-in">
          <Link
            href="/"
            onClick={async (event) => {
              event.preventDefault();
              await persistViewedCardProgress();
              router.push("/");
            }}
            className="flex items-center gap-2 text-sm font-semibold text-(--vv-accent-strong)"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 ring-1 ring-(--vv-ring)">
              <ArrowLeftIcon className="h-4 w-4" />
            </span>
            ホーム
          </Link>
        </header>

        <section className="rounded-3xl bg-white/70 p-4 shadow-[0_18px_30px_rgba(31,43,39,0.06)] ring-1 ring-(--vv-ring) vv-rise-in vv-delay-1">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-(--vv-muted)">
              スーパー / レジで支払う
            </p>
            <h1 className="text-xl font-semibold">語彙</h1>
            <p className="text-xs text-(--vv-muted)">
              慣用表現、スラング、慣用句、専門用語
            </p>
          </div>

          <div className="mt-4 border-b border-(--vv-border) text-xs font-semibold">
            <div className="flex items-center gap-6">
              <Link
                href="/vocab"
                aria-current="page"
                className="relative pb-2 text-(--vv-accent-strong)"
              >
                語彙
                <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-(--vv-accent-strong)" />
              </Link>
              <Link
                href="/listening"
                className="pb-2 text-(--vv-muted) transition hover:text-(--vv-accent-strong)"
              >
                聞き取り
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="mt-6 text-center text-sm text-(--vv-muted)">
              読み込み中...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
              <div className="mb-2 font-semibold text-red-700">エラー</div>
              <div className="mb-3 text-red-600">{error}</div>
              <div className="border-t border-red-200 pt-3 text-xs text-red-600">
                <p className="mb-2 font-semibold">デバッグ情報:</p>
                <p>
                  Backend URL:{" "}
                  <code className="font-mono">{DEFAULT_BACKEND}</code>
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
          ) : cards.length === 0 ? (
            <div className="mt-6 text-center text-sm text-(--vv-muted)">
              単語が見つかりません。
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold m-2 ">
                カード {loading ? "..." : index + 1} /{" "}
                {loading ? "..." : cards.length}
              </div>
              <div
                className=" vv-flip"
                data-flipped={flipped}
                onClick={handleCardFlip}
              >
                <div className="relative vv-flip-inner">
                  <div className="vv-flip-side w-full ">
                    <div className="w-full rounded-3xl border border-(--vv-border) bg-white px-6 py-10 text-center shadow-[0_12px_24px_rgba(31,43,39,0.08)]">
                      <span className="inline-flex items-center rounded-full bg-[#b24a3f] px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
                        {card.tag}
                      </span>

                      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                        {card.term}
                      </h2>

                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-(--vv-muted)">
                        {card.reading}
                      </p>

                      <p className="mt-3 text-xs text-(--vv-muted) italic">
                        “{card.example}”
                      </p>
                    </div>
                    <p className="mt-6 text-xs font-semibold text-(--vv-muted) text-center">
                      カードをタップして裏返す
                    </p>
                  </div>

                  <div className="absolute inset-0 h-full w-full vv-flip-side vv-flip-back ">
                    <div className="rounded-3xl border border-(--vv-border) bg-white px-6 py-8 text-left shadow-[0_12px_24px_rgba(31,43,39,0.08)]">
                      <p className="text-base font-semibold text-foreground">
                        {card.meaning}
                      </p>

                      <p className="mt-3 text-xs text-(--vv-muted)">
                        例：「{card.example}」
                      </p>

                      <div className="mt-4 rounded-2xl bg-[#f3f4f2] px-4 py-3 text-xs text-(--vv-muted)">
                        メモ: {card.note}
                      </div>
                    </div>
                    <p className="mt-6 text-xs font-semibold text-(--vv-muted) text-center">
                      カードをタップして表に戻す
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                void goPrev();
              }}
              disabled={index === 0}
              className="inline-flex items-center gap-2 rounded-full bg-[#eef0ec] px-4 py-2 text-xs font-semibold text-(--vv-muted) transition disabled:opacity-50"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              前へ
            </button>
            <button
              type="button"
              onClick={() => {
                void goNext();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#dfe5df] px-4 py-2 text-xs font-semibold text-(--vv-accent-strong) transition"
            >
              {isLastCard ? "完了" : "次へ"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
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

function ArrowRightIcon({ className }: { className?: string }) {
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
