import { qs, qsa } from './utils.js';

// ---------- Mobile nav toggle (shared across every page) ----------
function initMobileNav() {
  const toggle = qs('[data-mobile-nav-toggle]');
  const panel = qs('[data-mobile-nav-panel]');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// ---------- Selectable chips / product cards (design-system demo) ----------
// Real form pages (Phase 2+) will drive this same pattern from form.js,
// writing selections into the shared inquiryData object.
function initSelectable() {
  qsa('.chip-option input, .product-card input').forEach((input) => {
    input.addEventListener('change', () => {
      const wrapper = input.closest('.chip-option, .product-card');
      if (!wrapper) return;

      if (input.type === 'radio') {
        // Clear sibling selections in the same group
        qsa(`input[name="${input.name}"]`).forEach((sibling) => {
          sibling.closest('.chip-option, .product-card')?.classList.remove('is-selected');
        });
      }
      wrapper.classList.toggle('is-selected', input.checked);
    });
  });
}

// ---------- Toast demo ----------
function initToastDemo() {
  const toast = qs('[data-toast]');
  if (!toast) return;
  // Fires once on load purely to demonstrate the component on design-system.html
  setTimeout(() => toast.classList.add('is-visible'), 600);
  setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initSelectable();
  initToastDemo();
});
