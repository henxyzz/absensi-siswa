let currentRole = 'admin';

const roleTabs = document.querySelectorAll('.role-tab');
const identifierLabel = document.getElementById('identifierLabel');
const identifierInput = document.getElementById('identifier');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

function updateLoginForm(role) {
  currentRole = role;
  roleTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.role === role);
  });

  switch (role) {
    case 'admin':
      identifierLabel.textContent = 'Username';
      identifierInput.placeholder = 'Masukkan username';
      break;
    case 'teacher':
      identifierLabel.textContent = 'NIP';
      identifierInput.placeholder = 'Masukkan NIP';
      break;
    case 'student':
      identifierLabel.textContent = 'NIS';
      identifierInput.placeholder = 'Masukkan NIS';
      break;
  }
}

roleTabs.forEach(tab => {
  tab.addEventListener('click', () => updateLoginForm(tab.dataset.role));
});

const urlParams = new URLSearchParams(window.location.search);
const roleParam = urlParams.get('role');
if (roleParam && ['admin', 'teacher', 'student'].includes(roleParam)) {
  updateLoginForm(roleParam);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const identifier = identifierInput.value.trim();
  const password = document.getElementById('password').value;

  if (!identifier || !password) {
    showError('Semua field wajib diisi');
    return;
  }

  try {
    let endpoint = '';
    let body = {};

    switch (currentRole) {
      case 'admin':
        endpoint = '/api/auth/admin/login';
        body = { username: identifier, password };
        break;
      case 'teacher':
        endpoint = '/api/auth/teacher/login';
        body = { nip: identifier, password };
        break;
      case 'student':
        endpoint = '/api/auth/student/login';
        body = { nis: identifier, password };
        break;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('userType', currentRole);
      window.location.href = '/dashboard';
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('Terjadi kesalahan, coba lagi nanti');
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

if (localStorage.getItem('token')) {
  window.location.href = '/dashboard';
}
