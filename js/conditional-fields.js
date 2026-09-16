import { qs, qsa } from './utils.js';

export function initConditionalFields() {
  // Customer Type "Retail/Other"
  qsa('input[name="business.customerType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const otherGroup = qs('#customer-type-other-group');
      if (!otherGroup) return;
      if (e.target.value === 'Retail/Other') {
        otherGroup.classList.remove('d-none');
        otherGroup.querySelector('input').setAttribute('required', 'true');
      } else {
        otherGroup.classList.add('d-none');
        const input = otherGroup.querySelector('input');
        input.removeAttribute('required');
        input.value = ''; // clear on hide
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Facility "Other"
  qsa('input[name="business.facility"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const otherGroup = qs('#facility-other-group');
      if (!otherGroup) return;
      if (e.target.value === 'Other') {
        otherGroup.classList.remove('d-none');
        otherGroup.querySelector('input').setAttribute('required', 'true');
      } else {
        otherGroup.classList.add('d-none');
        const input = otherGroup.querySelector('input');
        input.removeAttribute('required');
        input.value = '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Products "Other"
  qsa('input[name="products"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const otherGroup = qs('#product-other-group');
      if (!otherGroup) return;
      
      const otherCheckbox = qs('input[name="products"][value="Other"]');
      if (otherCheckbox && otherCheckbox.checked) {
        otherGroup.classList.remove('d-none');
        otherGroup.querySelector('input').setAttribute('required', 'true');
      } else {
        otherGroup.classList.add('d-none');
        const input = otherGroup.querySelector('input');
        input.removeAttribute('required');
        input.value = '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Step 5: Photos
  qsa('input[name="visit.photos"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const uploader = qs('#photo-uploader-widget');
      const note = qs('#photos-not-required-note');
      if (!uploader || !note) return;

      if (e.target.value === 'Taken') {
        uploader.classList.remove('d-none');
        note.classList.add('d-none');
      } else {
        uploader.classList.add('d-none');
        note.classList.remove('d-none');
        // Clear photos when not required
        const photoInput = qs('#photo-input');
        if (photoInput) {
           photoInput.value = '';
           // we need to clear photos array in memory too
           window.dispatchEvent(new CustomEvent('clear-photos'));
        }
      }
    });
  });

  // Step 6: Next Action -> Quotation
  qsa('input[name="followUp.nextAction"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const quoteGroup = qs('#quotation-date-group');
      if (!quoteGroup) return;

      const quoteCheckbox = qs('input[name="followUp.nextAction"][value="Quotation"]');
      if (quoteCheckbox && quoteCheckbox.checked) {
        quoteGroup.classList.remove('d-none');
        quoteGroup.querySelector('input').setAttribute('required', 'true');
      } else {
        quoteGroup.classList.add('d-none');
        const input = quoteGroup.querySelector('input');
        input.removeAttribute('required');
        input.value = '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}
