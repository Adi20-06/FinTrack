import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // State for form fields
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Called on every keystroke — updates the right field
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();  // Stop page from refreshing (default form behaviour)
    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);  // Save to context + localStorage
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/');  // Go to dashboard

    } catch (err) {
  // 429 = rate limit hit
  if (err.response?.status === 429) {
    toast.error('Too many login attempts. Please wait 15 minutes and try again.', {
      duration: 6000,  // show for 6 seconds
      icon: '🔒',
    });
  } else {
    toast.error(err.response?.data?.message || 'Login failed.');
  }
} finally {
  setLoading(false);
}
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Fin<span>Track</span></div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-sub">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button className="btn primary" style={{width:'100%',textAlign: 'center', alignItems: 'center',
    justifyContent: 'center',padding:'10px'}} disabled={loading}>
            {loading ? 'Signing in...' :'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;  