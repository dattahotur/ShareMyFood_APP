import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useNavigationGuard from '../hooks/useNavigationGuard';
import VerifiedBadge from '../components/VerifiedBadge';

const API_URL = import.meta.env.VITE_API_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  useNavigationGuard();
  const [userName, setUserName] = useState('User');
  const [metrics, setMetrics] = useState({ meals: 0, waste: 0, money: 0, heroPoints: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loggedInUser = localStorage.getItem('user');
  const user = loggedInUser ? JSON.parse(loggedInUser) : {};
  const [currentUser, setCurrentUser] = useState(user);
  const isRestaurant = user.role === 'restaurant';
  useEffect(() => {
    const fetchData = async () => {
      if (!loggedInUser) { navigate('/login'); return; }
      setUserName(user.name);
      try {
        setLoading(true);
        const [ordersRes, allOrdersRes, recipesRes, userRes] = await Promise.all([
          fetch(`${API_URL}/api/orders/user/${user.id || user._id}`),
          fetch(`${API_URL}/api/orders`),
          fetch(`${API_URL}/api/recipes`),
          fetch(`${API_URL}/api/users/${user.id || user._id}`)
        ]);
        const ordersData = await ordersRes.json();
        const allOrdersData = await allOrdersRes.json();
        const recipesData = await recipesRes.json();
        const userData = await userRes.json();
        
        if (userData && !userData.error) {
          setCurrentUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        const recipeMap = {};
        const myRecipeIds = [];
        recipesData.forEach(r => {
          const rId = r._id || r.id;
          recipeMap[rId] = r;
          if (r.restaurantId === (user.id || user._id)) myRecipeIds.push(rId);
        });

        let mealsCount = 0, moneySaved = 0;
        const validOrders = [];

        if (isRestaurant) {
          // Find all orders placed on this restaurant's recipes (approved or completed)
          const myDonationOrders = allOrdersData.filter(o => myRecipeIds.includes(o.recipeId));
          
          myDonationOrders.forEach(order => {
            const recipe = recipeMap[order.recipeId];
            if (recipe) {
              if (order.status === 'approved' || order.status === 'completed') {
                mealsCount += order.quantity;
                moneySaved += (recipe.originalPrice || recipe.price || 0) * order.quantity;
              }
              validOrders.push({ ...order, recipe });
            }
          });

          // Sort recent activity by timestamp descending
          validOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
          ordersData.forEach(order => {
            if (order.status !== 'reported') {
              const recipe = recipeMap[order.recipeId];
              if (recipe) {
                mealsCount += order.quantity;
                moneySaved += (recipe.originalPrice - (recipe.discountPrice || recipe.price)) * order.quantity;
                validOrders.push({ ...order, recipe });
              }
            }
          });
        }

        const myIncoming = allOrdersData.filter(o => myRecipeIds.includes(o.recipeId) && o.status === 'pending');
        setIncomingRequests(myIncoming.map(o => ({ ...o, recipe: recipeMap[o.recipeId] })));

        setMetrics({ meals: mealsCount, waste: (mealsCount * 0.5).toFixed(1), money: moneySaved.toFixed(2), heroPoints: mealsCount * 10 });
        setRecentActivity(validOrders.slice(0, 3));
      } catch (err) { console.error("Dashboard fetch error:", err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [navigate]);

  const handleAction = async (orderId, status) => {
    try {
     const endpoint = status === 'approved' ? 'approve' : 'reject';

      const res = await fetch(
        `${API_URL}/api/orders/${orderId}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      if (res.ok) {
        // Find the order that was updated
        const updatedOrder = incomingRequests.find(o => (o._id === orderId || o.id === orderId));

        // Update local state of requests instead of reloading
        setIncomingRequests(prev => 
          prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, status } : o)
        );

        // Also update recentActivity list if the request is there
        setRecentActivity(prev => 
          prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, status } : o)
        );

        if (status === 'approved' && updatedOrder) {
          // Dynamically update the metrics in real time
          setMetrics(prev => {
            const newMeals = prev.meals + updatedOrder.quantity;
            const price = parseFloat(updatedOrder.recipe.discountPrice || updatedOrder.recipe.price || 0);
            const newMoney = parseFloat(prev.money) + (price * updatedOrder.quantity);
            return {
              meals: newMeals,
              waste: (newMeals * 0.5).toFixed(1),
              money: newMoney.toFixed(2),
              heroPoints: newMeals * 10
            };
          });
        }
      }
    } catch (err) { console.error("Action error:", err); }
  };

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



  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="loader"></div>
    </div>
  );

  const statCards = [
    { 
      label: isRestaurant ? 'Meals Shared' : 'Meals Rescued', 
      value: metrics.meals, 
      color: '#10b981', 
      icon: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.866 8.281 8.281 0 0 0 3 .001Z' 
    },
    { 
      label: 'Waste Prevented', 
      value: `${metrics.waste} kg`, 
      color: '#06b6d4', 
      icon: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z' 
    },
    { 
      label: isRestaurant ? 'Donation Value' : 'Money Saved', 
      value: `₹${metrics.money}`, 
      color: '#8b5cf6', 
      icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' 
    },
    { 
      label: isRestaurant ? 'Donor Points' : 'Hero Points', 
      value: metrics.heroPoints, 
      color: '#f59e0b', 
      icon: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z' 
    }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0', minHeight: '80vh', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <header className="responsive-header" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>
        <div className="responsive-header-right">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginBottom: '8px' }}>

            <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              Welcome, <span style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{userName}</span>
              {JSON.parse(localStorage.getItem('user') || '{}').verificationStatus === 'verified' && <VerifiedBadge size="22px" />}
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Your real-time impact on the community</p>
        </div>
      </header>

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
        return user.role === 'restaurant' && user.verificationStatus !== 'verified' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))',
            border: '1px solid rgba(16,185,129,0.12)', borderRadius: '1.25rem', padding: '1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{width:'24px',height:'24px'}}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>Get Verified</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {user.verificationStatus === 'pending' ? 'Your request is being reviewed.' : 'Submit documents to unlock the trust badge.'}
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

      {/* Stats Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {statCards.map((s, i) => (
          <div key={i} className="hover-lift" style={{
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            padding: '1.5rem', borderRadius: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)',
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

      {/* Incoming Requests Section */}
      {incomingRequests.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
              Pending Requests <span style={{ background: '#ef4444', color: 'white', borderRadius: '9999px', padding: '1px 8px', fontSize: '0.9rem', marginLeft: '8px' }}>{incomingRequests.filter(r => r.status !== 'approved' && r.status !== 'rejected').length}</span>
            </h2>
            <Link to="/manage-donations" style={{ textDecoration: 'none', color: '#10b981', fontWeight: '700', fontSize: '0.9rem' }}>Accept/Reject →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {incomingRequests.map((req, i) => (
              <div key={i} className="responsive-card" style={{
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                padding: '1.25rem', borderRadius: '1rem',
                border: '1px solid rgba(16,185,129,0.2)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.05)',
                borderLeft: '4px solid #10b981'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{req.recipe.title}</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Qty: {req.quantity} · {new Date(req.timestamp).toLocaleTimeString()}</p>
                </div>
                {req.status === 'approved' ? (
                  <div className="responsive-card-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: '800', fontSize: '0.88rem', background: '#dcfce7', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.74-5.24Z" clipRule="evenodd" />
                      </svg>
                      <span>Approved</span>
                    </div>
                  </div>
                ) : req.status === 'rejected' ? (
                  <div className="responsive-card-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: '800', fontSize: '0.88rem', background: '#fee2e2', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                      </svg>
                      <span>Rejected</span>
                    </div>
                  </div>
                ) : (
                  <div className="responsive-card-right" style={{ flexDirection: 'row', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button onClick={() => handleAction(req._id || req.id, 'approved')} style={{
                      padding: '0.5rem 1rem', borderRadius: '0.75rem', border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                      fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                    }}>Approve</button>
                    <button onClick={() => handleAction(req._id || req.id, 'rejected')} style={{
                      padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid #fecaca',
                      background: '#fff1f2', color: '#ef4444',
                      fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer'
                    }}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
            {isRestaurant ? 'Recent Donations' : 'Recent Reservations'}
          </h2>
          <Link to={isRestaurant ? "/manage-donations" : "/my-orders"} style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '700', fontSize: '0.9rem' }}>View All →</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {recentActivity.length > 0 ? recentActivity.map((a, i) => (
            <div key={i} className="responsive-card" style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
              padding: '1.25rem', borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
              borderLeft: `3px solid ${a.status === 'completed' || a.status === 'approved' ? '#10b981' : '#f59e0b'}`
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>{new Date(a.timestamp).toLocaleString()}</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>{a.recipe.title}</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {isRestaurant ? `Claimed by: ${a.userName}` : a.recipe.restaurant}
                </span>
              </div>
              <div className="responsive-card-right">
                <span style={{
                  padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '700', textTransform: 'uppercase',
                  ...(a.status === 'completed' || a.status === 'approved'
                    ? { background: '#dcfce7', color: '#15803d' }
                    : { background: '#fef3c7', color: '#d97706' })
                }}>{a.status === 'pending' ? 'Reserved' : a.status}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                  {isRestaurant ? `Original Value: ₹${parseFloat(a.recipe.originalPrice || a.recipe.price || 0).toFixed(2)} x ${a.quantity}` : `₹${parseFloat(a.recipe.discountPrice || a.recipe.price).toFixed(2)} x ${a.quantity}`}
                </span>
                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                  ₹{(parseFloat(isRestaurant ? (a.recipe.originalPrice || a.recipe.price || 0) : (a.recipe.discountPrice || a.recipe.price)) * a.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          )) : (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', margin: 0 }}>
                {isRestaurant ? 'No donations yet. List some surplus food to get started!' : 'No recent activity yet. Go save some food!'}
              </p>
            </div>
          )}
        </div>
      </section>
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

export default Dashboard;
