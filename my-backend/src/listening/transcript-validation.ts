import { BadRequestException } from '@nestjs/common';
import { TranscriptLineDto } from './transcript-line.dto';

export function validateTranscriptLines(
  lines: TranscriptLineDto[],
  durationSeconds?: number,
): void {
  if (!lines.length) {
    return;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (!line.textVi?.trim()) {
      throw new BadRequestException(
        `Dòng #${lineNumber}: cần có nội dung tiếng Việt.`,
      );
    }

    if (line.startTime < 0 || line.endTime < 0) {
      throw new BadRequestException(
        `Dòng #${lineNumber}: thời gian không được âm.`,
      );
    }

    if (line.startTime >= line.endTime) {
      throw new BadRequestException(
        `Dòng #${lineNumber}: thời điểm bắt đầu phải nhỏ hơn thời điểm kết thúc.`,
      );
    }

    if (index > 0) {
      const previous = lines[index - 1];
      if (line.startTime < previous.endTime) {
        throw new BadRequestException(
          `Dòng #${lineNumber}: thời gian bắt đầu không được trước khi câu #${index} kết thúc.`,
        );
      }
    }

    if (
      durationSeconds !== undefined &&
      durationSeconds > 0 &&
      line.endTime > durationSeconds
    ) {
      throw new BadRequestException(
        `Dòng #${lineNumber}: thời điểm kết thúc vượt quá độ dài audio (${durationSeconds}s).`,
      );
    }
  }
}
