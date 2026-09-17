import { useEffect } from 'react';

/**
 * Hook to manage conditional fields and automatically clear stale values when their trigger is deselected.
 */
export function useConditionalFields(inquiryData, updateField) {
  // 1. Customer Type "Retail/Other" -> customerTypeOther
  useEffect(() => {
    if (inquiryData.business.customerType !== 'Retail/Other' && inquiryData.business.customerTypeOther) {
      updateField('business', 'customerTypeOther', '');
    }
  }, [inquiryData.business.customerType, inquiryData.business.customerTypeOther, updateField]);

  // 2. Facility "Other" -> facilityOther
  useEffect(() => {
    if (inquiryData.business.facility !== 'Other' && inquiryData.business.facilityOther) {
      updateField('business', 'facilityOther', '');
    }
  }, [inquiryData.business.facility, inquiryData.business.facilityOther, updateField]);

  // 3. Products includes "Other" -> productOther
  useEffect(() => {
    const hasOther = inquiryData.products.includes('Other');
    if (!hasOther && inquiryData.productOther) {
      updateField('', 'productOther', '');
    }
  }, [inquiryData.products, inquiryData.productOther, updateField]);

  // 4. Photos "Taken" -> if "Not Required", clear queued photos
  useEffect(() => {
    if (inquiryData.visit.photos === 'Not Required' && inquiryData.photos && inquiryData.photos.length > 0) {
      updateField('', 'photos', []);
    }
  }, [inquiryData.visit.photos, inquiryData.photos, updateField]);

  // 5. Next Action includes "Quotation" -> quotationDate
  useEffect(() => {
    const hasQuotation = inquiryData.followUp.nextAction.includes('Quotation');
    if (!hasQuotation && inquiryData.followUp.quotationDate) {
      updateField('followUp', 'quotationDate', '');
    }
  }, [inquiryData.followUp.nextAction, inquiryData.followUp.quotationDate, updateField]);
}

export default useConditionalFields;
