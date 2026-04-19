import { apiRequest } from './api.js';

const form = document.getElementById('loginForm');
const feedback = document.getElementById('loginFeedback');
const button = document.getElementById('loginButton');

try {
  const user = await apiRequest('/api/auth/me');
  window.location.href = user.role === 'supplier' ? '/supplier' : '/dashboard';
} catch (error) {
  if (error.status !== 401) {
    feedback.textContent = error.message;
    feedback.className = 'feedback-line error';
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  feedback.textContent = 'Autenticando...';
  feedback.className = 'feedback-line';

  const formData = new FormData(form);

  try {
    const user = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: formData.get('email'),
        password: formData.get('password')
      }
    });

    feedback.textContent = 'Login realizado com sucesso.';
    feedback.className = 'feedback-line success';
    window.location.href = user.role === 'supplier' ? '/supplier' : '/dashboard';
  } catch (error) {
    feedback.textContent = error.message;
    feedback.className = 'feedback-line error';
  } finally {
    button.disabled = false;
  }
});
