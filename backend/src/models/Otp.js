import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    phoneNumberNormalized: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically delete document when this date is reached
    },
  },
  {
    timestamps: true,
  }
);

export const Otp = mongoose.model('Otp', otpSchema);
