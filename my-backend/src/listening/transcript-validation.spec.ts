import { BadRequestException } from '@nestjs/common';
import { validateTranscriptLines } from './transcript-validation';
import { TranscriptLineDto } from './transcript-line.dto';

describe('validateTranscriptLines', () => {
  const validLine = (start: number, end: number): TranscriptLineDto => ({
    startTime: start,
    endTime: end,
    textVi: 'Xin chào',
    textJa: 'こんにちは',
  });

  it('accepts ordered non-overlapping lines', () => {
    expect(() =>
      validateTranscriptLines([validLine(0, 2), validLine(2, 5)], 10),
    ).not.toThrow();
  });

  it('rejects end before start', () => {
    expect(() => validateTranscriptLines([validLine(3, 2)], 10)).toThrow(
      BadRequestException,
    );
  });

  it('rejects overlapping lines', () => {
    expect(() =>
      validateTranscriptLines([validLine(0, 4), validLine(3, 6)], 10),
    ).toThrow(BadRequestException);
  });

  it('rejects end beyond duration', () => {
    expect(() => validateTranscriptLines([validLine(0, 12)], 10)).toThrow(
      BadRequestException,
    );
  });
});
