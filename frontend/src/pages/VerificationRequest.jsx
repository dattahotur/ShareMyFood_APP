import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from '../components/Notification';
import useNavigationGuard from '../hooks/useNavigationGuard';

const API_URL = import.meta.env.VITE_API_URL;

const VerificationRequest = () => {
  const navigate = useNavigate();
  useNavigationGuard();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [verificationPhoto, setVerificationPhoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [focusedField, setFocusedField] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setNotification({ message: 'File too large (max 2MB)', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setVerificationPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verificationPhoto) { setNotification({ message: 'Please upload a photo of your documents.', type: 'error' }); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/users/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id || user._id, 
          documents: [{ name: 'Verification Photo', url: verificationPhoto }] 
        })
      });
      if (res.ok) {
        const updatedUser = { ...user, verificationStatus: 'pending' };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('auth-change'));
        setNotification({ message: 'Request submitted! Our team will review it soon.', type: 'success' });
        setTimeout(() => navigate('/dashboard'), 2000);
      } else { setNotification({ message: 'Failed to submit request.', type: 'error' }); }
    } catch { setNotification({ message: 'Network error.', type: 'error' }); }
    finally { setIsSubmitting(false); }
  };

  const isEligible = user.role === 'restaurant' || user.role === 'ngo';
  const isPending = user.verificationStatus === 'pending';
  const isVerified = user.verificationStatus === 'verified';

  if (!isEligible) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ef4444" style={{width:'32px',height:'32px'}}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", color: '#0f172a', margin: '0 0 0.5rem' }}>Not Available</h2>
        <p style={{ color: '#64748b' }}>Verification is available for Food Donors and NGOs only.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '1.5rem', padding: '0.7rem 1.5rem', borderRadius: '0.85rem', border: 'none', background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Go Home</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem 0', minHeight: '70vh', animation: 'fadeIn 0.4s ease-out' }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>

      <div style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        padding: '2.5rem', borderRadius: '1.5rem', marginTop: '1.5rem',
        boxShadow: '0 20px 60px -15px rgba(0,0,0,0.06)',
        border: '1px solid rgba(255,255,255,0.6)'
      }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3].map((step) => {
            const currentStep = isVerified ? 3 : isPending ? 2 : 1;
            const isComplete = step <= currentStep;
            const isActive = step === currentStep;
            return (
              <React.Fragment key={step}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.3s',
                  ...(isComplete
                    ? { background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }
                    : { background: '#f1f5f9', color: '#94a3b8', border: '2px solid #e2e8f0' }),
                  ...(isActive && !isComplete ? { background: '#f1f5f9', color: '#10b981', border: '2px solid #10b981' } : {})
                }}>
                  {isComplete && step < currentStep ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : step}
                </div>
                {step < 3 && (
                  <div style={{ width: '60px', height: '2px', borderRadius: '1px', background: step < currentStep ? 'linear-gradient(90deg, #10b981, #06b6d4)' : '#e2e8f0', transition: 'all 0.3s' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.25rem', marginBottom: '2rem' }}>
          {['Submit', 'Review', 'Verified'].map((label, i) => (
            <span key={i} style={{ fontSize: '0.73rem', fontWeight: '600', color: '#64748b', textAlign: 'center' }}>{label}</span>
          ))}
        </div>

        {isVerified ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", color: '#0f172a', margin: '0 0 0.5rem' }}>You're Verified!</h2>
            <p style={{ color: '#64748b', maxWidth: '320px', margin: '0 auto' }}>Your account is verified. The trust badge is now visible on all your listings.</p>
          </div>
        ) : isPending ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid rgba(245,158,11,0.2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#f59e0b" style={{width:'36px',height:'36px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", color: '#0f172a', margin: '0 0 0.5rem' }}>Under Review</h2>
            <p style={{ color: '#64748b', maxWidth: '320px', margin: '0 auto' }}>Your verification documents are being reviewed. We'll notify you once the process is complete.</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(16,185,129,0.1)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#10b981" style={{width:'28px',height:'28px'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem' }}>Get Verified</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Submit your business or organization documents to earn the trust badge.</p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>Upload Document Photo</label>
                <div style={{ position: 'relative' }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} required
                    style={{
                      padding: '0.85rem 1.15rem', borderRadius: '0.85rem', fontSize: '1rem',
                      outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
                      border: focusedField === 'photo' ? '2px solid #10b981' : '2px solid #f1f5f9',
                      backgroundColor: focusedField === 'photo' ? '#ffffff' : '#f8fafc',
                      transition: 'all 0.3s ease', cursor: 'pointer',
                      boxShadow: focusedField === 'photo' ? '0 0 0 4px rgba(16,185,129,0.08)' : 'none'
                    }}
                    onFocus={() => setFocusedField('photo')} onBlur={() => setFocusedField(null)} />
                </div>
                {verificationPhoto && (
                  <div style={{ marginTop: '1rem', borderRadius: '0.85rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={verificationPhoto} alt="Upload Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                  </div>
                )}
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>Upload a photo of your business license, registration, or ID document.</p>
              </div>
              <button type="submit" disabled={isSubmitting} style={{
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                color: 'white', padding: '0.9rem', borderRadius: '0.85rem',
                fontWeight: '700', fontSize: '1.05rem', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: '0 8px 20px -4px rgba(16,185,129,0.35)',
                opacity: isSubmitting ? 0.7 : 1
              }}>{isSubmitting ? 'Uploading...' : 'Submit for Verification'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const backBtnStyle = { display:'flex', alignItems:'center', gap:'0.5rem', color:'#64748b', fontWeight:'700', fontSize:'0.88rem', padding:'0.55rem 1.15rem', borderRadius:'9999px', background:'rgba(255,255,255,0.9)', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', cursor:'pointer', backdropFilter:'blur(8px)', fontFamily:'inherit' };

export default VerificationRequest;
