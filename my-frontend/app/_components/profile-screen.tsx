"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/lib/user.service";
import { useTokenStorage } from "@/hooks/useTokenStorage";

type ProfileModal = "avatar" | "name" | "email" | "password" | null;

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { getAccessToken } = useTokenStorage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profileName, setProfileName] = useState(user?.user_name || user?.name || "User");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState((user as any)?.avatar_url || "");
  const [activeModal, setActiveModal] = useState<ProfileModal>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.user_name || user.name || "User");
      setProfileEmail(user.email || "");
      setAvatarUrl((user as any).avatar_url || "");
    }
  }, [user]);

  const [avatarFileName, setAvatarFileName] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");

  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const closeModal = () => setActiveModal(null);

  const openAvatarModal = () => {
    setAvatarFileName("");
    setAvatarError("");
    setActiveModal("avatar");
  };

  const openNameModal = () => {
    setNameInput("");
    setNameError("");
    setActiveModal("name");
  };

  const openEmailModal = () => {
    setEmailInput("");
    setEmailError("");
    setActiveModal("email");
  };

  const openPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setActiveModal("password");
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleAvatarFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setAvatarFileName("");
      setAvatarError("");
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(selectedFile.type)) {
      setAvatarFileName("");
      setAvatarError("対応画像形式は PNG、JPG、GIF、SVG です。");
      return;
    }

    if (selectedFile.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarFileName(selectedFile.name);
      setAvatarError(
        "ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。",
      );
      return;
    }

    setAvatarFileName(selectedFile.name);
    setAvatarError("");
  };

  const handleAvatarUpload = async () => {
    if (!avatarFileName || avatarError || !fileInputRef.current?.files?.[0]) {
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No token");
      const file = fileInputRef.current.files[0];
      const updatedUser = await userService.uploadAvatar(token, file);
      updateUser(updatedUser);
      setToastMessage("アバターを更新しました。");
      closeModal();
    } catch (e: any) {
      setAvatarError(e.message || "Failed to upload avatar");
    }
  };

  const handleNameSave = async () => {
    const nextName = nameInput.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nextName)) {
      setNameError("ユーザー名は英数字とアンダースコアのみ使用できます。");
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No token");
      const updatedUser = await userService.updateProfile(token, { user_name: nextName });
      updateUser(updatedUser);
      setToastMessage("ユーザー名を更新しました。");
      closeModal();
    } catch (e: any) {
      setNameError(e.message || "Failed to update name");
    }
  };

  const handleEmailSave = async () => {
    const nextEmail = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setEmailError("メールアドレスの形式が正しくありません。");
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No token");
      const updatedUser = await userService.updateProfile(token, { email: nextEmail });
      updateUser(updatedUser);
      setToastMessage("メールアドレスを更新しました。");
      closeModal();
    } catch (e: any) {
      setEmailError(e.message || "Email may already be in use");
    }
  };

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("すべてのパスワード項目を入力してください。");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("パスワードは8文字以上である必要があります。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("確認パスワードが一致しません。");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(
        "新しいパスワードは現在のパスワードと異なる必要があります。",
      );
      return;
    }
    try {
      const token = getAccessToken();
      if (!token) throw new Error("No token");
      await userService.updatePassword(token, {
        currentPassword,
        newPassword,
      });
      setToastMessage("パスワードを更新しました。");
      closeModal();
    } catch (e: any) {
      setPasswordError(e.message || "Failed to update password");
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#f8f6f2] via-[#f3f7f3] to-[#ecf2ee]">
      {toastMessage ? (
        <div className="fixed top-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 rounded-2xl bg-white p-4 shadow-lg mx-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8eee2]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6 text-[#2f5d50]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-700">
              {toastMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="shrink-0 text-lg leading-none text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-105 flex-col gap-6 px-5 pb-10 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">プロフィール</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-(--vv-accent-strong) ring-1 ring-(--vv-ring)"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            ホーム
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 vv-rise-in">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}${avatarUrl}`}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover shadow-[0_12px_24px_rgba(35,70,60,0.28)] ring-2 ring-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-(--vv-accent) text-xl font-semibold text-white shadow-[0_12px_24px_rgba(35,70,60,0.28)]">
                {profileInitials || "VV"}
              </div>
            )}
            <button
              type="button"
              onClick={openAvatarModal}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-(--vv-accent-soft) text-(--vv-accent-strong) shadow-sm ring-1 ring-(--vv-ring)"
              aria-label="プロフィール写真を変更"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="text-base font-semibold">{profileName}</p>
          <p className="text-xs text-(--vv-muted)">{profileEmail}</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-(--vv-muted)">情報を更新</p>
          <div className="overflow-hidden rounded-3xl bg-white/90 shadow-[0_16px_28px_rgba(31,43,39,0.08)] ring-1 ring-(--vv-ring)">
            <div className="divide-y divide-(--vv-border)">
              <button
                type="button"
                onClick={openNameModal}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--vv-border) text-(--vv-accent-strong)">
                    <UserIcon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold">ユーザー名を更新</p>
                </div>
                <ChevronRight className="h-4 w-4 text-(--vv-muted)" />
              </button>
              <button
                type="button"
                onClick={openEmailModal}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--vv-border) text-(--vv-accent-strong)">
                    <MailIcon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold">メールアドレスを更新</p>
                </div>
                <ChevronRight className="h-4 w-4 text-(--vv-muted)" />
              </button>
              <button
                type="button"
                onClick={openPasswordModal}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--vv-border) text-(--vv-accent-strong)">
                    <LockIcon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold">パスワードを更新</p>
                </div>
                <ChevronRight className="h-4 w-4 text-(--vv-muted)" />
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 h-12 w-full rounded-2xl bg-[#9d3d3a] text-sm font-semibold text-white shadow-[0_14px_24px_rgba(135,48,46,0.25)]"
        >
          ログアウト
        </button>
      </div>

      {activeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-110 rounded-3xl bg-white p-6 shadow-[0_24px_38px_rgba(0,0,0,0.24)] ring-1 ring-(--vv-ring)">
            {activeModal === "avatar" ? (
              <div>
                <div className="relative">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">
                      プロフィール画像を更新
                    </h2>
                    <p className="mt-1 text-sm text-(--vv-muted)">
                      新しい画像を選択してください。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="absolute right-0 top-0 text-(--vv-muted)"
                    aria-label="閉じる"
                  >
                    <CloseIcon className="h-6 w-6" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-(--vv-border) px-4 py-8 text-center"
                >
                  <UploadIcon className="h-10 w-10 text-(--vv-accent)" />
                  <p className="text-lg font-medium">
                    ここをクリックしてファイルを選択
                  </p>
                  <p className="text-xs text-(--vv-muted)">
                    SVG, PNG, JPG または GIF
                  </p>
                  {avatarFileName ? (
                    <p className="mt-1 text-xs font-semibold text-(--vv-accent-strong)">
                      {avatarFileName}
                    </p>
                  ) : null}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />

                {avatarError ? (
                  <p className="mt-4 flex items-start gap-2 text-sm text-[#b24a3f]">
                    <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    {avatarError}
                  </p>
                ) : null}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-12 rounded-2xl border border-(--vv-border) bg-white text-lg font-semibold"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={!avatarFileName || Boolean(avatarError)}
                    className="h-12 rounded-2xl bg-(--vv-accent) text-lg font-semibold text-white disabled:opacity-35"
                  >
                    アップロード
                  </button>
                </div>
              </div>
            ) : null}

            {activeModal === "name" ? (
              <div>
                <h2 className="text-2xl font-semibold">ユーザー名を更新</h2>

                <label className="mt-8 block text-[20px] font-semibold text-foreground">
                  新しいユーザー名
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => {
                    setNameInput(event.target.value);
                    if (nameError) {
                      setNameError("");
                    }
                  }}
                  className="mt-3 h-14 w-full rounded-2xl bg-[#f5f6f4] px-4 text-xl text-foreground outline-none ring-1 ring-transparent focus:ring-(--vv-accent)"
                  placeholder="ユーザー名を入力..."
                />

                {nameError ? (
                  <p className="mt-3 flex items-start gap-2 text-sm text-[#b24a3f]">
                    <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    {nameError}
                  </p>
                ) : null}

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-12 rounded-2xl bg-[#e4ebe6] text-lg font-semibold"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleNameSave}
                    className="h-12 rounded-2xl bg-(--vv-accent) text-lg font-semibold text-white"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : null}

            {activeModal === "email" ? (
              <div>
                <h2 className="text-2xl font-semibold">メールアドレスを更新</h2>

                <label className="mt-8 block text-[20px] font-semibold text-foreground">
                  新しいメールアドレス
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => {
                    setEmailInput(event.target.value);
                    if (emailError) {
                      setEmailError("");
                    }
                  }}
                  className="mt-3 h-14 w-full rounded-2xl bg-[#f5f6f4] px-4 text-xl text-foreground outline-none ring-1 ring-transparent focus:ring-(--vv-accent)"
                  placeholder="メールアドレスを入力..."
                />

                {emailError ? (
                  <p className="mt-3 flex items-start gap-2 text-sm text-[#b24a3f]">
                    <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    {emailError}
                  </p>
                ) : null}

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-12 rounded-2xl bg-[#e4ebe6] text-lg font-semibold"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleEmailSave}
                    className="h-12 rounded-2xl bg-(--vv-accent) text-lg font-semibold text-white"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : null}

            {activeModal === "password" ? (
              <div>
                <h2 className="text-2xl font-semibold">パスワードを更新</h2>
                <p className="mt-2 text-lg text-(--vv-muted)">
                  現在のパスワードを入力して確認してください。
                </p>

                <div className="mt-7 space-y-4">
                  <PasswordField
                    label="現在のパスワード"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="*********"
                    visible={showCurrentPassword}
                    onToggleVisibility={() =>
                      setShowCurrentPassword((prev) => !prev)
                    }
                  />
                  <PasswordField
                    label="新しいパスワード"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="新しいパスワードを入力..."
                    visible={showNewPassword}
                    onToggleVisibility={() =>
                      setShowNewPassword((prev) => !prev)
                    }
                  />
                  <PasswordField
                    label="新しいパスワードを確認"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="新しいパスワードを再入力..."
                    visible={showConfirmPassword}
                    onToggleVisibility={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                  />
                </div>

                {passwordError ? (
                  <p className="mt-4 flex items-start gap-2 text-sm text-[#b24a3f]">
                    <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    {passwordError}
                  </p>
                ) : null}

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-12 rounded-2xl bg-[#e4ebe6] text-lg font-semibold"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordSave}
                    className="h-12 rounded-2xl bg-(--vv-accent) text-lg font-semibold text-white"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <label className="block">
      <span className="text-[20px] font-semibold text-foreground">{label}</span>
      <div className="relative mt-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-14 w-full rounded-2xl bg-[#f5f6f4] px-4 pr-12 text-xl text-foreground outline-none ring-1 ring-transparent focus:ring-(--vv-accent)"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-(--vv-muted)"
        >
          {visible ? (
            <EyeIcon className="h-6 w-6" />
          ) : (
            <EyeOffIcon className="h-6 w-6" />
          )}
        </button>
      </div>
    </label>
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
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h12" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
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
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
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
      <path d="M17.94 17.94A10.87 10.87 0 0 1 12 20C5 20 1 12 1 12a21.77 21.77 0 0 1 5.06-7.94" />
      <path d="M9.9 4.24A10.96 10.96 0 0 1 12 4c7 0 11 8 11 8a22.78 22.78 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
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
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="9" r="4" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
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
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
