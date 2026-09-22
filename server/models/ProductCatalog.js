import mongoose from 'mongoose';

const productCatalogSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  priceRange: { type: String, default: '', trim: true }, // e.g. "₹1,200 - ₹1,800" or "₹4,500"
  photo: {
    publicId: { type: String, default: '' },
    secureUrl: { type: String, default: '' }
  },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: String, default: '' }
}, {
  timestamps: true
});

export const ProductCatalog = mongoose.model('ProductCatalog', productCatalogSchema);
