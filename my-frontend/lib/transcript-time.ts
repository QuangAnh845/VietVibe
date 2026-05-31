export type TranscriptEditorRow = {
  id?: string;
  vi: string;
  jp: string;
  startTime: number;
  endTime: number;
};

export type TranscriptLinePayload = {
  startTime: number;
  endTime: number;
  textVi: string;
  textJa: string;
};

export function secondsToTimestamp(value?: number) {
  const totalSeconds = Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function timestampToSeconds(timestamp?: string) {
  if (!timestamp?.trim()) {
    return 0;
  }

  const parts = timestamp.trim().split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return 0;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

export function inferEndTimes(
  lines: Pick<TranscriptEditorRow, "startTime" | "endTime">[],
  durationSeconds?: number,
) {
  return lines.map((line, index) => {
    if (line.endTime > line.startTime) {
      return line.endTime;
    }

    const nextStart = lines[index + 1]?.startTime;
    if (nextStart !== undefined && nextStart > line.startTime) {
      return nextStart;
    }

    if (durationSeconds && durationSeconds > line.startTime) {
      return durationSeconds;
    }

    return line.startTime + 2;
  });
}

export function buildTranscriptPayload(
  rows: TranscriptEditorRow[],
  durationSeconds?: number,
): TranscriptLinePayload[] {
  const endTimes = inferEndTimes(rows, durationSeconds);

  return rows.map((row, index) => ({
    startTime: row.startTime,
    endTime: endTimes[index],
    textVi: row.vi.trim(),
    textJa: row.jp.trim(),
  }));
}

export function validateTranscriptRows(
  rows: TranscriptEditorRow[],
  durationSeconds?: number,
): string | null {
  if (!rows.length) {
    return null;
  }

  const payload = buildTranscriptPayload(rows, durationSeconds);

  for (let index = 0; index < payload.length; index += 1) {
    const line = payload[index];
    const lineNumber = index + 1;

    if (!line.textVi) {
      return `Dòng #${lineNumber}: cần có nội dung tiếng Việt.`;
    }

    if (line.startTime >= line.endTime) {
      return `Dòng #${lineNumber}: thời điểm bắt đầu phải nhỏ hơn thời điểm kết thúc.`;
    }

    if (index > 0 && line.startTime < payload[index - 1].endTime) {
      return `Dòng #${lineNumber}: thời gian bắt đầu chồng lấn với câu trước.`;
    }

    if (
      durationSeconds &&
      durationSeconds > 0 &&
      line.endTime > durationSeconds
    ) {
      return `Dòng #${lineNumber}: thời điểm kết thúc vượt quá độ dài audio.`;
    }
  }

  return null;
}
