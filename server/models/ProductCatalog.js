import mongoose from 'mongoose';

const productCatalogSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: '', trim: true },
  subCategory: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  specifications: { type: mongoose.Schema.Types.Mixed, default: '' },
  price: { type: String, default: '', trim: true },
  priceHint: { type: String, default: '', trim: true },
  priceRange: { type: String, default: '', trim: true },
  unit: { type: String, default: 'Piece', trim: true },
  imageUrl: { type: String, default: '', trim: true },
  photo: {
    publicId: { type: String, default: '' },
    secureUrl: { type: String, default: '' }
  },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: String, default: '' }
}, {
  timestamps: true,
  strict: false
});

export const ProductCatalog = mongoose.model('ProductCatalog', productCatalogSchema);
