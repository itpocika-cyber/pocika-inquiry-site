// Small, dependency-free helpers shared across pages.

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

// Demo-only inquiry number generator for this frontend prototype.
// The real PSI-YYYY-NNNNNN sequence will be assigned by the backend.
export function generateDemoInquiryNumber() {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  return `PSI-${year}-${random}`;
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
