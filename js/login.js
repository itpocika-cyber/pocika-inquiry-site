import {
  auth,
  signInWithGoogle,
  signInWithEmailAndPassword,
  getUserProfile,
  onAuthStateChanged,
  signOut
} from './auth.js';
import { qs } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = qs('#auth-loading-overlay');
  const btnGoogle = qs('#btn-google-login');
  const googleBtnText = qs('#google-btn-text');
  const form = qs('#login-form');
  const btnLogin = qs('#btn-login');
  const errorAlert = qs('#login-error');
  const unauthorizedAlert = qs('#login-unauthorized');

  function showError(msg) {
    if (unauthorizedAlert) unauthorizedAlert.classList.add('d-none');
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.classList.remove('d-none');
    }
  }

  function clearAlerts() {
    if (errorAlert) errorAlert.classList.add('d-none');
    if (unauthorizedAlert) unauthorizedAlert.classList.add('d-none');
  }

  // Check if redirected due to expired session
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === 'true') {
    showError('Your session has expired. Please sign in again.');
  }

  // Check existing session on page load
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await getUserProfile(true);
        if (profile && !profile.isActive) {
          // Inactive user
          await signOut();
          if (loadingOverlay) loadingOverlay.classList.add('is-hidden');
          if (unauthorizedAlert) unauthorizedAlert.classList.remove('d-none');
          return;
        }

        const isAdmin = (user.email || '').toLowerCase() === 'admin@pocika.com' || (profile && (profile.role === 'admin' || profile.role === 'super_admin'));

        // Redirect based on role
        if (isAdmin) {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } catch (err) {
        console.error('Profile resolution failed:', err);
        if (err.message.includes('inactive')) {
          await signOut();
          if (unauthorizedAlert) unauthorizedAlert.classList.remove('d-none');
        } else {
          window.location.href = 'dashboard.html';
        }
        if (loadingOverlay) loadingOverlay.classList.add('is-hidden');
      }
    } else {
      // Unauthenticated, reveal login UI
      if (loadingOverlay) loadingOverlay.classList.add('is-hidden');
    }
  });

  // Google Sign-In Handler
  if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
      clearAlerts();
      btnGoogle.disabled = true;
      if (googleBtnText) googleBtnText.textContent = 'Connecting with Google...';

      try {
        const user = await signInWithGoogle();
        const profile = await getUserProfile(true);

        if (profile && !profile.isActive) {
          await signOut();
          btnGoogle.disabled = false;
          if (googleBtnText) googleBtnText.textContent = 'Sign in with Google';
          if (unauthorizedAlert) unauthorizedAlert.classList.remove('d-none');
          return;
        }

        // Redirect according to authoritative backend role
        if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        console.error('Google Sign-In failed:', error);
        btnGoogle.disabled = false;
        if (googleBtnText) googleBtnText.textContent = 'Sign in with Google';

        if (error.code === 'auth/popup-closed-by-user') {
          showError('Sign-in cancelled. Please try again.');
        } else if (error.code === 'auth/cancelled-popup-request') {
          // Ignored
        } else if (error.message && error.message.includes('inactive')) {
          if (unauthorizedAlert) unauthorizedAlert.classList.remove('d-none');
        } else {
          showError(error.message || 'Google sign-in failed. Please try again.');
        }
      }
    });
  }

  // Email / Password Fallback Handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlerts();

      const email = qs('#email').value.trim();
      const password = qs('#password').value.trim();

      if (!email || !password) {
        showError('Please enter both email and password.');
        return;
      }

      btnLogin.disabled = true;
      btnLogin.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Signing in...`;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        const profile = await getUserProfile(true);

        if (profile && !profile.isActive) {
          await signOut();
          btnLogin.disabled = false;
          btnLogin.textContent = 'Sign In';
          if (unauthorizedAlert) unauthorizedAlert.classList.remove('d-none');
          return;
        }

        const isAdmin = email.toLowerCase() === 'admin@pocika.com' || (profile && (profile.role === 'admin' || profile.role === 'super_admin'));

        if (isAdmin) {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        console.error('Email sign-in failed:', error);
        btnLogin.disabled = false;
        btnLogin.textContent = 'Sign In';

        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          showError('Invalid email or password.');
        } else if (error.code === 'auth/too-many-requests') {
          showError('Too many failed attempts. Try again later.');
        } else {
          showError(error.message || 'Login failed. Please try again.');
        }
      }
    });
  }
});
