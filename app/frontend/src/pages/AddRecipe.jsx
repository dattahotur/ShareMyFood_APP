import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from '../components/Notification';
import useNavigationGuard from '../hooks/useNavigationGuard';

const AddRecipe = () => {
  useNavigationGuard();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [formData, setFormData] = useState({
    title: '', restaurant: user.name || '', price: '', originalPrice: '',
    discountPrice: '', quantity: '', expiryHours: '',
    image: '', address: '', ngoOnly: false, ngoPreferred: false,
    category: '', description: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [preview, setPreview] = useState('');

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: val });
    if (e.target.name === 'ngoOnly' && e.target.checked) setFormData(prev => ({ ...prev, ngoOnly: true, ngoPreferred: false }));
    if (e.target.name === 'ngoPreferred' && e.target.checked) setFormData(prev => ({ ...prev, ngoPreferred: true, ngoOnly: false }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData(prev => ({ ...prev, image: reader.result })); setPreview(reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isRestaurant = user.role === 'restaurant';
    const isNGO = user.role === 'ngo';
    const isVerified = user.verificationStatus === 'verified';

    if (isNGO) {
      setNotification({ message: 'NGO accounts are restricted to claiming food, not donating.', type: 'error' });
      return;
    }

    if (isRestaurant && !isVerified) {
      setNotification({ message: 'Restaurant accounts must be verified to list food donations.', type: 'error' });
      return;
    }

    if (!user.role || (user.role !== 'restaurant' && user.role !== 'admin' && user.role !== 'user')) {
      setNotification({ message: 'Invalid user role for donation.', type: 'error' });
      return;
    }

    if (!formData.category) {
      setNotification({ message: 'Please select a food category.', type: 'error' });
      return;
    }
    const expiryTimestamp = formData.expiryHours ? Date.now() + parseFloat(formData.expiryHours) * 60 * 60 * 1000 : null;
    const allowedRoles = formData.ngoOnly ? ['ngo'] : undefined;
    
    // Auto-generate "availableUntil" text representation from the expiry timestamp
    let availableUntil = '';
    if (expiryTimestamp) {
      availableUntil = new Date(expiryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    try {
      const res = await fetch('/api/recipes/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, 
          availableUntil,
          restaurantId: user.id || user._id,
          donorId: user.id || user._id,
          donorRole: user.role,
          donorVerified: user.verificationStatus === 'verified',
          expiryTimestamp, allowedRoles, isNGOPreferred: formData.ngoPreferred
        })
      });
      if (res.ok) {
        setNotification({ message: 'Listing created! Redirecting...', type: 'success' });
        setTimeout(() => navigate('/'), 2000);
      } else { setNotification({ message: 'Failed to create listing.', type: 'error' }); }
    } catch { setNotification({ message: 'Network error.', type: 'error' }); }
  };

  const inputStyle = (field) => ({
    padding: '0.8rem 1rem', borderRadius: '0.85rem', fontSize: '0.95rem',
    outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
    border: focusedField === field ? '2px solid #10b981' : '2px solid #f1f5f9',
    backgroundColor: focusedField === field ? '#ffffff' : '#f8fafc',
    transition: 'all 0.3s ease',
    boxShadow: focusedField === field ? '0 0 0 4px rgba(16,185,129,0.08)' : 'none'
  });

  const isRestaurant = user.role === 'restaurant';
  const isNGO = user.role === 'ngo';
  const isVerified = user.verificationStatus === 'verified';

  if (isNGO) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2.5rem', background: 'white', borderRadius: '1.5rem', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ef4444" style={{width:'22px',height:'22px'}}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h2 style={{ color: '#b91c1c', fontWeight: '800', margin: '0 0 0.5rem' }}>Access Restricted</h2>
        <p style={{ color: '#ef4444', margin: '0 0 1.5rem' }}>NGO accounts are restricted to ordering/claiming food, not listing food donations.</p>
        <button onClick={() => navigate('/')} style={{ padding: '0.6rem 1.25rem', borderRadius: '0.85rem', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Go Home</button>
      </div>
    );
  }

  if (isRestaurant && !isVerified) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2.5rem', background: 'white', borderRadius: '1.5rem', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#7c3aed" style={{width:'22px',height:'22px'}}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h2 style={{ color: '#6d28d9', fontWeight: '800', margin: '0 0 0.5rem' }}>Verification Required</h2>
        <p style={{ color: '#8b5cf6', margin: '0 0 1.5rem' }}>Restaurant accounts must be verified to list food donations.</p>
        <button onClick={() => navigate('/verify-partner')} style={{ padding: '0.6rem 1.25rem', borderRadius: '0.85rem', border: 'none', background: '#7c3aed', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Get Verified Now</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1rem 0', animation: 'fadeIn 0.4s ease-out' }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>

      <div style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        padding: '2.5rem', borderRadius: '1.5rem', marginTop: '1.5rem',
        boxShadow: '0 20px 60px -15px rgba(0,0,0,0.06)',
        border: '1px solid rgba(255,255,255,0.6)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(16,185,129,0.1)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#10b981" style={{width:'28px',height:'28px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>Add Food Listing</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>Share your excess food with the community</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Photo Upload */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Photo</label>
            <div style={{
              border: dragActive ? '2px dashed #10b981' : '2px dashed #cbd5e1',
              borderRadius: '1rem', padding: preview ? '0.5rem' : '2.5rem', textAlign: 'center',
              background: dragActive ? 'rgba(16,185,129,0.04)' : 'rgba(248,250,252,0.6)',
              cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden'
            }}
              onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setDragActive(false); handleImageChange({ target: { files: e.dataTransfer.files } }); }}
              onClick={() => document.getElementById('file-input').click()}>
              {preview ? (
                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '0.75rem' }} />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#94a3b8" style={{width:'36px',height:'36px',margin:'0 auto 0.75rem',display:'block'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Drag & drop or <span style={{ color: '#10b981', fontWeight: '700' }}>browse</span></p>
                </>
              )}
              <input id="file-input" type="file" style={{ display: 'none' }} accept="image/*" onChange={handleImageChange} />
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Food Title</label>
              <input name="title" value={formData.title} onChange={handleChange} style={inputStyle('title')} placeholder="e.g. Fresh Bagels" required onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.2rem' }}>Category</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['Bakery', 'Meals', 'Groceries', 'Vegan'].map(cat => (
                  <button type="button" key={cat} onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                    style={{
                      padding: '0.6rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '700',
                      cursor: 'pointer', transition: 'all 0.25s', fontFamily: 'inherit',
                      ...(formData.category === cat
                        ? { background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', border: '1px solid transparent', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }
                        : { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' })
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Original Price (₹)</label>
              <input name="originalPrice" type="number" value={formData.originalPrice} onChange={handleChange} style={inputStyle('originalPrice')} placeholder="100" onFocus={() => setFocusedField('originalPrice')} onBlur={() => setFocusedField(null)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Discount Price (₹)</label>
              <input name="discountPrice" type="number" value={formData.discountPrice} onChange={handleChange} style={inputStyle('discountPrice')} placeholder="50" required onFocus={() => setFocusedField('discountPrice')} onBlur={() => setFocusedField(null)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Quantity</label>
              <input name="quantity" type="number" value={formData.quantity} onChange={handleChange} style={inputStyle('quantity')} placeholder="10" required onFocus={() => setFocusedField('quantity')} onBlur={() => setFocusedField(null)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Expiry (hours)</label>
              <input name="expiryHours" type="number" step="0.5" value={formData.expiryHours} onChange={handleChange} style={inputStyle('expiryHours')} placeholder="4" required onFocus={() => setFocusedField('expiryHours')} onBlur={() => setFocusedField(null)} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} style={{ ...inputStyle('description'), minHeight: '80px', resize: 'vertical' }} placeholder="e.g. Contains wheat and dairy. Baked fresh this morning. Bring a bag for pickup." onFocus={() => setFocusedField('description')} onBlur={() => setFocusedField(null)} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Pickup Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} style={{ ...inputStyle('address'), minHeight: '80px', resize: 'vertical' }} placeholder="e.g. 123 Green Street, Flat 4B, Near Central Park" required onFocus={() => setFocusedField('address')} onBlur={() => setFocusedField(null)} />
            </div>
          </div>

          {/* NGO Options */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { name: 'ngoOnly', label: 'NGO Only', desc: 'Restrict to NGOs', color: '#8b5cf6' },
              { name: 'ngoPreferred', label: 'NGO Preferred', desc: 'Visible to all', color: '#06b6d4' }
            ].map(opt => (
              <label key={opt.name} style={{
                flex: '1 1 45%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem', borderRadius: '0.85rem', cursor: 'pointer',
                border: formData[opt.name] ? `2px solid ${opt.color}` : '2px solid #f1f5f9',
                background: formData[opt.name] ? `${opt.color}06` : 'transparent',
                transition: 'all 0.25s'
              }}>
                <input type="checkbox" name={opt.name} checked={formData[opt.name]} onChange={handleChange}
                  style={{ display: 'none' }} />
                <div style={{
                  width: '24px', height: '24px', borderRadius: '8px', flexShrink: 0,
                  border: formData[opt.name] ? `2px solid ${opt.color}` : '2px solid #cbd5e1',
                  background: formData[opt.name] ? opt.color : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s'
                }}>
                  {formData[opt.name] && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>}
                </div>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <button type="submit" style={{
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            color: 'white', padding: '0.9rem', borderRadius: '0.85rem',
            fontWeight: '700', fontSize: '1.05rem', border: 'none', cursor: 'pointer',
            marginTop: '0.5rem', fontFamily: 'inherit',
            boxShadow: '0 8px 20px -4px rgba(16,185,129,0.35)'
          }}>Publish Listing</button>
        </form>
      </div>
    </div>
  );
};

const backBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  color: '#64748b', fontWeight: '700', fontSize: '0.88rem',
  padding: '0.55rem 1.15rem', borderRadius: '9999px',
  background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.04)', cursor: 'pointer',
  backdropFilter: 'blur(8px)', fontFamily: 'inherit'
};

export default AddRecipe;
