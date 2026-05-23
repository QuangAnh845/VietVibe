const mongoose = require('mongoose');
const { Schema } = mongoose;

const EnvironmentSoundSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    audio_url: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EnvironmentSound', EnvironmentSoundSchema);
