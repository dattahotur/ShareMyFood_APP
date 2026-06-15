import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Notification from '../components/Notification';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [focusedField, setFocusedField] = useState(null);

  const showNotification = (message, type) => setNotification({ message, type });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/login', {
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
            <input type="password" name="password" value={formData.password} onChange={handleChange}
              style={inputStyle('password')} placeholder="••••••••" required
              onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
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
