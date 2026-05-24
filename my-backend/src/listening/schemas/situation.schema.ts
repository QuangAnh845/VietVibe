import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SituationDocument = Situation & Document;

@Schema({ _id: false })
export class ScriptItem {
  @Prop()
  speaker_name: string;

  @Prop()
  content_jp: string;

  @Prop()
  content_vn: string;

  @Prop()
  start_time: number;

  @Prop()
  end_time: number;

  @Prop()
  order_index: number;
}
export const ScriptItemSchema = SchemaFactory.createForClass(ScriptItem);

@Schema({ timestamps: true })
export class Situation {
  @Prop({ required: true })
  title_vn: string;

  @Prop({ required: true })
  title_jp: string;

  @Prop({ required: true })
  main_audio_url: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ type: [ScriptItemSchema], default: [] })
  scripts: ScriptItem[];
}

export const SituationSchema = SchemaFactory.createForClass(Situation);
