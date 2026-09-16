import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    unique: true,
    index: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    default: '',
    trim: true
  },
  photoURL: {
    type: String,
    default: '',
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['super_admin', 'admin', 'sales_person', 'manager'],
      message: '{VALUE} is not a valid role'
    },
    default: 'sales_person',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

export const User = mongoose.model('User', userSchema);
