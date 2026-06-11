// models/Asset.js
import mongoose from 'mongoose';

const AssetSchema = new mongoose.Schema({
  // userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  userId:         { type: String, required: true },
  conversationId: { type: String, required: true },
  messageId:      { type: mongoose.Schema.Types.ObjectId },

  // Prompt data
  originalPrompt: { type: String, required: true },
  refinedPrompt:  { type: String },

  // Generated output
  imageUrl:       { type: String },
  thumbnailUrl:   { type: String },
  status:         { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  errorMessage:   { type: String },

  // Generation metadata
  generationApi:  { type: String, enum: ['dalle3', 'sdxl', 'flux', 'ideogram', 'placeholder'], default: 'placeholder' },
  modelVersion:   { type: String },
  seed:           { type: Number },
  generationMs:   { type: Number },

  // Visual properties
  style:          { type: String, default: 'auto' },
  aspectRatio:    { type: String, default: '1:1' },
  width:          { type: Number },
  height:         { type: Number },
// Generation metadata
generationApi:  { type: String, enum: ['dalle3', 'sdxl', 'flux', 'ideogram', 'placeholder'], default: 'placeholder' },
modelVersion:   { type: String },
seed:           { type: Number },
generationMs:   { type: Number },

  // Metadata
  mode:           { type: String, enum: ['home', 'business'], default: 'home' },
  tags:           [String],
  isSaved:        { type: Boolean, default: false },
  isPublic:       { type: Boolean, default: false },

}, { timestamps: true });

AssetSchema.index({ userId: 1, createdAt: -1 });
AssetSchema.index({ userId: 1, isSaved: 1 });
AssetSchema.index({ conversationId: 1 });
AssetSchema.index({ originalPrompt: 'text', refinedPrompt: 'text' }); // full-text search
// Recommended Index for background queue/stuck job management
AssetSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('Asset', AssetSchema);
