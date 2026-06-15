import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

const Navbar = () => {
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthChange = () => setUser(localStorage.getItem('user'));
    handleAuthChange();
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = 'unset'; }
    return () => { document.body.style.overflow = 'unset'; };
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    setMenuOpen(false);
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);
  const isActive = (path) => location.pathname === path;

  const NavIcon = ({ d }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  const parsed = user ? JSON.parse(user) : null;

  return (
    <>
      <nav style={{
        padding: '0.75rem 0',
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.04)' : 'none'
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto', padding: '0 2rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          {/* Logo */}
          <Link to="/" style={{
            fontSize: '1.35rem', fontWeight: '800', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            textDecoration: 'none', letterSpacing: '-0.5px',
            fontFamily: "'Outfit', sans-serif"
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(16,185,129,0.15)',
              overflow: 'hidden', transition: 'all 0.3s'
            }}>
              <img src="/favicon.png" alt="Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
            </div>
            <span className="hide-mobile">ShareMyFood</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <NavLink to="/" label="Home" active={isActive('/')} icon="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            {parsed && parsed.role !== 'ngo' && (
              <>
                <NavLink to="/add-food" label="Donate" active={isActive('/add-food')} icon="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                <NavLink to="/manage-donations" label="Manage" active={isActive('/manage-donations')} icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </>
            )}
            {parsed && (
              <>
                {parsed.role !== 'restaurant' && (
                  <NavLink to="/my-orders" label="My Orders" active={isActive('/my-orders')}
                    icon="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                )}
                <NavLink to={parsed.role === 'ngo' ? "/ngo-dashboard" : "/dashboard"}
                  label={<span>{parsed.role === 'ngo' ? "NGO" : "Dashboard"}{parsed.verificationStatus === 'verified' && <VerifiedBadge size="14px" />}</span>} 
                  active={isActive('/dashboard') || isActive('/ngo-dashboard')}
                  icon="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </>
            )}
          </div>

          {/* Right side: Auth + Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!user && (
              <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link to="/login" style={{
                  padding: '0.55rem 1.25rem', borderRadius: '0.75rem',
                  color: '#334155', fontWeight: '600', fontSize: '0.9rem',
                  textDecoration: 'none', transition: 'all 0.2s'
                }}>Log in</Link>
                <Link to="/register" style={{
                  padding: '0.55rem 1.25rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                  color: 'white', fontWeight: '700', fontSize: '0.9rem',
                  textDecoration: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                  transition: 'all 0.2s'
                }}>Sign up</Link>
              </div>
            )}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
                <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {parsed?.role === 'admin' && (
                    <Link to="/admin" style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.5rem 1rem', borderRadius: '0.75rem',
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))',
                      color: '#7c3aed', fontWeight: '700', fontSize: '0.85rem',
                      textDecoration: 'none', border: '1px solid rgba(139,92,246,0.15)'
                    }}>
                      <NavIcon d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 1rem', borderRadius: '0.75rem',
                    background: 'none', border: '1px solid #e2e8f0',
                    color: '#64748b', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer'
                  }}>
                    <NavIcon d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    Logout
                  </button>
                </div>
              </div>
            )}

            {/* Hamburger - mobile */}
            <button
              className="hide-desktop"
              onClick={() => setMenuOpen(true)}
              style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', cursor: 'pointer'
              }}
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#334155" style={{ width: '22px', height: '22px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {menuOpen && (
        <div onClick={closeMenu} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(8px)', zIndex: 9998
        }} />
      )}

      {/* Mobile Side Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        zIndex: 9999,
        boxShadow: menuOpen ? '-12px 0 40px rgba(0,0,0,0.12)' : 'none',
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto'
      }}>
        {/* Panel Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.04)'
        }}>
          <span style={{
            fontSize: '1.1rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif",
            background: 'linear-gradient(135deg, #0f172a, #334155)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Menu</span>
          <button onClick={closeMenu} style={{
            background: 'rgba(241,245,249,0.8)', border: 'none', cursor: 'pointer',
            width: '32px', height: '32px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile Links */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', gap: '0.25rem' }}>
          <MobileLink to="/" onClick={closeMenu} label="Home" icon="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />

          {parsed && parsed.role !== 'ngo' && (
            <MobileLink to="/add-food" onClick={closeMenu} label="Donate" icon="M12 4.5v15m7.5-7.5h-15" />
          )}

          {user && (
            <>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', margin: '0.5rem 1rem' }} />
              {parsed?.role !== 'restaurant' && (
                <MobileLink to="/my-orders" onClick={closeMenu} label="My Orders" icon="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              )}
              {parsed?.role !== 'ngo' && (
                <MobileLink to="/manage-donations" onClick={closeMenu} label="Manage Donations" icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              )}
              <MobileLink to={parsed?.role === 'ngo' ? "/ngo-dashboard" : "/dashboard"} onClick={closeMenu} 
                label={<span>{parsed?.role === 'ngo' ? "NGO Dashboard" : "Dashboard"}{parsed?.verificationStatus === 'verified' && <VerifiedBadge size="14px" />}</span>} 
                icon="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />

              {parsed?.role === 'admin' && (
                <MobileLink to="/admin" onClick={closeMenu} label="Admin Portal" accent icon="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              )}

              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', margin: '0.5rem 1rem' }} />
              <button onClick={handleLogout} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem', borderRadius: '0.75rem',
                background: 'rgba(239,68,68,0.05)', border: 'none', color: '#ef4444',
                fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer',
                width: '100%', textAlign: 'left', fontFamily: 'inherit'
              }}>
                <NavIcon d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                Log out
              </button>
            </>
          )}

          {!user && (
            <>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', margin: '0.5rem 1rem' }} />
              <MobileLink to="/login" onClick={closeMenu} label="Log in" icon="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              <Link to="/register" onClick={closeMenu} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.85rem 1rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                color: 'white', fontWeight: '700', fontSize: '0.95rem',
                textDecoration: 'none', margin: '0 0.25rem',
                boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
              }}>
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
};

/* Desktop Nav Link */
const NavLink = ({ to, label, active, icon, dot, onClick }) => (
  <Link to={to} onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.5rem 0.85rem', borderRadius: '0.75rem',
    textDecoration: 'none', fontWeight: '600', fontSize: '0.88rem',
    color: active ? '#10b981' : '#475569',
    backgroundColor: active ? 'rgba(16,185,129,0.08)' : 'transparent',
    transition: 'all 0.2s', position: 'relative'
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
    </svg>
    {label}
    {dot && <span style={dotStyle} />}
  </Link>
);

/* Mobile Menu Link */
const MobileLink = ({ to, onClick, label, icon, dot, accent }) => (
  <Link to={to} onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.85rem 1rem', borderRadius: '0.75rem',
    textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem',
    color: accent ? '#7c3aed' : '#334155',
    backgroundColor: accent ? 'rgba(139,92,246,0.06)' : 'transparent',
    transition: 'background-color 0.15s', position: 'relative'
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
      style={{ width: '20px', height: '20px', color: accent ? '#7c3aed' : '#64748b', flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
    </svg>
    {label}
    {dot && <div style={{ position: 'absolute', right: '1rem', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white' }} />}
  </Link>
);

const dotStyle = {
  position: 'absolute', top: '6px', right: '6px',
  width: '8px', height: '8px', backgroundColor: '#ef4444',
  borderRadius: '50%', border: '2px solid white',
  animation: 'pulse 2s infinite'
};

export default Navbar;
