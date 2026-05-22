"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "login" | "register";

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordState, setForgotPasswordState] = useState<
    "form" | "sent"
  >("form");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!email || !password || (mode === "register" && !name)) {
      setIsError(true);
      setMessage("すべての必須フィールドに入力してください。");
      return;
    }

    if (!validateEmail(email)) {
      setIsError(true);
      setMessage("メールアドレスの形式が正しくありません。");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("パスワードは8文字以上である必要があります。");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setIsError(true);
      setMessage("パスワードが一致しません。");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      
      localStorage.setItem("showLoginSuccess", "true");
      localStorage.setItem("loginSuccessMode", mode);
      
      // Navigate to dashboard or home depending on user role
      // Since `useAuth` saves token and user, we could read it from local storage or wait for next render.
      // But simple approach is read from localStorage here or just redirect to home and let protected routes handle it.
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const role = String(user?.role || "").toLowerCase();
      
      router.push(role === "admin" ? "/dashboard" : "/");
    } catch (error: any) {
      console.error(error);
      setIsError(true);
      setMessage(error.message || "エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotPasswordOpen(true);
    setForgotPasswordState("form");
    setForgotPasswordEmail(email);
    setForgotPasswordMessage("");
    setForgotPasswordError(false);
  };

  const closeForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordState("form");
    setForgotPasswordMessage("");
    setForgotPasswordError(false);
  };

  const handleForgotPasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForgotPasswordMessage("");
    setForgotPasswordError(false);

    if (!validateEmail(forgotPasswordEmail)) {
      setForgotPasswordError(true);
      setForgotPasswordMessage("メールアドレスの形式が正しくありません。");
      return;
    }

    setForgotPasswordState("sent");
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#f8f6f2] via-[#f3f7f3] to-[#ecf2ee]">
      {forgotPasswordOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-105 rounded-[20px] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(34,54,48,0.24)] sm:px-8 sm:py-8">
            {forgotPasswordState === "form" ? (
              <form
                onSubmit={handleForgotPasswordSubmit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2.5">
                  <h2 className="text-[clamp(1rem,1.8vw,1.25rem)] font-semibold tracking-tight text-[#303b38]">
                    パスワードをリセット
                  </h2>
                  <p className="text-[13px] leading-5 text-[#6f7772] sm:text-sm">
                    登録済みのメールアドレスを入力してください。
                    <br />
                    パスワードリセットのリンクを送信します。
                  </p>
                </div>

                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#4c5a56]">
                  メールアドレス
                  <input
                    value={forgotPasswordEmail}
                    onChange={(event) =>
                      setForgotPasswordEmail(event.target.value)
                    }
                    type="text"
                    placeholder="メールアドレスを入力..."
                    className="h-12 rounded-2xl border border-transparent bg-[#f7f8f6] px-4 text-sm text-foreground shadow-[inset_0_0_0_1px_rgba(225,230,226,0.85)] outline-none focus:shadow-[inset_0_0_0_1px_rgba(78,113,97,0.9)]"
                  />
                </label>

                {forgotPasswordMessage ? (
                  <div
                    className={`px-1 text-[13px] ${forgotPasswordError ? "text-red-700" : "text-green-700"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {forgotPasswordError ? (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-red-700 text-[12px] font-bold text-red-700">
                          !
                        </div>
                      ) : null}
                      <p className="leading-5">{forgotPasswordMessage}</p>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3 pt-1.5">
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="flex-1 rounded-2xl bg-[#e0e5e1] py-3.5 text-sm font-semibold text-[#2f3a36]"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-(--vv-accent) py-3.5 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(35,70,60,0.28)]"
                  >
                    送信
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d2eee5] text-[#4b6b5f]">
                  <CheckIcon className="h-9 w-9" />
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-[clamp(1.2rem,2.4vw,1.65rem)] font-semibold tracking-tight text-[#303b38]">
                    メールを送信しました
                  </h2>
                  <p className="text-[13px] leading-6 text-[#6f7772] sm:text-sm">
                    <span className="font-medium text-[#5a625e]">
                      {forgotPasswordEmail}
                    </span>
                    にパスワードリセットのリンクを送信しました。メールをご確認ください。
                    <br />
                    メールが届かない場合は、迷惑メールフォルダをご確認ください。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    closeForgotPassword();
                    setMode("login");
                  }}
                  className="w-full rounded-2xl bg-(--vv-accent) py-3.5 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(35,70,60,0.28)]"
                >
                  ログインに戻る
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-105 flex-col items-center gap-6 px-4 pb-10 pt-10">
        <div className="flex flex-col items-center gap-3 vv-rise-in">
          <div className="vv-logo flex h-16 w-16 items-center justify-center rounded-3xl bg-(--vv-accent) text-xl text-white shadow-[0_18px_28px_rgba(35,70,60,0.28)]">
            VV
          </div>
          <h1 className="text-xl font-semibold tracking-tight">VietVibe</h1>
          <p className="text-xs text-(--vv-muted)">ベトナム語リスニング練習</p>
        </div>

        <div className="w-full rounded-3xl bg-transparent p-5 vv-rise-in vv-delay-1">
          <div className="flex border-b border-(--vv-border) text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 pb-3 pt-3 text-center transition relative ${
                mode === "login"
                  ? "text-(--vv-accent-strong) border-b-2 border-(--vv-accent-strong) -mb-1"
                  : "text-(--vv-muted)"
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 pb-3 pt-3 text-center transition relative ${
                mode === "register"
                  ? "text-(--vv-accent-strong) border-b-2 border-(--vv-accent-strong) -mb-1"
                  : "text-(--vv-muted)"
              }`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === "register" ? (
              <label className="flex flex-col gap-2 text-xs font-semibold text-(--vv-muted)">
                お名前
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  placeholder="お名前を入力..."
                  className="h-12 rounded-2xl border border-transparent bg-white px-4 text-sm text-foreground shadow-sm ring-1 ring-(--vv-border) focus:border-(--vv-accent) focus:outline-none"
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-2 text-xs font-semibold text-(--vv-muted)">
              メールアドレス
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="text"
                placeholder="メールアドレスを入力..."
                className="h-12 rounded-2xl border border-transparent bg-white px-4 text-sm text-foreground shadow-sm ring-1 ring-(--vv-border) focus:border-(--vv-accent) focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold text-(--vv-muted)">
              パスワード
              <div className="relative">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワードを入力..."
                  className="h-12 w-full rounded-2xl border border-transparent bg-white px-4 pr-12 text-sm text-foreground shadow-sm ring-1 ring-(--vv-border) focus:border-(--vv-accent) focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--vv-muted)"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
            </label>

            {mode === "register" ? (
              <label className="flex flex-col gap-2 text-xs font-semibold text-(--vv-muted)">
                パスワード確認
                <div className="relative">
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="もう一度入力..."
                    className="h-12 w-full rounded-2xl border border-transparent bg-white px-4 pr-12 text-sm text-foreground shadow-sm ring-1 ring-(--vv-border) focus:border-(--vv-accent) focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-(--vv-muted)"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>
              </label>
            ) : null}

            {mode === "login" ? (
              <div className="flex justify-end text-xs">
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="font-semibold text-(--vv-accent-strong)"
                >
                  パスワードをお忘れですか？
                </button>
              </div>
            ) : null}

            {message ? (
              <div
                className={`text-xs ${isError ? "text-red-700" : "text-green-700"}`}
              >
                <div className="flex items-center gap-3">
                  {isError ? (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-red-700 font-bold text-red-700">
                      !
                    </div>
                  ) : null}
                  <p className="flex-1">{message}</p>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              className="mt-2 h-12 rounded-2xl bg-(--vv-accent) text-sm font-semibold text-white shadow-[0_14px_24px_rgba(35,70,60,0.3)]"
            >
              {mode === "login" ? "ログイン" : "新規登録"}
            </button>

            <div className="flex justify-center text-xs text-(--vv-muted)">
              <span className="whitespace-nowrap">
                {mode === "login"
                  ? "アカウントをお持ちでないですか？"
                  : "既にアカウントをお持ちですか？ "}
              </span>
              <button
                type="button"
                onClick={() =>
                  setMode((prev) => (prev === "login" ? "register" : "login"))
                }
                className="ml-1 font-semibold whitespace-nowrap text-(--vv-accent-strong)"
              >
                {mode === "login" ? "新規登録" : "ログイン"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
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
      <path d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12s-4.5 7.5-10.5 7.5S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
      <circle cx="12" cy="12" r="10" opacity="0.15" />
    </svg>
  );
}
