// models/GenerationJob.js
import mongoose from 'mongoose';

const GenerationJobSchema = new mongoose.Schema({
  //  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  //  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },

   userId:         { type: String, required: true },
   conversationId: { type: String, required: true },

  status:   { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  prompt:   { type: String, required: true },
  style:    { type: String, default: 'auto' },
  count:    { type: Number, default: 1, min: 1, max: 6 },
  apiUsed:  { type: String },

  assetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  imageUrls:[String],
  error:    { type: String },

  startedAt:   { type: Date },
  completedAt: { type: Date },
  generationApi: {
    type: String,
    required: true,
    enum: ['dall-e-3', 'midjourney','flux_dev','sdxl',"flux_schnell",'pollinations'], // ❌ Missing 'flux_dev'
  },

}, { timestamps: true });

GenerationJobSchema.index({ userId: 1, createdAt: -1 });
GenerationJobSchema.index({ status: 1 }, { partialFilterExpression: { status: { $in: ['pending', 'processing'] } } });

export default mongoose.model('GenerationJob', GenerationJobSchema);
