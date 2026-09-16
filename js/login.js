import { auth, signInWithEmailAndPassword } from './auth.js';
import { qs } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = qs('#login-form');
  const btnLogin = qs('#btn-login');
  const errorAlert = qs('#login-error');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = qs('#email').value.trim();
    const password = qs('#password').value;
    
    if (!email || !password) return;
    
    // UI state
    btnLogin.disabled = true;
    btnLogin.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Signing in...`;
    errorAlert.classList.add('d-none');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // auth.js onAuthStateChanged will handle redirect
    } catch (error) {
      console.error("Login failed", error);
      btnLogin.disabled = false;
      btnLogin.textContent = 'Sign In';
      
      let errorMsg = 'Invalid email or password.';
      if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed attempts. Try again later.';
      }
      
      errorAlert.textContent = errorMsg;
      errorAlert.classList.remove('d-none');
    }
  });
});
