import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: ''
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
      values: ['super_admin', 'admin', 'manager', 'sales_person'],
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
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Method to verify password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
