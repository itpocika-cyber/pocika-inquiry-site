/**
 * POCIKA Fire & Safety Product Catalog Constants & Utilities
 * No external placeholder images or emojis - pure enterprise code
 */

export const CATEGORIES = [
  'Fire Extinguishers',
  'Fire Alarm & Detection',
  'Fire Hydrant & Suppression',
  'PPE & Safety Equipment',
  'AMC & Refilling Services',
  'Pumps & Accessories',
  'Other'
];

/**
 * Returns genuine image URL uploaded by admin, or empty string
 */
export function getProductImageUrl(item) {
  if (item?.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim()) {
    return item.imageUrl.trim();
  }
  if (item?.photo?.secureUrl && typeof item.photo.secureUrl === 'string' && item.photo.secureUrl.trim()) {
    return item.photo.secureUrl.trim();
  }
  return '';
}
