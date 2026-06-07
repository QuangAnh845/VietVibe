"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "./admin-sidebar";
import { useRouter } from "next/navigation";

type ModalType = "activities" | "vocab" | "listening" | "users" | null;

type SortValue = "popular" | "least-popular";

const activities = [
  {
    title: "Thêm tình huống mới",
    subtitle: "レストラン / 会計する",
    time: "2 giờ trước",
    date: "26/04/2026",
  },
  {
    title: "Cập nhật từ vựng",
    subtitle: "スーパー / レジで支払う - Thêm 5 từ mới",
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
    subtitle: "スーパー / 商品を探す - Thay đổi script",
    time: "2 ngày trước",
    date: "24/04/2026",
  },
  {
    title: "Thêm địa điểm mới",
    subtitle: "駅 (Ga tàu)",
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
    subtitle: "レストラン / 会計する",
    time: "6 ngày trước",
    date: "20/04/2026",
  },
];

const vocabTop = [
  { index: "1", title: "スーパー / レジで支払う", subtitle: "30 từ", meta: "28" },
  { index: "2", title: "スーパー / 商品を探す", subtitle: "28 từ", meta: "25" },
  { index: "3", title: "レストラン / 注文する", subtitle: "35 từ", meta: "22" },
  { index: "4", title: "駅 / 切符を買う", subtitle: "26 từ", meta: "20" },
  { index: "5", title: "レストラン / 会計する", subtitle: "22 từ", meta: "18" },
];

const listeningTop = [
  { index: "1", title: "スーパー / レジで支払う", meta: "30" },
  { index: "2", title: "スーパー / 商品を探す", meta: "26" },
  { index: "3", title: "レストラン / 注文する", meta: "24" },
  { index: "4", title: "駅 / 切符を買う", meta: "21" },
  { index: "5", title: "レストラン / 会計する", meta: "19" },
];

const users = [
  {
    name: "佐藤花子",
    email: "sato.hanako@example.jp",
    date: "20/04/2026",
  },
  {
    name: "田中太郎",
    email: "tanaka.taro@example.jp",
    date: "15/04/2026",
  },
  {
    name: "山田次郎",
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
    items: { index: string; title: string; subtitle?: string; meta: string }[],
    query: string,
  ) => {
    const normalized = normalizeText(query);
    if (!normalized) return items;
    return items.filter((item) =>
      item.title.toLowerCase().includes(normalized),
    );
  };
  const sortRows = (
    items: { index: string; title: string; subtitle?: string; meta: string }[],
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
            <header className="border-b border-[#eef2ee] bg-white/95 px-6 py-4">
              <h1 className=" text-2xl font-semibold">Dashboard</h1>
              <p className="mt-1 text-xs text-[#9aa8a2]">
                Tổng quan hệ thống VietVibe
              </p>
            </header>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  label="Người dùng"
                  value="300"
                  subtext=""
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
                  subtext="đã xuất bản"
                  icon={<HeadphonesIcon className="h-4 w-4" />}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#eef2ee] bg-white">
                <div className="flex items-center justify-between border-b border-[#eef2ee] p-4">
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
                <div className="space-y-3 px-4 py-3 text-sm">
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
                <div className="rounded-2xl border border-[#eef2ee] bg-white">
                  <div className="flex items-center justify-between border-b border-[#eef2ee] p-4">
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
                  <div className="space-y-3 px-4 py-3 text-sm">
                    {vocabTop.map((item) => (
                      <RankRow
                        key={item.index}
                        index={item.index}
                        title={item.title}
                        subtitle={item.subtitle}
                        meta={item.meta}
                        unitLabel="người học"
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#eef2ee] bg-white">
                  <div className="flex items-center justify-between border-b border-[#eef2ee] p-4">
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
                  <div className="space-y-3 px-4 py-3 text-sm">
                    {listeningTop.map((item) => (
                      <RankRow
                        key={item.index}
                        index={item.index}
                        title={item.title}
                        meta={item.meta}
                        unitLabel="người nghe"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#eef2ee] bg-white ">
                <div className="flex items-center justify-between border-b border-[#eef2ee] p-4 ">
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
                <div className="mt-3 space-y-3 px-2 text-sm">
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
  let bgColor = "bg-[#d8eee2]";
  if (label === "Người dùng") bgColor = "bg-[#d8eee2]";
  if (label === "Địa điểm") bgColor = "bg-[#DEE4E0]";
  if (label === "Bộ từ vựng") bgColor = "bg-[#d8eee2]";
  if (label === "Bài nghe") bgColor = "bg-[#DEE4E0]";
  return (
    <div className="rounded-xl border border-[#edf2ee] bg-[#FFFFFF] p-4">
      <div className="flex items-center gap-4 ">
         <div className={`p-3 flex h-10 w-10 items-center justify-center rounded-xl ${bgColor} text-[#2f5d50]`}>
          {icon}
        </div>  
        <div> <div className="text-[11px] font-semibold text-[#9aa8a2]">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="mt-1 text-[11px] text-center text-[#9aa8a2]">{subtext}</div>
       </div>
       
      </div>
      
      
      {label=="Bài nghe"?   <div className="mt-1 text-[11px] text-center text-[#9F403D]">1 tình huống chưa có bài nghe</div>:null}
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
        <p className="text-sm font-[500]">{title}</p>
        <p className="text-[11px] text-[#5A605E] opacity-90">{subtitle}</p>
      </div>
      <span className="text-[11px] text-[#9aa8a2]">{time}</span>
    </div>
  );
}

function RankRow({
  index,
  title,
  subtitle,
  meta,
  unitLabel,
}: {
  index: string;
  title: string;
  subtitle?: string;
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
          <p className="text-sm font-[500]">{title}</p>
          {subtitle ? (
            <p className="text-[11px] text-[#ADB3B0]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-[#1f2b27]">{meta}</p>
        <p className="text-[11px] text-[#9aa8a2]">{unitLabel}</p>
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
   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
  <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H6C4.93913 15 3.92172 15.4214 3.17157 16.1716C2.42143 16.9217 2 17.9391 2 19V21" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M20 10C20 14.993 14.461 20.193 12.601 21.799C12.4277 21.9293 12.2168 21.9998 12 21.9998C11.7832 21.9998 11.5723 21.9293 11.399 21.799C9.539 20.193 4 14.993 4 10C4 7.87827 4.84285 5.84344 6.34315 4.34315C7.84344 2.84285 9.87827 2 12 2C14.1217 2 16.1566 2.84285 17.6569 4.34315C19.1571 5.84344 20 7.87827 20 10Z" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M12 7V21" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M3 18C2.73478 18 2.48043 17.8946 2.29289 17.7071C2.10536 17.5196 2 17.2652 2 17V4C2 3.73478 2.10536 3.48043 2.29289 3.29289C2.48043 3.10536 2.73478 3 3 3H8C9.06087 3 10.0783 3.42143 10.8284 4.17157C11.5786 4.92172 12 5.93913 12 7C12 5.93913 12.4214 4.92172 13.1716 4.17157C13.9217 3.42143 14.9391 3 16 3H21C21.2652 3 21.5196 3.10536 21.7071 3.29289C21.8946 3.48043 22 3.73478 22 4V17C22 17.2652 21.8946 17.5196 21.7071 17.7071C21.5196 17.8946 21.2652 18 21 18H15C14.2044 18 13.4413 18.3161 12.8787 18.8787C12.3161 19.4413 12 20.2044 12 21C12 20.2044 11.6839 19.4413 11.1213 18.8787C10.5587 18.3161 9.79565 18 9 18H3Z" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
  );
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M11 4.702C10.9998 4.56271 10.9583 4.4266 10.8809 4.31085C10.8034 4.1951 10.6934 4.1049 10.5647 4.05162C10.436 3.99835 10.2944 3.98439 10.1577 4.01151C10.0211 4.03863 9.89559 4.10561 9.797 4.204L6.413 7.587C6.2824 7.71837 6.12703 7.82253 5.95589 7.89342C5.78475 7.96432 5.60124 8.00054 5.416 8H3C2.73478 8 2.48043 8.10535 2.29289 8.29289C2.10536 8.48043 2 8.73478 2 9V15C2 15.2652 2.10536 15.5196 2.29289 15.7071C2.48043 15.8946 2.73478 16 3 16H5.416C5.60124 15.9995 5.78475 16.0357 5.95589 16.1066C6.12703 16.1775 6.2824 16.2816 6.413 16.413L9.796 19.797C9.8946 19.8958 10.0203 19.9631 10.1572 19.9904C10.2941 20.0177 10.436 20.0037 10.5649 19.9503C10.6939 19.8968 10.804 19.8063 10.8815 19.6902C10.959 19.5741 11.0002 19.4376 11 19.298V4.702Z" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 9C16.6491 9.86548 17 10.9181 17 12C17 13.0819 16.6491 14.1345 16 15" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19.364 18.364C20.1998 17.5283 20.8627 16.5361 21.315 15.4442C21.7673 14.3522 22.0001 13.1819 22.0001 12C22.0001 10.8181 21.7673 9.64776 21.315 8.55582C20.8627 7.46389 20.1998 6.47173 19.364 5.636" stroke="#45655A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
