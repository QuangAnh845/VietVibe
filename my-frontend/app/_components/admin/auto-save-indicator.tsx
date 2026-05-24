"use client";

import type { AutoSaveStatus } from "@/app/hooks/use-auto-save";

type AutoSaveIndicatorProps = {
  status: AutoSaveStatus;
  className?: string;
};

export function AutoSaveIndicator({
  status,
  className = "",
}: AutoSaveIndicatorProps) {
  if (status === "IDLE") {
    return null;
  }

  if (status === "SAVING") {
    return (
      <div
        className={`inline-flex min-h-8 items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 ${className}`}
        role="status"
        aria-live="polite"
      >
        <SpinnerIcon className="h-4 w-4 animate-spin" />
        <span>Đang lưu...</span>
      </div>
    );
  }

  if (status === "SAVED") {
    return (
      <div
        className={`inline-flex min-h-8 items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ${className}`}
        role="status"
        aria-live="polite"
      >
        <CheckIcon className="h-4 w-4" />
        <span>Đã lưu vào nháp</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex min-h-8 items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 ${className}`}
      role="status"
      aria-live="polite"
    >
      <WarningIcon className="h-4 w-4" />
      <span>Lưu thất bại</span>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}
