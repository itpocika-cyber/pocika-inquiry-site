import { qs, qsa } from './utils.js';
import { auth, getUserProfile, signOut, onAuthStateChanged } from './auth.js';

// ---------- Protect Frontend Routes & Enforce Authorization ----------
function initAuthProtection() {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('login.html') || currentPath.endsWith('/login');

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (!isLoginPage) {
        window.location.href = 'login.html';
      }
      return;
    }

    // Authenticated: fetch authoritative profile from backend
    try {
      const profile = await getUserProfile();

      if (!profile || !profile.isActive) {
        await signOut();
        alert('Your account is inactive. Contact an administrator.');
        window.location.href = 'login.html';
        return;
      }

      const isAuthorizedAdmin = (user.email || '').toLowerCase() === 'admin@pocika.com' || ['admin', 'super_admin'].includes(profile.role);

      // Check Admin Page Protection
      const isAdminPage = currentPath.includes('admin-dashboard.html');
      if (isAdminPage) {
        if (!isAuthorizedAdmin) {
          console.warn(`Access Denied: User role "${profile.role}" cannot access admin panel.`);
          alert("403 Forbidden: You don't have permission to access the Admin Dashboard.");
          window.location.href = 'dashboard.html';
          return;
        }
      }

      // If user is Admin, they should ONLY see the Admin Dashboard, not the salesperson dashboard!
      if (isAuthorizedAdmin && (currentPath.includes('dashboard.html') || currentPath.includes('inquiries.html'))) {
        window.location.href = 'admin-dashboard.html';
        return;
      }

      // Update UI with authenticated user information
      updateUserUI(profile);
    } catch (err) {
      console.error('Session verification error:', err.message);
      if (err.message.includes('inactive')) {
        await signOut();
        window.location.href = 'login.html';
      }
    }
  });
}

// ---------- Populate User Header & Profile Elements ----------
function updateUserUI(profile) {
  if (!profile) return;

  const displayName = profile.displayName || profile.email.split('@')[0];
  const initials = displayName
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Format role label
  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    manager: 'Sales Head / Manager',
    sales_person: 'Salesperson'
  };
  const roleTitle = roleLabels[profile.role] || profile.role;

  // Header user chips
  qsa('.app-user-chip').forEach(chip => {
    const avatar = chip.querySelector('.app-user-avatar');
    if (avatar) {
      if (profile.photoURL) {
        avatar.innerHTML = `<img src="${profile.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        avatar.textContent = initials;
      }
    }
    const nameEl = chip.querySelector('span:not(.app-user-avatar)');
    if (nameEl) {
      nameEl.textContent = displayName;
    }
  });

  // Admin layout sidebar user area
  const adminSidebarUser = qs('.admin-layout__sidebar .fw-bold.fs-sm');
  if (adminSidebarUser) adminSidebarUser.textContent = displayName;
  const adminSidebarEmail = qs('.admin-layout__sidebar .text-muted.small');
  if (adminSidebarEmail) adminSidebarEmail.textContent = profile.email;

  // Welcome greeting on dashboard
  const welcomeHeading = qs('.text-page-title');
  if (welcomeHeading && welcomeHeading.textContent.includes('Good morning')) {
    welcomeHeading.textContent = `Good morning, ${displayName}`;
  }
}

// ---------- Mobile nav toggle ----------
function initMobileNav() {
  const toggle = qs('[data-mobile-nav-toggle]');
  const panel = qs('[data-mobile-nav-panel]');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// ---------- Global Logout handler ----------
function initLogout() {
  const logoutButtons = qsa('#btn-logout, [data-logout]');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut();
        window.location.href = 'login.html';
      } catch (error) {
        console.error("Error signing out:", error);
        window.location.href = 'login.html';
      }
    });
  });
}

// ---------- Selectable chips / product cards ----------
function initSelectable() {
  qsa('.chip-option input, .product-card input').forEach((input) => {
    input.addEventListener('change', () => {
      const wrapper = input.closest('.chip-option, .product-card');
      if (!wrapper) return;

      if (input.type === 'radio') {
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
  setTimeout(() => toast.classList.add('is-visible'), 600);
  setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthProtection();
  initMobileNav();
  initLogout();
  initSelectable();
  initToastDemo();
});
