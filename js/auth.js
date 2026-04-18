// auth.js
window.API_BASE_URL = 'https://guestcare.onrender.com/api';

const AuthService = {
  setSession(token, user) {
    localStorage.setItem('gcc_token', token);
    localStorage.setItem('gcc_user', JSON.stringify(user));
    localStorage.setItem('gcc_auth', 'true');
  },

  getToken() {
    return localStorage.getItem('gcc_token');
  },

  getUser() {
    const userStr = localStorage.getItem('gcc_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  logout() {
    localStorage.removeItem('gcc_token');
    localStorage.removeItem('gcc_user');
    localStorage.removeItem('gcc_auth');
    window.location.reload();
  },

  async login(email, password) {
    const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    this.setSession(data.token, {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role
    });
    return data;
  },

  async register(userData) {
    const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    return data;
  },

  async fetchWithAuth(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const response = await fetch(`${window.API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired');
    }

    return response;
  }
};

window.AuthService = AuthService;