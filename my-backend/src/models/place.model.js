const mongoose = require('mongoose');
const { Schema } = mongoose;

const PlaceSchema = new Schema(
  {
    name_vi: { type: String, required: true, trim: true },
    name_ja: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    avatar_url: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

module.exports = mongoose.model('Place', PlaceSchema);
