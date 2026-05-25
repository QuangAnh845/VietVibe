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

  if (status === "SAVED") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] text-[#7b8b83] ${className}`}
        role="status"
        aria-live="polite"
      >
        ✓ Đã lưu tự động
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
