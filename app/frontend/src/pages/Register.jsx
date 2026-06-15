import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Notification from '../components/Notification';

const roles = [
  { value: 'user', label: 'Regular User', desc: 'Claim surplus food', purpose: 'Ideal for individuals looking to buy surplus food from local restaurants and grocers at a discount. Save money and help prevent food waste.', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 1 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z', color: '#10b981' },
  { value: 'restaurant', label: 'Food Donor', desc: 'Restaurant / Store', purpose: 'Designed for restaurants, bakeries, grocery stores, and food merchants who want to list, donate, or sell excess food to the community.', icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z', color: '#3b82f6' },
  { value: 'ngo', label: 'Local NGO', desc: 'Shelter / Kitchen', purpose: 'Intended for registered charities, community kitchens, and shelters distributing food to people and families in need.', icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z', color: '#8b5cf6' }
];

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'user' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const showNotification = (message, type) => setNotification({ message, type });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showNotification('Passwords do not match.', 'error');
      return;
    }
    if (/\s/.test(formData.password)) {
      showNotification('Password must not contain spaces.', 'error');
      return;
    }
    try {
      const { confirmPassword, ...registerPayload } = formData;
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload)
      });
      if (res.ok) {
        showNotification('Registration successful! Please log in.', 'success');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const data = await res.json();
        showNotification(data.error || 'Registration failed', 'error');
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
      minHeight: '80vh', position: 'relative', overflow: 'hidden', padding: '2rem 0'
    }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      {/* Floating orbs */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', top: '-80px', right: '-100px', animation: 'floatSlow 9s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', bottom: '-100px', left: '-80px', animation: 'floatSlow 11s ease-in-out infinite 3s', pointerEvents: 'none' }} />

      <div className="auth-card" style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 60px -15px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.6)',
        width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1,
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', border: '1px solid rgba(6,182,212,0.1)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#06b6d4" style={{width:'28px',height:'28px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif", color: '#0f172a', letterSpacing: '-0.5px' }}>Create Account</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>Join ShareMyFood and make a difference</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Full Name or Business Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange}
              style={inputStyle('name')} placeholder="John Doe / Joe's Bakery" required
              onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
          </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Confirm Password</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword || ''} onChange={handleChange}
              style={inputStyle('confirmPassword')} placeholder="••••••••" required
              onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)} />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600', marginTop: '0.1rem' }}>
                ✗ Passwords do not match
              </span>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '0.1rem' }}>
                ✓ Passwords match
              </span>
            )}
          </div>

          {/* Role Selector Cards */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>I am a...</label>
            <div className="role-selector">
              {roles.map(role => (
                <button type="button" key={role.value} onClick={() => setFormData({...formData, role: role.value})}
                  style={{
                    flex: 1, padding: '0.85rem 0.5rem', borderRadius: '0.85rem', cursor: 'pointer',
                    border: formData.role === role.value ? `2px solid ${role.color}` : '2px solid #f1f5f9',
                    backgroundColor: formData.role === role.value ? `${role.color}08` : '#f8fafc',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                    transition: 'all 0.25s', fontFamily: 'inherit'
                  }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                    stroke={formData.role === role.value ? role.color : '#94a3b8'}
                    style={{ width: '22px', height: '22px', transition: 'all 0.25s' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={role.icon} />
                  </svg>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: formData.role === role.value ? role.color : '#64748b' }}>{role.label}</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{role.desc}</span>
                </button>
              ))}
            </div>
            {(() => {
              const selectedRole = roles.find(r => r.value === formData.role);
              if (!selectedRole) return null;
              return (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.85rem',
                  backgroundColor: `${selectedRole.color}08`,
                  border: `1px solid ${selectedRole.color}25`,
                  fontSize: '0.82rem',
                  color: selectedRole.color,
                  lineHeight: '1.45',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  <span style={{ fontSize: '1rem', marginTop: '-2px' }}>ℹ️</span>
                  <span>
                    <b>{selectedRole.label} Account Purpose:</b> {selectedRole.purpose}
                  </span>
                </div>
              );
            })()}
          </div>

          <button type="submit" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            color: 'white', padding: '0.9rem', borderRadius: '0.85rem',
            fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer',
            marginTop: '0.25rem', transition: 'all 0.3s',
            boxShadow: '0 8px 20px -4px rgba(16,185,129,0.35)'
          }}>Create Account</button>
        </form>

        <p style={{ marginTop: '1.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: '#10b981', fontWeight: '700', textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
