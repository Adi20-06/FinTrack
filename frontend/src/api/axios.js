// axios is like a "fetch helper" — it makes HTTP requests easier
import axios from 'axios';

// Create a custom axios instance with our backend URL pre-configured
// So instead of typing the full URL every time, we just use "api.get('/transactions')"
const api = axios.create({
  baseURL: 'http://localhost:5000/api',  // Our backend address
});

// INTERCEPTOR — runs automatically before EVERY request we send
// Think of it like a post office worker who stamps every letter before sending
api.interceptors.request.use((config) => {

  // Get the login token from localStorage
  // localStorage = browser's mini storage (persists even after refresh)
  const token = localStorage.getItem('token');

  // If a token exists, attach it to the request headers
  // This is how the backend knows WHO is making the request
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;  // Send the request
});

export default api;