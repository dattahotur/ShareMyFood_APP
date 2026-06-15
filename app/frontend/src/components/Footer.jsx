import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '4rem 0 0',
      marginTop: 'auto',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative gradient orb */}
      <div style={{
        position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
        top: '-200px', right: '-100px', pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '3rem', marginBottom: '3rem'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🌍</span>
              </div>
              <h3 style={{
                margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: '800',
                fontSize: '1.3rem', letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>ShareMyFood</h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.7 }}>
              Reducing food waste, one delicious meal at a time. Join the movement to save food and help the planet.
            </p>
            {/* Social Icons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              {['M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z',
                'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
                'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z'].map((d, i) => (
                <div key={i} style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={d} />
                    {i === 2 && <><circle cx="4" cy="4" r="2" /><line x1="2" y1="2" x2="2" y2="2" /></>}
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Platform</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Browse Food', 'Donate Excess', 'Impact Tracking', 'For Restaurants'].map(item => (
                <li key={item} style={{ color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', transition: 'color 0.2s' }}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['About Us', 'Careers', 'Blog', 'Contact'].map(item => (
                <li key={item} style={{ color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', transition: 'color 0.2s' }}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Stay Updated</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>Get the latest on food rescue and sustainability.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="email" placeholder="your@email.com" style={{
                flex: 1, padding: '0.6rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', outline: 'none', fontFamily: 'inherit'
              }} />
              <button style={{
                padding: '0.6rem 1rem', borderRadius: '0.75rem', border: 'none',
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                color: 'white', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
              }}>Join</button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem 0',
          flexWrap: 'wrap', gap: '1rem'
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
            © {new Date().getFullYear()} ShareMyFood Platform. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
