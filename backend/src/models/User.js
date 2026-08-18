import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple users with no email
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
    },
    phoneNumberNormalized: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneNumberVerified: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      default: 'Available',
      maxlength: 139,
      trim: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
