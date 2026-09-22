import { ProductCatalog } from '../models/ProductCatalog.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getCatalog = async (req, res, next) => {
  try {
    const query = {};
    // Salespeople only see active products; Admins can see all if requested
    if (req.user.role === 'sales_person' || req.query.activeOnly === 'true') {
      query.isActive = true;
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { category: searchRegex },
        { description: searchRegex }
      ];
    }

    const items = await ProductCatalog.find(query).sort({ category: 1, name: 1 });
    return successResponse(res, { items, total: items.length });
  } catch (error) {
    next(error);
  }
};

export const createCatalogItem = async (req, res, next) => {
  try {
    const { name, category, description, priceRange, photo } = req.body;
    if (!name || !name.trim()) {
      return errorResponse(res, { code: 'VALIDATION_ERROR', message: 'Product name is required' }, 400);
    }

    const item = await ProductCatalog.create({
      name: name.trim(),
      category: (category || '').trim(),
      description: (description || '').trim(),
      priceRange: (priceRange || '').trim(),
      photo: photo || { publicId: '', secureUrl: '' },
      createdBy: req.user.displayName || req.user.email
    });

    return successResponse(res, item, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCatalogItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = {};
    ['name', 'category', 'description', 'priceRange', 'photo', 'isActive'].forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const item = await ProductCatalog.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!item) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Catalog item not found' }, 404);
    }

    return successResponse(res, item);
  } catch (error) {
    next(error);
  }
};

export const deleteCatalogItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await ProductCatalog.findByIdAndDelete(id);
    if (!item) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Catalog item not found' }, 404);
    }
    return successResponse(res, { message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};
