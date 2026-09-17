import { useEffect, useRef } from 'react';

const DRAFT_KEY = 'pocika_inquiry_draft';
const DEBOUNCE_MS = 300;

export function useDraftAutosave(inquiryData, currentStep) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        // Strip non-serializable File objects from photos before saving to localStorage
        const sanitizedPhotos = (inquiryData.photos || []).map(p => {
          if (p.file) {
            const { file, ...rest } = p;
            return rest;
          }
          return p;
        });

        const draftPayload = {
          data: {
            ...inquiryData,
            photos: sanitizedPhotos
          },
          currentStep,
          savedAt: new Date().toISOString()
        };

        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload));
      } catch (err) {
        console.warn('Unable to persist draft to localStorage:', err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [inquiryData, currentStep]);
}

export default useDraftAutosave;
