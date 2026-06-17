import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import VerifiedBadge from '../components/VerifiedBadge';

const API_URL = import.meta.env.VITE_API_URL;

const Home = () => {
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Bakery', 'Meals', 'Groceries', 'Vegan'];

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/recipes`);
        if (res.ok) { const data = await res.json(); setRecipes(data); }
      } catch (error) { console.error("Failed to fetch recipes", error); }
    };
    fetchRecipes();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* ═══════ HERO ═══════ */}
      <header className="hero-header">
        {/* Background orbs */}
        <div style={{ position:'absolute', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', top:'-150px', left:'-100px', animation:'floatSlow 10s ease-in-out infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', bottom:'-100px', right:'-80px', animation:'floatSlow 12s ease-in-out infinite 3s', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', top:'40%', right:'30%', animation:'floatSlow 8s ease-in-out infinite 1s', pointerEvents:'none' }} />

        <div style={{ textAlign: 'center', maxWidth: '800px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))',
            border: '1px solid rgba(16,185,129,0.2)',
            color: '#34d399', padding: '0.5rem 1.25rem', borderRadius: '9999px',
            fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px',
            animation: 'fadeInDown 0.6s ease-out'
          }}>🌿 Eco-friendly choices</span>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontWeight: '900', margin: 0, lineHeight: 1.05, letterSpacing: '-2px',
            animation: 'textReveal 0.8s ease-out 0.2s forwards', opacity: 0
          }}>
            <span style={{ color: '#ffffff' }}>Rescue Food,</span><br/>
            <span style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Share Joy</span>
          </h1>

          <p style={{
            fontSize: '1.15rem', color: '#94a3b8', maxWidth: '560px', lineHeight: 1.7, margin: 0,
            animation: 'textReveal 0.8s ease-out 0.4s forwards', opacity: 0
          }}>
            A community platform connecting you with delicious surplus food at incredible prices. Eat well and help the planet.
          </p>

          {/* Search */}
          <div style={{ width: '100%', maxWidth: '560px', animation: 'fadeInUp 0.8s ease-out 0.6s forwards', opacity: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)',
              borderRadius: '1rem', padding: '0.5rem 1.25rem',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#64748b" style={{width:'20px',height:'20px',marginRight:'0.75rem',flexShrink:0}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input type="text" placeholder="Search food, restaurants..."
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem', padding: '0.75rem 0', color: '#e2e8f0', background: 'transparent', fontFamily: 'inherit' }}
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { const el = document.getElementById('listings'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '3rem', marginTop: '1.5rem', animation: 'fadeInUp 0.8s ease-out 0.8s forwards', opacity: 0 }}>
            {[{ num: '5K+', label: 'Meals Saved' }, { num: '120+', label: 'Restaurants' }, { num: '10K+', label: 'Happy Users' }].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', fontFamily: "'Outfit', sans-serif", background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stat.num}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ═══════ FEATURES ═══════ */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', padding: '3rem 0' }}>
        {[
          { title: 'For Restaurants', desc: 'List unsold, perfectly good food. Reduce waste, recover costs.', color: '#10b981', icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z' },
          { title: 'For Community', desc: 'Discover surplus food at discounted prices. Eat well, do good.', color: '#06b6d4', icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z' },
          { title: 'Environmental Impact', desc: 'Track CO₂ saved. Every meal rescued helps the planet.', color: '#8b5cf6', icon: 'M6.115 5.19l.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64' }
        ].map((f, i) => (
          <div key={i} className="hover-lift" style={{
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
            padding: '2rem', borderRadius: '1.25rem',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 20px -4px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center',
            cursor: 'default', animation: `fadeInUp 0.6s ease-out ${0.2 * i}s forwards`, opacity: 0
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '1rem',
              background: `linear-gradient(135deg, ${f.color}15, ${f.color}08)`,
              border: `1px solid ${f.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={f.color} style={{width:'32px',height:'32px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: '700', color: '#0f172a', fontSize: '1.15rem' }}>{f.title}</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ═══════ LISTINGS ═══════ */}
      <section id="listings" style={{ paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: '800', fontSize: '2rem', color: '#0f172a', letterSpacing: '-0.5px' }}>
            Available <span style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Near You</span>
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '0.55rem 1.25rem', borderRadius: '9999px', fontSize: '0.88rem', fontWeight: '600',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.25s', border: 'none', fontFamily: 'inherit',
                ...(activeCategory === cat
                  ? { background: 'linear-gradient(135deg, #0f172a, #334155)', color: 'white', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }
                  : { background: 'rgba(255,255,255,0.8)', color: '#475569', border: '1px solid #e2e8f0' })
              }}>{cat}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', opacity: recipes.length === 0 ? 0.5 : 1 }}>
          {(() => {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const filteredRecipes = recipes.filter(r => {
              const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.restaurant.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesCategory = activeCategory === 'All' ? true : (r.category && r.category === activeCategory) || r.title.toLowerCase().includes(activeCategory.toLowerCase());
              const timeLeft = r.expiryTimestamp ? r.expiryTimestamp - Date.now() : 0;
              const isNotExpired = !r.expiryTimestamp || timeLeft > 0;
              const isAllowed = currentUser.role === 'admin' || currentUser.role === 'restaurant' || !r.allowedRoles || r.allowedRoles.includes(currentUser.role || 'user');
              return matchesSearch && matchesCategory && isNotExpired && isAllowed;
            });

            if (filteredRecipes.length === 0) {
              return (
                <div style={{
                  gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center',
                  background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
                  borderRadius: '1.5rem', border: '1px dashed #cbd5e1', gap: '1rem'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#94a3b8" style={{width:'56px',height:'56px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <h3 style={{ color: '#334155', margin: 0, fontFamily: "'Outfit', sans-serif" }}>No food found</h3>
                  <p style={{ color: '#64748b', margin: 0, maxWidth: '320px' }}>Try different keywords or categories.</p>
                  <button onClick={() => { setSearchTerm(''); setActiveCategory('All'); }} style={{
                    background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0', padding: '0.6rem 1.25rem',
                    borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', color: '#334155', fontFamily: 'inherit'
                  }}>Clear Filters</button>
                </div>
              );
            }

            return filteredRecipes.map((recipe, idx) => {
              const timeLeft = recipe.expiryTimestamp ? recipe.expiryTimestamp - Date.now() : 0;
              const isFreeSoon = currentUser.role === 'ngo' && timeLeft > 0 && timeLeft <= 30 * 60 * 1000;

              return (
                <Link key={recipe._id || recipe.id} to={`/food/${recipe._id || recipe.id}`}
                  className="hover-lift" data-testid={`food-card-${recipe._id || recipe.id}`}
                  style={{
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                    borderRadius: '1.25rem', overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 4px 16px -4px rgba(0,0,0,0.06)',
                    textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column',
                    animation: `fadeInUp 0.5s ease-out ${Math.min(idx * 0.08, 0.4)}s forwards`, opacity: 0
                  }}>
                  {/* Image */}
                  <div style={{ height: '200px', position: 'relative', overflow: 'hidden' }}>
                    <img src={recipe.image || `https://images.unsplash.com/photo-${recipe.id % 2 === 0 ? '1546069901-ba9599a7e63c' : '1567623481151-1cfad0929a4a'}?w=500&auto=format&fit=crop&q=80`}
                      alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'; }} />
                    {/* Gradient overlay on bottom */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, rgba(0,0,0,0.3))' }} />
                    {/* Location badge */}
                    <div style={{
                      position: 'absolute', top: '12px', left: '12px',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                      padding: '0.35rem 0.65rem', borderRadius: '0.6rem',
                      fontSize: '0.73rem', fontWeight: '800', color: '#0f172a'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'12px',height:'12px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      {recipe.distance || '0.5 km'}
                    </div>
                    {/* Status badges */}
                    {recipe.quantity === 0 && (
                      <div style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg, #ef4444, #dc2626)', color:'white', padding:'0.35rem 0.7rem', borderRadius:'0.6rem', fontSize:'0.73rem', fontWeight:'800' }}>OUT OF STOCK</div>
                    )}
                    {recipe.allowedRoles && recipe.allowedRoles.length === 1 && recipe.allowedRoles[0] === 'ngo' && (
                      <div style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg, #7c3aed, #6d28d9)', color:'white', padding:'0.35rem 0.7rem', borderRadius:'0.6rem', fontSize:'0.73rem', fontWeight:'800', display:'flex', alignItems:'center', gap:'4px' }}>NGO ONLY</div>
                    )}
                    {isFreeSoon && (
                      <div style={{ position:'absolute', top:'12px', left:'12px', marginTop:'32px', background:'linear-gradient(135deg, #7c3aed, #8b5cf6)', color:'white', padding:'0.35rem 0.7rem', borderRadius:'0.6rem', fontSize:'0.73rem', fontWeight:'800', animation:'pulse 2s infinite' }}>FREE FOR NGOs SOON</div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.4rem', opacity: recipe.quantity === 0 ? 0.6 : 1 }}>
                    <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: '700', color: '#0f172a', fontSize: '1.05rem' }}>{recipe.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{recipe.restaurant}</p>
                      {recipe.donorVerified && <VerifiedBadge size="16px" />}
                      {recipe.category && (
                        <span style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', color: '#475569', borderRadius: '4px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', textTransform: 'uppercase' }}>{recipe.category}</span>
                      )}
                      {recipe.isNGOPreferred && (
                        <span style={{ display:'flex', alignItems:'center', background:'#f5f3ff', color:'#7c3aed', borderRadius:'4px', padding:'1px 6px', fontSize:'0.65rem', fontWeight:'800', border:'1px solid #ddd6fe' }}>NGO PREFERRED</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Available until {recipe.availableUntil}</p>
                    {recipe.address && (
                      <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📍 {recipe.address}
                      </p>
                    )}

                    {/* Freshness timeline */}
                    {recipe.expiryTimestamp && (
                      <div style={{ marginTop: '0.3rem' }}>
                        <div style={{ fontSize:'0.73rem', color:'#64748b', fontWeight:'600', display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                          <span>Freshness</span>
                          <span className={((recipe.expiryTimestamp - Date.now()) / 3600000) < 2 ? 'pulse-red' : ''}>
                            {(() => { const m = Math.floor((recipe.expiryTimestamp - Date.now()) / 60000); const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m%60}m` : `${m}m`; })()}
                          </span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.max(0, Math.min(100, ((recipe.expiryTimestamp - Date.now()) / (recipe.expiryTimestamp - (recipe.createdAt || (recipe.expiryTimestamp - 3600000)))) * 100))}%`,
                            background: 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981)',
                            borderRadius: '2px', transition: 'width 0.5s ease-out'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#0f172a', display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
                        ₹{parseFloat(recipe.discountPrice || recipe.price || 0).toFixed(2)}
                        {recipe.originalPrice && <del style={{ marginLeft: '2px', color: '#94a3b8', fontSize: '0.85rem' }}>₹{parseFloat(recipe.originalPrice).toFixed(2)}</del>}
                      </span>
                      <span style={{
                        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontWeight: '700', fontSize: '0.85rem'
                      }}>View Details →</span>
                    </div>
                  </div>
                </Link>
              );
            });
          })()}
        </div>
      </section>
    </div>
  );
};

export default Home;
