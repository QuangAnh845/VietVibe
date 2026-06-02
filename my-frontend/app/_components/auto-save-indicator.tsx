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
  if (status === "SAVING") {
    return (
      <span
        className={`inline-flex items-center gap-2 text-[11px] text-[#7b8b83] ${className}`}
        role="status"
        aria-live="polite"
      >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#c9d6d0] border-t-[#2f5d50]" />
        Đang lưu tự động...
      </span>
    );
  }

  if (status === "SAVED" || status === "IDLE") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] text-[#7b8b83] ${className}`}
        role="status"
        aria-live="polite"
      >
        <svg
          className="h-3.5 w-3.5 text-[#2f5d50]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Đã lưu tự động
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] text-[#b45309] ${className}`}
      role="status"
      aria-live="polite"
    >
      ⚠ Lưu nháp thất bại
    </span>
  );
}
