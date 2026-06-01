"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import AdminSidebar from "./admin-sidebar";

type AudioCategory = "Trong nhà" | "Ngoài trời" | "Phương tiện";

type AudioStatus = "published" | "draft" | "edited";

type AudioItem = {
  id: string;
  title: string;
  filename: string;
  audioUrl: string;
  duration: string;
  size: string;
  date: string;
  category: AudioCategory;
  status: AudioStatus;
};

type AudioModal = "add" | "edit" | "delete" | null;

type AudioDraftStore = {
  items: AudioItem[];
};

const AUDIO_DRAFT_STORAGE_KEY = "vietvibe:admin-audio-draft";

const seedAudioItems: AudioItem[] = [
  {
    id: "cafe",
    title: "Quán cafe",
    filename: "cafe.mp4",
    audioUrl: "/audios/cafe.mp4",
    duration: "2:30",
    size: "3.2 MB",
    date: "12/04/2026",
    category: "Trong nhà",
    status: "published",
  },
  {
    id: "street",
    title: "Đường phố",
    filename: "road.mp4",
    audioUrl: "/audios/road.mp4",
    duration: "3:08",
    size: "4.1 MB",
    date: "12/04/2026",
    category: "Ngoài trời",
    status: "published",
  },
  {
    id: "market",
    title: "Chợ / Siêu thị",
    filename: "market.mp4",
    audioUrl: "/audios/market.mp4",
    duration: "2:08",
    size: "2.8 MB",
    date: "11/04/2026",
    category: "Trong nhà",
    status: "published",
  },
  {
    id: "office",
    title: "Văn phòng",
    filename: "office.mp4",
    audioUrl: "/audios/office.mp4",
    duration: "2:45",
    size: "3.5 MB",
    date: "11/04/2026",
    category: "Trong nhà",
    status: "published",
  },
  {
    id: "bus",
    title: "Thanh toán nhà hàng",
    filename: "payment_restaurant.mp4",
    audioUrl: "/audios/payment_restaurant.mp4",
    duration: "1:58",
    size: "2.3 MB",
    date: "10/04/2026",
    category: "Phương tiện",
    status: "published",
  },
];

const filters = ["Tất cả", "Trong nhà", "Ngoài trời", "Phương tiện"] as const;

type FilterValue = (typeof filters)[number];

export default function AdminAudioScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("Tất cả");
  const [query, setQuery] = useState("");
  const [activeModal, setActiveModal] = useState<AudioModal>(null);
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [audioItems, setAudioItems] = useState<AudioItem[]>(seedAudioItems);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioForm, setAudioForm] = useState({
    title: "",
    category: "Trong nhà" as AudioCategory,
  });

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(AUDIO_DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AudioDraftStore;
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          setAudioItems(parsed.items);
        }
      }
    } catch (error) {
      console.error("Failed to load audio drafts", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    const draft: AudioDraftStore = { items: audioItems };
    window.localStorage.setItem(AUDIO_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [audioItems, isHydrated]);

  useEffect(() => {
    return () => {
      audioPlayerRef.current?.pause();
      audioPlayerRef.current = null;
    };
  }, []);

  const openModal = (modal: AudioModal, item?: AudioItem) => {
    setSelectedItem(item ?? null);
    setAudioError(null);
    setPendingFile(null);

    if (modal === "add") {
      setAudioForm({ title: "", category: "Trong nhà" });
    } else if (item) {
      setAudioForm({ title: item.title, category: item.category });
    }

    setActiveModal(modal);
  };

  const getResolvedAudioUrl = (audioUrl: string) => {
    if (!audioUrl) return "";
    if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
    return audioUrl.startsWith("/")
      ? `${API_BASE_URL}${audioUrl}`
      : `${API_BASE_URL}/${audioUrl}`;
  };

  const getAudioDurationLabel = async (audioUrl: string) => {
    return new Promise<string>((resolve) => {
      const player = new Audio(audioUrl);
      player.preload = "metadata";
      player.onloadedmetadata = () => {
        const seconds = Number.isFinite(player.duration)
          ? Math.max(0, Math.round(player.duration))
          : 0;
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        resolve(`${minutes}:${String(remainder).padStart(2, "0")}`);
      };
      player.onerror = () => resolve("--:--");
      player.src = audioUrl;
    });
  };

  const loadAudio = async (item: AudioItem) => {
    const resolvedUrl = getResolvedAudioUrl(item.audioUrl);
    if (!resolvedUrl) {
      setAudioError("Tạp âm này chưa có file để phát.");
      return;
    }

    setAudioError(null);

    if (playingItemId === item.id && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingItemId(null);
      return;
    }

    audioPlayerRef.current?.pause();
    const player = new Audio(resolvedUrl);
    player.preload = "auto";
    player.onended = () => setPlayingItemId(null);
    player.onerror = () => {
      setPlayingItemId(null);
      setAudioError("Không phát được file audio này.");
    };

    audioPlayerRef.current = player;

    try {
      await player.play();
      setPlayingItemId(item.id);
    } catch (error) {
      console.error("Failed to play audio", error);
      setPlayingItemId(null);
      setAudioError("Trình duyệt đã chặn phát audio hoặc file bị lỗi.");
    }
  };

  const handleAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPendingFile(file);
    setAudioError(null);
  };

  const openFilePicker = () => {
    setAudioError(null);
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "--";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(mb >= 10 ? 1 : 1)} MB`;
  };

  const handleSaveDraft = async () => {
    const title = audioForm.title.trim();
    if (!title) {
      setAudioError("Vui lòng nhập tên tạp âm.");
      return;
    }

    if (activeModal === "add" && !pendingFile) {
      setAudioError("Vui lòng chọn file âm thanh trước khi lưu.");
      return;
    }

    setIsUploading(true);
    setAudioError(null);

    try {
      let nextAudioUrl = selectedItem?.audioUrl ?? "";
      let nextFilename = selectedItem?.filename ?? "";
      let nextDuration = selectedItem?.duration ?? "--:--";
      let nextSize = selectedItem?.size ?? "--";

      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);

        const uploadResult = await apiFetch<{ audioUrl: string }>(
          "/listening/admin/upload-audio",
          {
            method: "POST",
            body: formData,
          },
        );

        nextAudioUrl = uploadResult.audioUrl;
        nextFilename = pendingFile.name;
        nextDuration = await getAudioDurationLabel(
          getResolvedAudioUrl(nextAudioUrl),
        );
        nextSize = formatFileSize(pendingFile.size);
      }

      const nextItem: AudioItem = {
        id:
          selectedItem?.id ||
          `audio-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`,
        title,
        filename: nextFilename,
        audioUrl: nextAudioUrl,
        duration: nextDuration,
        size: nextSize,
        date: selectedItem?.date || new Date().toLocaleDateString("vi-VN"),
        category: audioForm.category,
        status: activeModal === "add" ? "draft" : "edited",
      };

      setAudioItems((current) => {
        if (activeModal === "edit" && selectedItem) {
          return current.map((item) =>
            item.id === selectedItem.id ? nextItem : item,
          );
        }

        return [nextItem, ...current];
      });

      setActiveModal(null);
      setSelectedItem(null);
      setPendingFile(null);
      setToastMessage(
        activeModal === "add"
          ? "Đã lưu nháp tạp âm mới."
          : "Đã lưu nháp thay đổi tạp âm.",
      );
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 2400);
    } catch (error) {
      console.error("Failed to save audio draft", error);
      setAudioError(
        error instanceof Error ? error.message : "Không thể lưu nháp tạp âm.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const itemsByFilter =
      activeFilter === "Tất cả"
        ? audioItems
        : audioItems.filter((item) => item.category === activeFilter);
    if (!normalized) return itemsByFilter;
    return itemsByFilter.filter((item) =>
      [item.title, item.filename].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [activeFilter, query]);

  const handleDelete = () => {
    if (!selectedItem) return;

    setAudioItems((current) =>
      current.filter((item) => item.id !== selectedItem.id),
    );
    setActiveModal(null);
    setSelectedItem(null);
    setShowToast(true);
    setToastMessage(`Đã xóa nháp tạp âm \"${selectedItem.title}\".`);
    window.setTimeout(() => setShowToast(false), 2400);
  };

  return (
    <div className="min-h-screen w-full text-[#1f2b27]">
      <div className="relative min-h-screen w-full">
        <AdminSidebar active="audio" />

        <main className="ml-56 min-h-screen w-[calc(100%-14rem)] bg-[#F2F4F2]">
          <div className="min-h-[120vh] bg-[#F2F4F2] pl-8 pb-16 ">
            <header className="p-8 border-b border-white/90 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold">Kho tạp âm</h1>
                  <p className="my-2 text-xs text-[#9aa8a2]">
                    {audioItems.length} file âm thanh môi trường
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal("add")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-3 text-xs font-semibold text-white"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Thêm tạp âm
                </button>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-[14px] border border-[#e6ece6] bg-(--vv-search) px-4 py-2 text-xs text-[#9aa8a2]">
                  <SearchIcon className="h-4 w-4" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm kiếm theo tên hoặc file..."
                    className="w-full bg-transparent text-xs text-[#1f2b27] placeholder:text-[#9aa8a2] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-full px-3 py-2 font-semibold transition ${
                        activeFilter === filter
                          ? "bg-[#2f5d50] text-white"
                          : "bg-[#f2f5f2] text-[#7b8b83]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            <div className=" grid grid-cols-3 gap-5 pt-6 px-8">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#eef2ee] bg-white p-4 shadow-[0_10px_20px_rgba(31,43,39,0.06)]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-[11px] text-[#9aa8a2]">
                        {item.filename}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton
                        ariaLabel="Edit"
                        onClick={() => openModal("edit", item)}
                      >
                        <EditIcon className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        ariaLabel="Delete"
                        onClick={() => openModal("delete", item)}
                      >
                        <TrashIcon className="h-4 w-4 text-[#d46b6b]" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#f6f8f6] p-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void loadAudio(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f5d50] text-white"
                        aria-label={`Phát ${item.title}`}
                      >
                        <PlayIcon
                          className={`h-3.5 w-3.5 ${playingItemId === item.id ? "opacity-60" : ""}`}
                        />
                      </button>
                      <div className="flex-1">
                        <div className="h-1.5 w-full rounded-full bg-[#dce4de]">
                          <div className="h-full w-[55%] rounded-full bg-[#2f5d50]" />
                        </div>
                      </div>
                      <span className="text-[11px] text-[#7b8b83]">
                        {item.duration}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className={getStatusClass(item.status)}>
                      {getStatusLabel(item.status)}
                    </span>
                    <span className={getCategoryClass(item.category)}>
                      {item.category}
                    </span>
                    <div className="text-right text-[11px] text-[#9aa8a2]">
                      <p className="text-black">{item.size}</p>
                      <p>{item.date}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 ? (
                <div className="col-span-3 rounded-2xl border border-dashed border-[#d7dfd9] bg-white px-6 py-12 text-center text-sm text-[#7b8b83]">
                  Không có tạp âm nào khớp bộ lọc hiện tại.
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      {activeModal === "add" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <VolumeIcon className="h-4 w-4 text-[#2f5d50]" />
                Thêm tạp âm
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 pb-6 pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,audio/mpeg,audio/mp4,audio/wav"
                className="hidden"
                onChange={handleAudioFileChange}
              />
              <div className="space-y-4 text-xs text-[#7b8b83]">
                <label className="flex flex-col gap-2">
                  Tên tạp âm
                  <input
                    type="text"
                    value={audioForm.title}
                    onChange={(event) =>
                      setAudioForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="VD: Quán cafe, Đường phố..."
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  Phân loại
                  <select
                    value={audioForm.category}
                    onChange={(event) =>
                      setAudioForm((current) => ({
                        ...current,
                        category: event.target.value as AudioCategory,
                      }))
                    }
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                  >
                    {filters
                      .filter(
                        (filter): filter is AudioCategory =>
                          filter !== "Tất cả",
                      )
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#1f2b27]">
                    File âm thanh
                  </p>
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7dfd9] bg-[#f7f9f7] px-6 py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ee] text-[#7b8b83]">
                      <UploadIcon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs text-[#7b8b83]">
                      Kéo thả vào đây hoặc{" "}
                      <button
                        type="button"
                        onClick={openFilePicker}
                        className="font-semibold text-[#2f5d50]"
                      >
                        chọn file
                      </button>
                    </p>
                    <p className="mt-2 text-[11px] text-[#9aa8a2]">
                      MP3, WAV, M4A · Tối đa 50MB
                    </p>
                    {pendingFile ? (
                      <p className="mt-3 text-[11px] font-semibold text-[#1f2b27]">
                        Đã chọn: {pendingFile.name}
                      </p>
                    ) : null}
                  </div>
                </div>
                {audioError ? (
                  <p className="text-[11px] font-semibold text-[#c65d5d]">
                    {audioError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                <SaveIcon className="h-4 w-4" />
                {isUploading ? "Đang lưu..." : "Lưu nháp"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeModal === "edit" && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <EditIcon className="h-4 w-4 text-[#2f5d50]" />
                Chỉnh sửa tạp âm
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 pb-6 pt-4">
              <div className="space-y-4 text-xs text-[#7b8b83]">
                <label className="flex flex-col gap-2">
                  Tên tạp âm
                  <input
                    type="text"
                    value={audioForm.title}
                    onChange={(event) =>
                      setAudioForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  Phân loại
                  <input
                    type="text"
                    value={audioForm.category}
                    onChange={(event) =>
                      setAudioForm((current) => ({
                        ...current,
                        category: event.target.value as AudioCategory,
                      }))
                    }
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] ring-1 ring-[#eef2ee] focus:outline-none"
                  />
                </label>
                <div className="rounded-2xl border border-[#eef2ee] bg-[#f7f9f7] px-4 py-3 text-[11px] text-[#7b8b83]">
                  <p>
                    File hiện tại:{" "}
                    <span className="font-semibold text-[#1f2b27]">
                      {selectedItem.filename}
                    </span>
                  </p>
                  <p className="mt-1">Thời lượng: {selectedItem.duration}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white"
              >
                <SaveIcon className="h-4 w-4" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeModal === "delete" && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#f0f2f0] px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#9f3d3a]">
                <TrashIcon className="h-4 w-4" />
                Xóa tạp âm
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#9aa8a2]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-6 pb-6 pt-4">
              <p className="text-sm text-[#7b8b83]">
                Bạn có chắc chắn muốn xóa &quot;{selectedItem.title}&quot;?
              </p>
            </div>
            <div className="flex items-center justify-end gap-4 border-t border-[#f0f2f0] px-6 py-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-full bg-[#9f3d3a] px-4 py-2 text-xs font-semibold text-white"
              >
                <TrashIcon className="h-4 w-4" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showToast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d8eee2] text-[#2f5d50]">
            ✓
          </div>
          <p className="text-sm text-[#1f2b27]">{toastMessage}</p>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-[#9aa8a2]"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getCategoryClass(category: AudioCategory) {
  switch (category) {
    case "Trong nhà":
      return "rounded-full bg-[#d8eee2] px-3 py-1 text-[11px] font-semibold text-[#2f5d50]";
    case "Ngoài trời":
      return "rounded-full bg-[#eaf2fb] px-3 py-1 text-[11px] font-semibold text-[#4c6fa3]";
    case "Phương tiện":
      return "rounded-full bg-[#fff2d9] px-3 py-1 text-[11px] font-semibold text-[#c47b1f]";
    default:
      return "rounded-full bg-[#eef2ee] px-3 py-1 text-[11px] font-semibold text-[#7b8b83]";
  }
}

function getStatusClass(status: AudioStatus) {
  switch (status) {
    case "published":
      return "rounded-full bg-[#d8eee2] px-3 py-1 text-[11px] font-semibold text-[#2f5d50]";
    case "edited":
      return "rounded-full bg-[#fff2d9] px-3 py-1 text-[11px] font-semibold text-[#c47b1f]";
    case "draft":
    default:
      return "rounded-full bg-[#f2e3de] px-3 py-1 text-[11px] font-semibold text-[#b35f4d]";
  }
}

function getStatusLabel(status: AudioStatus) {
  switch (status) {
    case "published":
      return "Đã xuất bản";
    case "edited":
      return "Đã sửa đổi";
    case "draft":
    default:
      return "Nháp";
  }
}

function IconButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#eef2ee] text-[#9aa8a2]"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
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
