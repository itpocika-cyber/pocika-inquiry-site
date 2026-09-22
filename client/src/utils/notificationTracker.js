// Utility to track viewed inquiries and manage real-time unread/NEW notification badges
const STORAGE_KEY = 'pocika_viewed_inquiries';

export function getViewedInquiries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function isNewInquiry(inquiry) {
  if (!inquiry) return false;
  const viewed = getViewedInquiries();
  const id = inquiry._id ? String(inquiry._id) : '';
  const num = inquiry.inquiryNumber || '';

  if (id && viewed.includes(id)) return false;
  if (num && viewed.includes(num)) return false;
  return true;
}

export function markInquiryAsViewed(inquiryId, inquiryNumber) {
  try {
    const viewed = getViewedInquiries();
    let updated = false;

    if (inquiryId && !viewed.includes(String(inquiryId))) {
      viewed.push(String(inquiryId));
      updated = true;
    }
    if (inquiryNumber && !viewed.includes(inquiryNumber)) {
      viewed.push(inquiryNumber);
      updated = true;
    }

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed));
      window.dispatchEvent(new Event('pocika_viewed_changed'));
    }
  } catch (e) {
    console.warn('Error marking inquiry as viewed:', e);
  }
}
