import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Notification from '../components/Notification';

const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const showNotification = (message, type) => setNotification({ message, type });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  useEffect(() => {
    if (location.state?.message) {
      showNotification(location.state.message, 'error');
      // Clear location state message to prevent showing it again on reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('auth-change'));
        showNotification('Login successful! Redirecting...', 'success');
        setTimeout(() => navigate(from), 1500);
      } else {
        showNotification(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const inputStyle = (field) => ({
    padding: '0.85rem 1.15rem', borderRadius: '0.85rem', fontSize: '1rem',
    outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
    border: focusedField === field ? '2px solid #10b981' : '2px solid #f1f5f9',
    backgroundColor: focusedField === field ? '#ffffff' : '#f8fafc',
    transition: 'all 0.3s ease',
    boxShadow: focusedField === field ? '0 0 0 4px rgba(16,185,129,0.08)' : 'none'
  });

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '75vh', position: 'relative', overflow: 'hidden'
    }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      {/* Floating orbs */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', top: '-100px', left: '-100px', animation: 'floatSlow 8s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', bottom: '-80px', right: '-80px', animation: 'floatSlow 10s ease-in-out infinite 2s', pointerEvents: 'none' }} />

      <div className="auth-card" style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 60px -15px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.6)',
        width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1,
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', border: '1px solid rgba(16,185,129,0.1)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#10b981" style={{width:'28px',height:'28px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif", color: '#0f172a', letterSpacing: '-0.5px' }}>Welcome Back</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>Sign in to your ShareMyFood account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange}
              style={inputStyle('email')} placeholder="you@example.com" required
              onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                style={{ ...inputStyle('password'), paddingRight: '2.75rem' }} placeholder="••••••••" required
                onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0.25rem', color: '#94a3b8', transition: 'color 0.2s', zIndex: 2
                }}>
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815L21 21m-3.96-3.96A2.99 2.99 0 0 1 12 15c-1.657 0-3-1.343-3-3 0-.671.22-1.29.59-1.791m4.37 4.37 1.83 1.83" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            color: 'white', padding: '0.9rem', borderRadius: '0.85rem',
            fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer',
            marginTop: '0.5rem', transition: 'all 0.3s',
            boxShadow: '0 8px 20px -4px rgba(16,185,129,0.35)'
          }}>Log In</button>
        </form>

        <p style={{ marginTop: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: '#10b981', fontWeight: '700', textDecoration: 'none' }}>Sign up here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
