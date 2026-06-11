// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
   _id: { type: String, required: true }, 
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:      { type: String, trim: true },
  avatarUrl: { type: String },
  mode:      { type: String, enum: ['home', 'business'], default: 'home' },
  plan:      { type: String, enum: ['free', 'pro', 'business'], default: 'free' },

  // Daily generation tracking
  generationsToday: { type: Number, default: 0 },
  generationsTotal: { type: Number, default: 0 },
  lastGenReset:     { type: Date, default: Date.now },

  // Persistent memory (style prefs, brand info, dislikes, etc.)
  memory: [{
    type:       { type: String },   // style_pref | color_pref | tone | brand_kit | dislike
    value:      { type: String },
    confidence: { type: Number, default: 1.0 },
    createdAt:  { type: Date, default: Date.now },
  }],

  // Business brand kit
  brandKit: {
    name:          String,
    primaryColor:  String,
    secondaryColor:String,
    accentColor:   String,
    logoUrl:       String,
    fontHeading:   String,
    fontBody:      String,
    toneOfVoice:   String,
    values:        [String],
    industry:      String,
  },

}, { timestamps: true });

// Limit memory to 20 entries
UserSchema.methods.addMemory = function(type, value) {
  const exists = this.memory.find(m => m.type === type && m.value === value);
  if (!exists) {
    this.memory.push({ type, value });
    if (this.memory.length > 20) this.memory.shift();
  }
  return this;
};

// Reset daily count if new day
UserSchema.methods.checkDailyReset = function() {
  const today = new Date().toDateString();
  if (new Date(this.lastGenReset).toDateString() !== today) {
    this.generationsToday = 0;
    this.lastGenReset = new Date();
  }
  return this;
};

// Daily limits by plan
UserSchema.methods.getDailyLimit = function() {
  return { free: 5, pro: 100, business: Infinity }[this.plan] ?? 5;
};

UserSchema.methods.canGenerate = function() {
  this.checkDailyReset();
  return this.generationsToday < this.getDailyLimit();
};

export default mongoose.model('User', UserSchema);
