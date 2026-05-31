"use client";

import { useRouter } from "next/navigation";

type AdminTab = "dashboard" | "content" | "listening" | "audio" | "users";

type AdminSidebarProps = {
  active: AdminTab;
};

export default function AdminSidebar({ active }: AdminSidebarProps) {
  const router = useRouter();

  const itemClass = (tab: AdminTab) =>
    `flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${
      active === tab
        ? "bg-[#d8eee2] font-semibold text-[#1f2b27]"
        : "text-[#7b8b83]"
    }`;

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col bg-white/95 p-5 ring-1 ring-[rgba(47,93,80,0.12)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2f5d50] text-sm font-semibold text-white">
          VV
        </div>
        <div>
          <p className="text-sm font-semibold">VietVibe</p>
          <p className="text-[11px] text-[#7b8b83]">Bảng quản trị</p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase text-[#9aa8a2]">
          Danh mục
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className={itemClass("dashboard")}
          >
            <SquareIcon className="h-4 w-4" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/content")}
            className={itemClass("content")}
          >
            <FolderIcon className="h-4 w-4" />
            Quản lý nội dung
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/listening")}
            className={itemClass("listening")}
          >
            <HeadphonesIcon className="h-4 w-4" />
            Bài nghe & Timestamp
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/audio")}
            className={itemClass("audio")}
          >
            <MicIcon className="h-4 w-4" />
            Kho tạp âm
          </button>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase text-[#9aa8a2]">
          Người dùng
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className={itemClass("users")}
          >
            <UsersIcon className="h-4 w-4" />
            Quản lý người dùng
          </button>
        </div>
      </div>

      <div className="mt-auto rounded-2xl  p-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2f5d50] text-xs font-semibold text-white">
            AD
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Admin</p>
            <p className="text-[11px] text-[#9aa8a2]">Quản trị viên</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("vietvibe_auth");
              }
              router.push("/login");
            }}
            className="text-xs font-semibold text-red-500"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}

function SquareIcon({ className }: { className?: string }) {
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
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
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
      <path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
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
      <path d="M4 14a4 4 0 0 1 4-4h1" />
      <path d="M4 18v2" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4" />
      <path d="M20 14a4 4 0 0 0-4-4h-1" />
      <path d="M20 18v2" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
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
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v4" />
    </svg>
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
