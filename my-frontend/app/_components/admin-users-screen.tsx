"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "./admin-sidebar";
import { api } from "@/lib/api";

type BackendUser = {
  _id: string;
  user_name: string;
  email: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  progress: string;
  lessons: string;
  lastActive: string;
  initials: string;
  joinedAt: string;
};

type UserModal = "detail" | "password" | "delete" | null;

type ProgressItem = {
  id: string;
  title: string;
  vocabDone: number;
  vocabTotal: number;
  listenPercent: number;
};

const progressItems: ProgressItem[] = [
  {
    id: "super-register",
    title: "スーパー / レジで支払う",
    vocabDone: 25,
    vocabTotal: 30,
    listenPercent: 100,
  },
  {
    id: "super-find",
    title: "スーパー / 商品を探す",
    vocabDone: 12,
    vocabTotal: 20,
    listenPercent: 65,
  },
];

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function mapBackendUser(u: BackendUser): UserRow {
  return {
    id: u._id,
    name: u.user_name,
    email: u.email,
    progress: "—",
    lessons: "—",
    lastActive: "—",
    initials: getInitials(u.user_name),
    joinedAt: formatDate(u.created_at),
  };
}

export default function AdminUsersScreen() {
  const [query, setQuery] = useState("");
  const [progressQuery, setProgressQuery] = useState("");
  const [activeModal, setActiveModal] = useState<UserModal>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get<BackendUser[]>("/users");
      setUsers(data.map(mapBackendUser));
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.name, user.email].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query, users]);

  const filteredProgressItems = useMemo(() => {
    const normalized = progressQuery.trim().toLowerCase();
    if (!normalized) return progressItems;
    return progressItems.filter((item) =>
      item.title.toLowerCase().includes(normalized),
    );
  }, [progressQuery]);

  const openModal = (modal: UserModal, user: UserRow) => {
    setSelectedUser(user);
    setActiveModal(modal);
    if (modal === "password") {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    }
  };

  const showToastMessage = (message: string, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2400);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setIsDeleting(true);
      await api.delete(`/users/${selectedUser.id}`);
      setActiveModal(null);
      showToastMessage(`Đã xóa người dùng 「${selectedUser.name}」`);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      showToastMessage("Xóa người dùng thất bại", true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePassword = async () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp");
      return;
    }
    try {
      setIsSavingPassword(true);
      await api.patch(`/users/${selectedUser.id}/admin-password`, { newPassword });
      setActiveModal(null);
      showToastMessage(`Đã đổi mật khẩu cho 「${selectedUser.name}」`);
    } catch (err) {
      console.error("Failed to update password:", err);
      setPasswordError("Đổi mật khẩu thất bại");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-[#1f2b27]">
      <div className="relative min-h-screen w-full">
        <AdminSidebar active="users" />

        <main className="ml-64 min-h-screen w-[calc(100%-16rem)] bg-[#F2F4F2]">
          <div className="min-h-[120vh] bg-[#F2F4F2]">
            <div className="w-full border-b border-[#eef2ee] bg-white px-8 pb-6 pt-8">
              <div>
                <h1 className="text-xl font-semibold">Quản lý người dùng</h1>
                <p className="mt-1 text-xs text-[#9aa8a2]">{isLoading ? "Đang tải..." : `${users.length} người dùng`}</p>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-full border border-[#e6ece6] bg-[#f7f9f7] px-4 py-2 text-xs text-[#9aa8a2]">
                <SearchIcon className="h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  className="w-full bg-transparent text-xs text-[#1f2b27] placeholder:text-[#9aa8a2] focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-[#F2F4F2] px-8 pb-16 pt-6">
              <div className="overflow-hidden rounded-2xl border border-[#eef2ee] bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#f8faf7] text-[#7b8b83]">
                    <tr>
                      <th className="px-5 py-3">Người dùng</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Tiến độ</th>
                      <th className="px-4 py-3">Hoạt động gần nhất</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="text-[#1f2b27]">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#2f5d50] border-t-transparent" />
                          <p className="mt-2 text-xs text-[#9aa8a2]">Đang tải danh sách người dùng...</p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-[#9aa8a2]">
                          Không tìm thấy người dùng nào
                        </td>
                      </tr>
                    ) : null}
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-[#eef2ee]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2f5d50] text-[11px] font-semibold text-white">
                              {user.initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                {user.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#7b8b83]">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-[#7b8b83]">
                            <span>{user.progress}</span>
                            <span>{user.lessons}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#7b8b83]">
                          {user.lastActive}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-[#7b8b83]">
                            <button
                              type="button"
                              onClick={() => openModal("detail", user)}
                              className="hover:text-[#2f5d50]"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal("password", user)}
                              className="hover:text-[#2f5d50]"
                            >
                              <EditIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal("delete", user)}
                              className="text-[#d46b6b]"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {activeModal === "detail" && selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#eef2ee] pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <EyeIcon className="h-4 w-4" />
                Chi tiết người dùng
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

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2f5d50] text-sm font-semibold text-white">
                {selectedUser.initials}
              </div>
              <div>
                <p className="text-base font-semibold">{selectedUser.name}</p>
                <p className="text-xs text-[#7b8b83]">{selectedUser.email}</p>
                <p className="mt-1 text-[11px] text-[#9aa8a2]">
                  Tham gia: {selectedUser.joinedAt} • Hoạt động:{" "}
                  {selectedUser.lastActive}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#eef2ee] bg-[#f7f9f7] px-4 py-2 text-xs text-[#9aa8a2]">
              <div className="flex items-center gap-2">
                <SearchIcon className="h-4 w-4" />
                <input
                  value={progressQuery}
                  onChange={(event) => setProgressQuery(event.target.value)}
                  placeholder="Tìm kiếm địa điểm hoặc tình huống..."
                  className="w-full bg-transparent text-xs text-[#1f2b27] placeholder:text-[#9aa8a2] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold">Tiến độ theo tình huống</p>
              <div className="mt-3 space-y-4">
                {filteredProgressItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#eef2ee] bg-white p-4"
                  >
                    <p className="text-sm font-semibold">{item.title}</p>
                    <div className="mt-2 text-[11px] text-[#7b8b83]">
                      Từ vựng
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-[#e4ece7]">
                        <div
                          className="h-full rounded-full bg-[#2f5d50]"
                          style={{
                            width: `${Math.round(
                              (item.vocabDone / item.vocabTotal) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-[#7b8b83]">
                        {item.vocabDone}/{item.vocabTotal} từ
                      </span>
                    </div>
                    <div className="mt-3 text-[11px] text-[#7b8b83]">
                      Bài nghe
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-[#e4ece7]">
                        <div
                          className="h-full rounded-full bg-[#2f5d50]"
                          style={{ width: `${item.listenPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#7b8b83]">
                        {item.listenPercent}% hoàn thành
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-sm font-semibold text-[#2f5d50]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeModal === "password" && selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#eef2ee] pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <EditIcon className="h-4 w-4" />
                Đổi mật khẩu
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

            <div className="mt-5 rounded-2xl border border-[#eef2ee] bg-[#f7f9f7] px-4 py-3">
              <p className="text-sm font-semibold">{selectedUser.name}</p>
              <p className="text-xs text-[#7b8b83]">{selectedUser.email}</p>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#7b8b83]">
              <label className="flex flex-col gap-2">
                Mật khẩu mới
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                  placeholder="Tối thiểu 6 ký tự"
                  className="h-11 rounded-2xl border border-[#eef2ee] bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                Xác nhận mật khẩu
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                  placeholder="Nhập lại mật khẩu mới"
                  className="h-11 rounded-2xl border border-[#eef2ee] bg-[#f7f9f7] px-4 text-sm text-[#1f2b27] focus:outline-none"
                />
              </label>
              {passwordError ? (
                <p className="text-[11px] text-[#9F403D]">{passwordError}</p>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-sm font-semibold text-[#7b8b83]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={isSavingPassword}
                className="inline-flex items-center gap-2 rounded-full bg-[#2f5d50] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <SaveIcon className="h-4 w-4" />
                {isSavingPassword ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeModal === "delete" && selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#eef2ee] pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold ">
                <TrashIcon className="h-4 w-4 text-[#9F403D]" />
                Xóa người dùng
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
            <p className="mt-4 text-sm text-[#2D3432]">
              Bạn có chắc chắn muốn xóa người dùng 「{selectedUser.name}」?
            </p>
            <div className="mt-5 border-t border-[#eef2ee] pt-4">
              <div className="flex items-center justify-end gap-3">
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
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 rounded-full bg-[#9F403D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  {isDeleting ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showToast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${toastError ? "bg-[#f8d7d7] text-[#9F403D]" : "bg-[#d8eee2] text-[#2f5d50]"}`}>
            {toastError ? "✗" : "✓"}
          </div>
          <p className="text-sm text-[#1f2b27]">
            {toastMessage}
          </p>
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
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
