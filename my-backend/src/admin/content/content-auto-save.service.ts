import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AutoSaveContentType,
} from './dto/base-auto-save.dto.js';
import { AutoSaveDto } from './dto/auto-save.dto.js';

const mongoose = require('mongoose');
const { Types } = mongoose;
const { Schema } = mongoose;

const AdminContentDraftSchema = new Schema(
  {
    content_type: { type: String, enum: ['VOCABULARY', 'LISTENING'], required: true, index: true },
    status: { type: String, enum: ['DRAFT'], default: 'DRAFT', index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const AdminContentDraft =
  mongoose.models.AdminContentDraft ||
  mongoose.model('AdminContentDraft', AdminContentDraftSchema);

type AutoSaveResponse = {
  id: string;
  status: 'DRAFT';
  savedAt: string;
};

@Injectable()
export class ContentAutoSaveService {
  async autoSave(dto: AutoSaveDto): Promise<AutoSaveResponse> {
    const contentType = await this.resolveContentType(dto);

    if (contentType === AutoSaveContentType.VOCABULARY) {
      return this.autoSaveVocabulary(dto);
    }

    return this.autoSaveListening(dto);
  }

  private async autoSaveVocabulary(dto: AutoSaveDto): Promise<AutoSaveResponse> {
    const payload = this.buildVocabularyPayload(dto);
    const saved = dto.contentId
      ? await AdminContentDraft.findByIdAndUpdate(
          this.toObjectId(dto.contentId),
          {
            $set: {
              content_type: AutoSaveContentType.VOCABULARY,
              status: 'DRAFT',
              payload,
            },
          },
          { new: true },
        )
      : await AdminContentDraft.create({
          content_type: AutoSaveContentType.VOCABULARY,
          status: 'DRAFT',
          payload,
        });

    if (!saved) {
      throw new NotFoundException('Vocabulary draft not found.');
    }

    return this.buildResponse(saved);
  }

  private async autoSaveListening(dto: AutoSaveDto): Promise<AutoSaveResponse> {
    const payload = this.buildListeningPayload(dto);
    const saved = dto.contentId
      ? await AdminContentDraft.findByIdAndUpdate(
          this.toObjectId(dto.contentId),
          {
            $set: {
              content_type: AutoSaveContentType.LISTENING,
              status: 'DRAFT',
              payload,
            },
          },
          { new: true },
        )
      : await AdminContentDraft.create({
          content_type: AutoSaveContentType.LISTENING,
          status: 'DRAFT',
          payload,
        });

    if (!saved) {
      throw new NotFoundException('Listening draft not found.');
    }

    return this.buildResponse(saved);
  }

  private async resolveContentType(dto: AutoSaveDto): Promise<AutoSaveContentType> {
    if (dto.contentType) {
      return dto.contentType;
    }

    if (!dto.contentId) {
      throw new BadRequestException('contentType is required when creating a draft.');
    }

    const draft = await AdminContentDraft.findById(this.toObjectId(dto.contentId));

    if (draft?.content_type) {
      return draft.content_type;
    }

    throw new NotFoundException('Content draft not found.');
  }

  private buildVocabularyPayload(dto: AutoSaveDto) {
    const payload: Record<string, unknown> = {
      status: 'DRAFT',
    };

    if (dto.learning_unit_id !== undefined) {
      payload.learning_unit_id = dto.learning_unit_id;
    }
    if (dto.word_vi !== undefined) payload.word_vi = dto.word_vi.trim();
    if (dto.meaning_ja !== undefined) payload.meaning_ja = dto.meaning_ja.trim();
    if (dto.example_vi !== undefined) payload.example_vi = this.nullableTrim(dto.example_vi);
    if (dto.example_ja !== undefined) payload.example_ja = this.nullableTrim(dto.example_ja);
    if (dto.note !== undefined) payload.note = this.nullableTrim(dto.note);
    if (dto.tag !== undefined) payload.tag = this.nullableTrim(dto.tag);

    return payload;
  }

  private buildListeningPayload(dto: AutoSaveDto) {
    const payload: Record<string, unknown> = {
      status: 'DRAFT',
    };

    if (dto.learningUnitId !== undefined) {
      payload.learning_unit_id = dto.learningUnitId;
    }
    if (dto.titleVi !== undefined) payload.title_vi = dto.titleVi.trim();
    if (dto.titleJa !== undefined) payload.title_ja = dto.titleJa.trim();
    if (dto.audioUrl !== undefined) payload.audio_url = dto.audioUrl.trim();
    if (dto.durationSeconds !== undefined) payload.duration_seconds = dto.durationSeconds;
    if (dto.description !== undefined) payload.description = this.nullableTrim(dto.description);

    if (dto.transcriptLines !== undefined) {
      payload.transcript_lines = dto.transcriptLines.map((line) => ({
        start_time: line.startTime ?? 0,
        end_time: line.endTime ?? 0,
        text_vi: line.textVi ?? '',
        text_ja: line.textJa ?? null,
      }));
    }

    return payload;
  }

  private buildResponse(document: { _id: unknown; updated_at?: Date; updatedAt?: Date }) {
    return {
      id: String(document._id),
      status: 'DRAFT' as const,
      savedAt: (document.updated_at ?? document.updatedAt ?? new Date()).toISOString(),
    };
  }

  private nullableTrim(value: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid content id.');
    }

    return new Types.ObjectId(value);
  }
}
