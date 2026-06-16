import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useNavigationGuard from '../hooks/useNavigationGuard';
import VerifiedBadge from '../components/VerifiedBadge';

const API_URL = import.meta.env.VITE_API_URL;

const NGODashboard = () => {
  const navigate = useNavigate();
  useNavigationGuard();
  const [stats, setStats] = useState({ mealsRescued: 0, peopleFed: 0, wastePrevented: 0 });
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const loggedInUser = localStorage.getItem('user');
  const user = loggedInUser ? JSON.parse(loggedInUser) : {};
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    const fetchData = async () => {
      if (!loggedInUser) { navigate('/login'); return; }
      if (user.role !== 'ngo') { navigate('/'); return; }
      try {
        setLoading(true);
        const [orderRes, recipesRes, userRes] = await Promise.all([
          fetch(`${API_URL}/api/orders/user/${user.id || user._id}`),
          fetch(`${API_URL}/api/recipes`),
          fetch(`${API_URL}/api/users/${user.id || user._id}`)
        ]);
        const orders = await orderRes.json();
        const recipes = await recipesRes.json();
        const userData = await userRes.json();
        
        if (userData && !userData.error) {
          setCurrentUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        const recipeMap = {};
        recipes.forEach(r => recipeMap[r.id] = r);
        let mealsRescued = 0;
        const enriched = [];
        orders.forEach(order => {
          if (order.status !== 'reported') {
            const recipe = recipeMap[order.recipeId];
            if (recipe) { mealsRescued += order.quantity; enriched.push({ ...order, recipe }); }
          }
        });
        setStats({ mealsRescued, peopleFed: mealsRescued * 3, wastePrevented: (mealsRescued * 0.5).toFixed(1) });
        setClaims(enriched.slice(0, 5));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [navigate]);

  const handleDismissWarning = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${currentUser.id}/clear-warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const updatedUser = { ...currentUser, warnings: [] };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Failed to dismiss warning:", err);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="loader"></div></div>;

  const statCards = [
    { label: 'Meals Rescued', value: stats.mealsRescued, color: '#8b5cf6', icon: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.866 8.281 8.281 0 0 0 3 .001Z' },
    { label: 'People Fed', value: stats.peopleFed, color: '#06b6d4', icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
    { label: 'Waste Prevented', value: `${stats.wastePrevented} kg`, color: '#10b981', icon: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z' },
    { label: 'Impact Score', value: stats.mealsRescued * 15, color: '#f59e0b', icon: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z' }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0', minHeight: '80vh', animation: 'fadeIn 0.4s ease-out' }}>
      <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '1.5rem',
        padding: '2.5rem 2rem', marginTop: '1.5rem', marginBottom: '2rem',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position:'absolute', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', top:'-100px', right:'-50px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: '800', color: 'white' }}>NGO Dashboard</h1>
          {JSON.parse(localStorage.getItem('user') || '{}').verificationStatus === 'verified' && <VerifiedBadge size="24px" style={{ background: 'white', color: '#7c3aed' }} />}
        </div>
        <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }}>Track your community impact</p>
      </div>

      {/* Formal Warning Banner */}
      {currentUser?.warnings && currentUser.warnings.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.08)', 
          border: '2px solid #ef4444', 
          borderRadius: '1rem', 
          padding: '1.25rem', 
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.5px' }}>CRITICAL FORMAL WARNING</h3>
          </div>
          <p style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
            {currentUser.warnings[currentUser.warnings.length - 1].reason}
          </p>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontWeight: '500' }}>
            Sent by: {currentUser.warnings[currentUser.warnings.length - 1].adminName} on {new Date(currentUser.warnings[currentUser.warnings.length - 1].timestamp).toLocaleDateString()}
          </p>
          <button 
            onClick={handleDismissWarning} 
            style={{
              alignSelf: 'flex-end',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: '800',
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            Acknowledge & Dismiss
          </button>
        </div>
      )}

      {/* Verification CTA */}
      {(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.role === 'ngo' && user.verificationStatus !== 'verified' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.04))',
            border: '1px solid rgba(139,92,246,0.12)', borderRadius: '1.25rem', padding: '1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: 'rgba(139,92,246,0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" style={{width:'24px',height:'24px'}}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>Get Verified</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {user.verificationStatus === 'pending' ? 'Your request is being reviewed.' : 'Submit NGO documents to unlock claiming food donations.'}
                </p>
              </div>
            </div>
            {user.verificationStatus !== 'pending' && (
              <Link to="/verify-partner" style={{
                background: 'white', border: '1px solid #e2e8f0', padding: '0.6rem 1.25rem',
                borderRadius: '0.75rem', color: '#0f172a', fontWeight: '700', fontSize: '0.85rem',
                textDecoration: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
              }}>Verify →</Link>
            )}
          </div>
        );
      })()}

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {statCards.map((s, i) => (
          <div key={i} className="hover-lift" style={{
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            padding: '1.5rem', borderRadius: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)',
            animation: `fadeInUp 0.5s ease-out ${i * 0.1}s forwards`, opacity: 0
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '1rem',
              background: `linear-gradient(135deg, ${s.color}15, ${s.color}08)`,
              border: `1px solid ${s.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={s.color} style={{width:'24px',height:'24px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: "'Outfit', sans-serif", color: '#0f172a', display: 'block', lineHeight: 1.2 }}>{s.value}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Recent Claims */}
      <section>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <h2 style={{ margin:0, fontFamily:"'Outfit', sans-serif", fontSize:'1.5rem', fontWeight:'800', color:'#0f172a' }}>Recent Rescues</h2>
          <Link to="/my-orders" style={{ textDecoration:'none', background:'linear-gradient(135deg, #8b5cf6, #06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontWeight:'700', fontSize:'0.9rem' }}>View All →</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {claims.length > 0 ? claims.map((c, i) => (
            <div key={i} className="responsive-card" style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
              padding: '1.25rem', borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
              borderLeft: '3px solid #8b5cf6'
            }}>
              <div>
                <h3 style={{ margin:0, fontSize:'1rem', fontWeight:'700', color:'#0f172a' }}>{c.recipe.title}</h3>
                <span style={{ fontSize:'0.85rem', color:'#64748b' }}>{c.recipe.restaurant} · Qty: {c.quantity}</span>
              </div>
              <div className="responsive-card-right">
                <span style={{
                  padding:'0.25rem 0.65rem', borderRadius:'9999px', fontSize:'0.73rem', fontWeight:'700', textTransform:'uppercase',
                  display: 'inline-block',
                  ...(c.status === 'approved' || c.status === 'completed' ? { background:'#dcfce7', color:'#15803d' } : { background:'#fef3c7', color:'#d97706' })
                }}>{c.status === 'pending' ? 'Reserved' : c.status}</span>
              </div>
            </div>
          )) : (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', margin: 0 }}>No rescues yet. Browse available food to start making an impact!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const backBtnStyle = { display:'flex', alignItems:'center', gap:'0.5rem', color:'#64748b', fontWeight:'700', fontSize:'0.88rem', padding:'0.55rem 1.15rem', borderRadius:'9999px', background:'rgba(255,255,255,0.9)', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', cursor:'pointer', backdropFilter:'blur(8px)', fontFamily:'inherit' };

export default NGODashboard;
