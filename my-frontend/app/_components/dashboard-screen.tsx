"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "./admin-sidebar";
import { useRouter } from "next/navigation";

type ModalType = "activities" | "vocab" | "listening" | "users" | null;

type SortValue = "popular" | "least-popular";

const activities = [
  {
    title: "Thêm tình huống mới",
    subtitle: "Nhà hàng / bán cơm",
    time: "2 giờ trước",
    date: "26/04/2026",
  },
  {
    title: "Cập nhật từ vựng",
    subtitle: "Siêu thị / lễ chi trả - Thêm 5 từ mới",
    time: "3 giờ trước",
    date: "26/04/2026",
  },
  {
    title: "Xóa file âm thanh",
    subtitle: "Quán cafe.mp3",
    time: "1 ngày trước",
    date: "25/04/2026",
  },
  {
    title: "Cập nhật bài nghe",
    subtitle: "Siêu thị / hòa tiếng - Thay đổi script",
    time: "2 ngày trước",
    date: "24/04/2026",
  },
  {
    title: "Thêm địa điểm mới",
    subtitle: "Ga tàu",
    time: "3 ngày trước",
    date: "23/04/2026",
  },
  {
    title: "Xóa người dùng",
    subtitle: "Lê Văn A",
    time: "5 ngày trước",
    date: "21/04/2026",
  },
  {
    title: "Thêm từ vựng",
    subtitle: "Nhà hàng / tính tiền",
    time: "6 ngày trước",
    date: "20/04/2026",
  },
];

const vocabTop = [
  { index: "1", title: "Siêu thị / lễ chi trả", meta: "30" },
  { index: "2", title: "Siêu thị / tìm đồ", meta: "28" },
  { index: "3", title: "Nhà hàng / đặt món", meta: "22" },
  { index: "4", title: "Bến xe / mua vé", meta: "20" },
  { index: "5", title: "Nhà hàng / tính tiền", meta: "18" },
];

const listeningTop = [
  { index: "1", title: "Siêu thị / lễ chi trả", meta: "30" },
  { index: "2", title: "Siêu thị / tìm đồ", meta: "26" },
  { index: "3", title: "Nhà hàng / đặt món", meta: "24" },
  { index: "4", title: "Bến xe / mua vé", meta: "21" },
  { index: "5", title: "Nhà hàng / tính tiền", meta: "19" },
];

const users = [
  {
    name: "Sato Hanako",
    email: "sato.hanako@example.jp",
    date: "20/04/2026",
  },
  {
    name: "Tanaka Taro",
    email: "tanaka.taro@example.jp",
    date: "15/04/2026",
  },
  {
    name: "Yamada Jiro",
    email: "yamada.jiro@example.jp",
    date: "10/04/2026",
  },
  {
    name: "Takahashi Misaki",
    email: "takahashi.misaki@example.jp",
    date: "08/04/2026",
  },
  {
    name: "Ito Kenta",
    email: "ito.kenta@example.jp",
    date: "05/04/2026",
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [vocabQuery, setVocabQuery] = useState("");
  const [listeningQuery, setListeningQuery] = useState("");
  const [vocabSort, setVocabSort] = useState<SortValue>("popular");
  const [listeningSort, setListeningSort] = useState<SortValue>("popular");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMode, setNotificationMode] = useState<
    "login" | "register"
  >("login");

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const filterRows = (
    items: { title: string; meta: string }[],
    query: string,
  ) => {
    const normalized = normalizeText(query);
    if (!normalized) return items;
    return items.filter((item) =>
      item.title.toLowerCase().includes(normalized),
    );
  };
  const sortRows = (
    items: { title: string; meta: string }[],
    sortValue: SortValue,
  ) => {
    const sorted = [...items].sort((a, b) => {
      const aValue = Number(a.meta);
      const bValue = Number(b.meta);
      return sortValue === "popular" ? bValue - aValue : aValue - bValue;
    });
    return sorted;
  };

  const vocabRows = sortRows(filterRows(vocabTop, vocabQuery), vocabSort);
  const listeningRows = sortRows(
    filterRows(listeningTop, listeningQuery),
    listeningSort,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("vietvibe_auth");
    const hasSuccess = localStorage.getItem("showLoginSuccess");
    const mode =
      (localStorage.getItem("loginSuccessMode") as "login" | "register") ||
      "login";

    let loggedInAt = "";
    if (authData) {
      try {
        const parsed = JSON.parse(authData) as { loggedInAt?: string };
        loggedInAt = parsed.loggedInAt || "";
      } catch {
        loggedInAt = "";
      }
    }

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

  return (
    <div className="min-h-screen w-full text-[#1f2b27]">
      {showNotification ? (
        <div className="fixed top-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 rounded-2xl bg-white p-4 shadow-lg mx-4 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-700">
              {notificationMode === "login"
                ? "ログインが完了しました！"
                : "登録が完了しました！"}
            </p>
            <p className="text-xs text-green-600">VietVibeへようこそ</p>
          </div>
          <button
            type="button"
            onClick={() => setShowNotification(false)}
            className="shrink-0 text-lg leading-none text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ) : null}
      <div className="relative min-h-screen w-full">
        <AdminSidebar active="dashboard" />

        <main className="ml-56 min-h-screen w-[calc(100%-14rem)] bg-[#f4f6f2]">
          <div className="min-h-[140vh] bg-white/90 pl-8 pb-16">
            <header className="border-b border-[#eef2ee] bg-white/95 p-6 pb-4">
              <p className="text-xs font-semibold text-[#9aa8a2]">Dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold">Dashboard</h1>
              <p className="mt-1 text-xs text-[#9aa8a2]">
                Tổng quan hệ thống VietVibe
              </p>
            </header>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  label="Người dùng"
                  value="300"
                  subtext="10 người mới"
                  icon={<UsersIcon className="h-4 w-4" />}
                />
                <StatCard
                  label="Địa điểm"
                  value="2"
                  subtext="4 tình huống"
                  icon={<PinIcon className="h-4 w-4" />}
                />
                <StatCard
                  label="Bộ từ vựng"
                  value="115"
                  subtext="đã xuất bản"
                  icon={<BookIcon className="h-4 w-4" />}
                />
                <StatCard
                  label="Bài nghe"
                  value="4"
                  subtext="1 tình huống chưa có bài nghe"
                  icon={<HeadphonesIcon className="h-4 w-4" />}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#eef2ee] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Hoạt động trong tháng này
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveModal("activities")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7b8b83]"
                  >
                    Xem tất cả
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  {activities.slice(0, 5).map((item) => (
                    <ActivityRow
                      key={`${item.title}-${item.time}`}
                      title={item.title}
                      subtitle={item.subtitle}
                      time={item.time}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#eef2ee] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Top 5 bộ từ vựng phổ biến
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModal("vocab")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#7b8b83]"
                    >
                      Chi tiết
                      <ChevronRightIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    {vocabTop.map((item) => (
                      <RankRow
                        key={item.index}
                        index={item.index}
                        title={item.title}
                        meta={item.meta}
                        unitLabel="người học"
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#eef2ee] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Top 5 bài nghe phổ biến
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModal("listening")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#7b8b83]"
                    >
                      Chi tiết
                      <ChevronRightIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    {listeningTop.map((item) => (
                      <RankRow
                        key={item.index}
                        index={item.index}
                        title={item.title}
                        meta={item.meta}
                        unitLabel="lượt nghe"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#eef2ee] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Người dùng mới trong tháng này
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveModal("users")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7b8b83]"
                  >
                    Xem tất cả
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  {users.slice(0, 3).map((user) => (
                    <UserRow
                      key={user.email}
                      name={user.name}
                      email={user.email}
                      date={user.date}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {activeModal ? (
        <Modal onClose={() => setActiveModal(null)}>
          {activeModal === "activities" ? (
            <ModalSection title="Tất cả hoạt động trong tháng này">
              {activities.map((item) => (
                <div
                  key={`${item.title}-${item.date}`}
                  className="flex items-start justify-between border-b border-[#f1f3f1] py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-[11px] text-[#9aa8a2]">
                      {item.subtitle}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-[#9aa8a2]">
                    <p>{item.time}</p>
                    <p>{item.date}</p>
                  </div>
                </div>
              ))}
            </ModalSection>
          ) : null}

          {activeModal === "vocab" ? (
            <ModalSection title="Từ vựng phổ biến">
              <ModalSearchBar
                placeholder="Tìm kiếm địa điểm hoặc tình huống..."
                value={vocabQuery}
                onChange={setVocabQuery}
              />
              <ModalSortRow value={vocabSort} onChange={setVocabSort} />
              <div className="mt-4 space-y-3">
                {vocabRows.map((item) => (
                  <ModalRankRow
                    key={`vocab-${item.index}`}
                    index={item.index}
                    title={item.title}
                    meta={item.meta}
                    unitLabel="người học"
                  />
                ))}
              </div>
            </ModalSection>
          ) : null}

          {activeModal === "listening" ? (
            <ModalSection title="Bài nghe phổ biến">
              <ModalSearchBar
                placeholder="Tìm kiếm địa điểm hoặc tình huống..."
                value={listeningQuery}
                onChange={setListeningQuery}
              />
              <ModalSortRow value={listeningSort} onChange={setListeningSort} />
              <div className="mt-4 space-y-3">
                {listeningRows.map((item) => (
                  <ModalRankRow
                    key={`listening-${item.index}`}
                    index={item.index}
                    title={item.title}
                    meta={item.meta}
                    unitLabel="người nghe"
                  />
                ))}
              </div>
            </ModalSection>
          ) : null}

          {activeModal === "users" ? (
            <ModalSection title="Tất cả người dùng mới trong tháng này">
              <div className="space-y-3">
                {users.map((user) => (
                  <ModalUserRow
                    key={`modal-${user.email}`}
                    name={user.name}
                    email={user.email}
                    date={user.date}
                  />
                ))}
              </div>
            </ModalSection>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-full px-4 py-2 text-xs font-semibold text-[#2f5d50]"
            >
              Đóng
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#edf2ee] bg-[#f7faf7] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-[#9aa8a2]">{label}</div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d8eee2] text-[#2f5d50]">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[11px] text-[#9aa8a2]">{subtext}</div>
    </div>
  );
}

function ActivityRow({
  title,
  subtitle,
  time,
}: {
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-transparent px-2 py-2 transition hover:border-[#edf2ee] hover:bg-[#f7faf7]">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-[#9aa8a2]">{subtitle}</p>
      </div>
      <span className="text-[11px] text-[#9aa8a2]">{time}</span>
    </div>
  );
}

function RankRow({
  index,
  title,
  meta,
  unitLabel,
}: {
  index: string;
  title: string;
  meta: string;
  unitLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d8eee2] text-[11px] font-semibold text-[#2f5d50]">
          {index}
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-[#9aa8a2]">
            {meta} {unitLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function UserRow({
  name,
  email,
  date,
}: {
  name: string;
  email: string;
  date: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-transparent px-2 py-2 transition hover:border-[#edf2ee] hover:bg-[#f7faf7]">
      <div className="flex items-center gap-3">
        <Avatar name={name} />
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-[#9aa8a2]">{email}</p>
        </div>
      </div>
      <span className="text-[11px] text-[#9aa8a2]">{date}</span>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
      <div className="w-full max-w-180 rounded-2xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-lg text-[#9aa8a2]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="-mt-4 max-h-[70vh] overflow-y-auto pr-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ModalSearchBar({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-full bg-[#f6f7f5] px-4 py-2 text-xs text-[#9aa8a2]">
      <SearchIcon className="h-4 w-4" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-xs text-[#1f2b27] placeholder:text-[#9aa8a2] focus:outline-none"
      />
    </div>
  );
}

function ModalSortRow({
  value,
  onChange,
}: {
  value: SortValue;
  onChange: (value: SortValue) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 text-xs text-[#7b8b83]">
      <span>Sắp xếp:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortValue)}
        className="rounded-full border border-[#dfe5df] bg-white px-3 py-1 text-xs text-[#1f2b27] focus:outline-none"
      >
        <option value="popular">Phổ biến nhất</option>
        <option value="least-popular">Ít phổ biến nhất</option>
      </select>
    </div>
  );
}

function ModalRankRow({
  index,
  title,
  meta,
  unitLabel,
}: {
  index: string;
  title: string;
  meta: string;
  unitLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#f8f8f6] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d8eee2] text-xs font-semibold text-[#2f5d50]">
          {index}
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-[#9aa8a2]">{meta}</p>
        </div>
      </div>
      <span className="text-[11px] text-[#9aa8a2]">{unitLabel}</span>
    </div>
  );
}

function ModalUserRow({
  name,
  email,
  date,
}: {
  name: string;
  email: string;
  date: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#f8f8f6] px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} large />
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-[#9aa8a2]">{email}</p>
        </div>
      </div>
      <span className="text-[11px] text-[#9aa8a2]">{date}</span>
    </div>
  );
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[#2f5d50] text-white ${
        large ? "h-11 w-11 text-xs" : "h-8 w-8 text-[10px]"
      }`}
    >
      {initials}
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
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
      <path d="M17 20c0-3-3-5-5-5s-5 2-5 5" />
      <circle cx="12" cy="7" r="3" />
      <path d="M21 20c0-2-1.5-3.5-3-4" />
      <path d="M6 16c-1.5.5-3 2-3 4" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
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
      <path d="M12 22s7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
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
      <path d="M4 6h10a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3z" />
      <path d="M7 3h13v18" />
    </svg>
  );
}

function HeadphonesIcon({ className }: { className?: string }) {
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
      <path d="M4 14v4a2 2 0 0 0 2 2h2v-6H6a2 2 0 0 0-2 2" />
      <path d="M20 14v4a2 2 0 0 1-2 2h-2v-6h2a2 2 0 0 1 2 2" />
      <path d="M4 14a8 8 0 0 1 16 0" />
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
