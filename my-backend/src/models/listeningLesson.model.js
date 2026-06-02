const mongoose = require('mongoose');
const { Schema } = mongoose;

const ListeningLessonSchema = new Schema(
  {
    learning_unit_id: { type: Schema.Types.ObjectId, ref: 'LearningUnit', unique: true, required: true },
    title_vi: { type: String, required: true },
    title_ja: { type: String, required: true },
    audio_url: { type: String, required: true },
    duration_seconds: { type: Number, required: true },
    description: { type: String, default: null },
    ambient_sound_ids: { type: [{ type: Schema.Types.ObjectId, ref: 'EnvironmentSound' }], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('ListeningLesson', ListeningLessonSchema);
