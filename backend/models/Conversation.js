// models/Conversation.js
import mongoose from 'mongoose';

// ── Embedded message sub-document ────────────────────────────
const MessageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },

  // Parsed Vizzy intent metadata
  intent:    { type: String },   // generate_image | create_copy | build_moodboard
  prompt:    { type: String },   // refined image prompt
  style:     { type: String },
  imageCount:{ type: Number, default: 0 },

  // Asset references generated from this message
  assetIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],

  createdAt: { type: Date, default: Date.now },
}, { _id: true });

// ── Conversation document ─────────────────────────────────────
const ConversationSchema = new mongoose.Schema({
  //  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
   userId:   { type: String, required: true },
  title:    { type: String, default: 'New creation' },
  mode:     { type: String, enum: ['home', 'business'], default: 'home' },
  style:    { type: String, default: 'auto' },
  isPinned: { type: Boolean, default: false },

  messages: [MessageSchema],

  // Snapshot of user memory at time of conversation (for context)
  memorySnapshot: [String],

  // Stats
  messageCount: { type: Number, default: 0 },
  assetCount:   { type: Number, default: 0 },

}, { timestamps: true });

// Auto-update title from first user message
ConversationSchema.pre('save', function(next) {
  if (this.messages.length > 0 && this.title === 'New creation') {
    const firstUser = this.messages.find(m => m.role === 'user');
    if (firstUser) {
      this.title = firstUser.content.split(' ').slice(0, 6).join(' ');
    }
  }
  this.messageCount = this.messages.length;
  next();
});

ConversationSchema.index({ userId: 1, updatedAt: -1 });
ConversationSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

export default mongoose.model('Conversation', ConversationSchema);
