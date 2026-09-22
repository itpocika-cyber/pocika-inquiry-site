import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: {
    userId: { type: String, default: '' },
    name: { type: String, default: '' }
  }
}, {
  timestamps: true
});

export const Announcement = mongoose.model('Announcement', announcementSchema);
