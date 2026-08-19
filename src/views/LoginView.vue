<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authState } from '../store/auth';

const router = useRouter();
const email = ref('');
const password = ref('');

const handleLogin = (e) => {
  e.preventDefault();
  if (email.value === 'thesoundsproject@gmail.com' && password.value === '12345678') {
    authState.login();
    router.push('/profile');
  } else {
    alert('Email atau password salah!');
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Centered Brand Logo -->
      <div class="logo-wrapper">
        <img src="/AJAKLogo/LOGO.png" alt="AJAK! Logo" class="brand-logo" />
      </div>

      <!-- Title -->
      <h2 class="login-title">Login to your Account</h2>

      <!-- Form -->
      <form @submit="handleLogin" class="login-form">
        <div class="form-group">
          <input 
            type="email" 
            v-model="email" 
            class="form-input" 
            placeholder="Email" 
            required 
          />
        </div>
        
        <div class="form-group">
          <input 
            type="password" 
            v-model="password" 
            class="form-input" 
            placeholder="Password" 
            required 
          />
        </div>

        <button type="submit" class="btn-signin">
          Sign in
        </button>
      </form>

      <!-- Social Login divider -->
      <div class="social-divider">
        <span>- Or sign in with -</span>
      </div>

      <!-- Social Login buttons -->
      <div class="social-buttons">
        <button type="button" class="social-btn">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.186 4.114-3.328 0-6.026-2.698-6.026-6.026s2.698-6.026 6.026-6.026c1.554 0 2.96.592 4.026 1.562l3.078-3.078C18.966 2.87 15.822 1.5 12.24 1.5c-5.799 0-10.5 4.701-10.5 10.5s4.701 10.5 10.5 10.5c6.07 0 10.74-4.269 10.74-10.5 0-.586-.05-1.163-.146-1.715H12.24z"/>
          </svg>
        </button>
        <button type="button" class="social-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </button>
        <button type="button" class="social-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#1DA1F2">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        </button>
      </div>

      <!-- Footer -->
      <div class="login-footer">
        <p>Don't have an account? <router-link to="/coming-soon" class="signup-link">Sign up</router-link></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  background-color: #fafafa;
}

.login-container {
  background: #ffffff;
  padding: 28px 20px;
  border-radius: 16px;
  width: 100%;
  max-width: 320px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.logo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 44px;
}

.brand-logo {
  height: 38px;
  width: auto;
  object-fit: contain;
}

.login-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  text-align: left;
  text-transform: none !important;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  width: 100%;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 400 !important;
  text-transform: none !important;
  background-color: #ffffff;
  color: #2c3e50;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.01), 0 1px 4px rgba(0, 0, 0, 0.01);
  transition: all 0.25s ease;
}

.form-input::placeholder {
  color: #b0b5bc;
}

.form-input:focus {
  outline: none;
  border-color: rgba(201, 76, 76, 0.3);
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.08), 0 1px 4px rgba(0, 0, 0, 0.01);
}

.btn-signin {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background-color: var(--primary);
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 500 !important;
  text-transform: none !important;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(201, 76, 76, 0.2);
  transition: all 0.25s ease;
  margin-top: 4px;
}

.btn-signin:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(201, 76, 76, 0.3);
}

.btn-signin:active {
  transform: translateY(1px);
}

.social-divider {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px 0 12px;
  font-size: 0.75rem;
  color: #a0a5ad;
  font-weight: 400;
  text-transform: none !important;
}

.social-buttons {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.social-btn {
  flex: 1;
  height: 40px;
  background: #ffffff;
  border: 1px solid #f2f2f2;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);
  transition: all 0.25s ease;
  padding: 0;
}

.social-btn:hover {
  background: #fafafa;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
}

.social-btn:active {
  transform: translateY(0.5px);
}

.login-footer {
  text-align: center;
  font-size: 0.8rem;
  color: #7f8c8d;
  text-transform: none !important;
}

.signup-link {
  color: var(--primary);
  font-weight: 500 !important;
  text-decoration: none;
  text-transform: none !important;
}

.signup-link:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-page {
    padding: 20px 16px;
    background-color: #ffffff;
  }

  .login-container {
    box-shadow: none;
    padding: 16px 8px;
  }
}
</style>
