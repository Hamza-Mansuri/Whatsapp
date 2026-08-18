import mongoose from 'mongoose';

const viewerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video'],
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaPublicId: {
      type: String,
      default: null,
    },
    mediaResourceType: {
      type: String,
      default: null, // 'image' or 'video'
    },
    backgroundColor: {
      type: String,
      default: '#000000',
    },
    textColor: {
      type: String,
      default: '#ffffff',
    },
    viewers: [viewerSchema],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index. Document is deleted when expiresAt <= now
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly query unexpired statuses
statusSchema.index({ expiresAt: 1 });

export const Status = mongoose.model('Status', statusSchema);
