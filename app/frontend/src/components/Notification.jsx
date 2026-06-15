import React, { useEffect, useState } from 'react';

const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '22px', height: '22px'}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '22px', height: '22px'}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '22px', height: '22px'}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);

const Notification = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isVisible && message) {
      const timer = setTimeout(onClose, 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, message, onClose]);

  if (!message) return null;

  const colors = {
    success: { bg: 'rgba(16,185,129,0.06)', border: '#10b981', icon: '#10b981' },
    error: { bg: 'rgba(239,68,68,0.06)', border: '#ef4444', icon: '#ef4444' },
    info: { bg: 'rgba(59,130,246,0.06)', border: '#3b82f6', icon: '#3b82f6' }
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed', top: '24px', right: '24px', zIndex: 99999,
      padding: '0.85rem 1.25rem', borderRadius: '1.25rem',
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(24px) saturate(200%)',
      WebkitBackdropFilter: 'blur(24px) saturate(200%)',
      border: '1px solid rgba(255,255,255,0.6)',
      boxShadow: `0 24px 48px -12px rgba(0,0,0,0.14), 0 0 0 1px ${c.bg}`,
      transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)',
      display: 'flex', alignItems: 'center', gap: '0.85rem',
      maxWidth: '400px', minWidth: '300px'
    }}>
      <div style={{
        color: c.icon, display: 'flex', alignItems: 'center',
        width: '42px', height: '42px', borderRadius: '14px',
        backgroundColor: c.bg, justifyContent: 'center', flexShrink: 0
      }}>
        {type === 'success' ? <SuccessIcon /> : type === 'error' ? <ErrorIcon /> : <InfoIcon />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>
          {type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.83rem', fontWeight: '500', color: '#64748b', lineHeight: 1.4 }}>
          {message}
        </p>
      </div>
      <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} style={{
        background: 'rgba(0,0,0,0.04)', border: 'none', color: '#94a3b8', cursor: 'pointer',
        width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginLeft: '0.5rem', flexShrink: 0, transition: 'all 0.2s'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Progress Bar Animation */}
      <div style={{
        position: 'absolute', bottom: 0, left: '1.25rem', right: '1.25rem', height: '3px',
        background: 'rgba(0,0,0,0.03)', borderRadius: '10px', overflow: 'hidden'
      }}>
        <div style={{
          height: '100%', width: isVisible ? '0%' : '100%',
          background: c.border, transition: 'width 3.5s linear', borderRadius: '10px'
        }} />
      </div>
    </div>
  );
};

export default Notification;
