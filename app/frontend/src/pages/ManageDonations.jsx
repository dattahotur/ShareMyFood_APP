import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notification from '../components/Notification';
import useNavigationGuard from '../hooks/useNavigationGuard';

const API_URL = import.meta.env.VITE_API_URL;

const ManageDonations = () => {
  const navigate = useNavigate();
  useNavigationGuard();
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const [showRiderModal, setShowRiderModal] = useState(null);
  const [riderRating, setRiderRating] = useState(5);
  const [riderFeedback, setRiderFeedback] = useState('');
  const [riderImage, setRiderImage] = useState('');
  const [isRiderIssue, setIsRiderIssue] = useState(false);
  const [isSubmittingRider, setIsSubmittingRider] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id && !user._id) { navigate('/login'); return; }

    let isMounted = true;

    const fetchRecipes = async () => {
      try {
        const recipesRes = await fetch(`${API_URL}/api/recipes`);
        const recipesData = await recipesRes.json();
        const recipeMap = {};
        recipesData.forEach(r => { 
          const rId = r._id || r.id;
          recipeMap[rId] = r; 
        });
        if (isMounted) setRecipes(recipeMap);
        return recipesData;
      } catch (err) {
        console.error(err);
        return [];
      }
    };

    const fetchOrders = async (myRecipeIds) => {
      try {
        const ordersRes = await fetch(`${API_URL}/api/orders`);
        const ordersData = await ordersRes.json();
        if (isMounted) {
          const filtered = ordersData.filter(o => myRecipeIds.includes(o.recipeId));
          const sorted = filtered.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
          setOrders(sorted);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const init = async () => {
      setLoading(true);
      const recipesData = await fetchRecipes();
      const myRecipeIds = [];
      recipesData.forEach(r => {
        const rId = r._id || r.id;
        if (r.restaurantId === (user.id || user._id)) {
          myRecipeIds.push(rId);
        }
      });
      await fetchOrders(myRecipeIds);
      setLoading(false);

      // Start polling for orders in the background
      const interval = setInterval(() => {
        fetchOrders(myRecipeIds);
      }, 5000);

      return interval;
    };

    let intervalId;
    init().then(id => { intervalId = id; });

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigate]);

  const handleAction = async (orderId, action) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/${action}`, { method: 'POST' });
      if (res.ok) {
        setNotification({ message: `Order ${action}d`, type: 'success' });
        setOrders(prev => prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, status: action === 'approve' ? 'approved' : 'rejected' } : o));
      } else { setNotification({ message: `Failed to ${action}`, type: 'error' }); }
    } catch { setNotification({ message: 'Network error', type: 'error' }); }
  };

  const handleRiderFeedback = async () => {
    if (!showRiderModal) return;
    const order = orders.find(o => (o._id === showRiderModal || o.id === showRiderModal));
    if (!order || !order.driverId) return;

    setIsSubmittingRider(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const payload = {
        driverId: order.driverId,
        rating: riderRating,
        feedback: riderFeedback,
        proofImage: riderImage,
        isIssue: isRiderIssue,
        fromId: user.id || user._id,
        fromName: user.name,
        orderId: order._id || order.id
      };
      
     // send feedback to delivery app
      const res = await axios.post(
        `https://deliver-user-service.onrender.com/${order.driverId}/rider-feedback`,
        payload
      );


      // update order-service report status
      await axios.post(
        `${API_URL}/api/orders/${order._id || order.id}/rider-report`,
        {
          type: isRiderIssue ? 'reported' : 'rated',
          reporter: 'donor'
        }
      );
      if (res.status === 200) {
        setNotification({ message: 'Feedback submitted successfully.', type: 'success' });
        setOrders(prev =>
          prev.map(o =>
            (o._id === order._id || o.id === order.id)
              ? {
                  ...o,
                  donorRiderReported: isRiderIssue,
                  riderRated: true
                }
              : o
          )
        );
        setShowRiderModal(null); setRiderRating(5); setRiderFeedback(''); setRiderImage(''); setIsRiderIssue(false);
      } else { 
        setNotification({ message: 'Failed to submit feedback.', type: 'error' }); 
      }
    } catch (err) { 
      console.error("Feedback error:", err.response?.data || err.message);
      setNotification({ message: err.response?.data?.error || 'Failed to submit feedback.', type: 'error' }); 
    }
    finally { setIsSubmittingRider(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setNotification({ message: 'File too large (max 2MB)', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setRiderImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="loader"></div></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0', minHeight: '80vh', animation: 'fadeIn 0.4s ease-out' }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <button onClick={() => {
        if (window.history.state && window.history.state.idx > 0) {
          navigate(-1);
        } else {
          navigate('/dashboard');
        }
      }} style={backBtnStyle}>← Back</button>

      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '1.5rem 0 0.5rem', letterSpacing: '-0.5px' }}>
        Manage <span style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Donations</span>
      </h1>
      <p style={{ color: '#64748b', margin: '0 0 2rem' }}>Review and respond to incoming food requests</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.length > 0 ? orders.map((order, i) => {
          const orderRecipeId = order.recipeId;
          const recipe = recipes[orderRecipeId];
          const isPending = order.status === 'pending';
          return (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
              padding: '1.5rem', borderRadius: '1.25rem', gap: '1rem',
              border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)',
              borderLeft: (() => {
                if (order.status === 'pending') return '4px solid #f59e0b';
                if (order.status === 'approved') {
                  if (order.deliveryMethod === 'delivery-partner') {
                    if (order.deliveryStatus === 'picked_up') return '4px solid #3b82f6';
                    if (order.driverId) return '4px solid #a855f7';
                  }
                  return '4px solid #10b981';
                }
                if (order.status === 'completed') return '4px solid #10b981';
                if (order.status === 'rejected') return '4px solid #ef4444';
                if (order.status === 'reported' || order.status === 'resolved') return '4px solid #f59e0b';
                return '4px solid #94a3b8';
              })(),
              animation: `fadeInUp 0.4s ease-out ${Math.min(i * 0.05, 0.3)}s forwards`, opacity: 0
            }}>
              <div className="responsive-card">
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                    {recipe ? recipe.title : `Recipe #${order.recipeId}`}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Qty: {order.quantity} · {new Date(order.timestamp).toLocaleString()}
                  </p>
                  {order.deliveryMethod && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '0.4rem',
                      padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700',
                      ...(order.deliveryMethod === 'self-pickup'
                        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
                        : { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe' })
                    }}>
                      {order.deliveryMethod === 'self-pickup' ? '📍 Self Pickup' : '🚚 Delivery Partner'}
                    </span>
                  )}
                </div>
                <div className="responsive-card-right">
                  {(() => {
                    let displayStatus = order.status;
                    let badgeStyle = { background: '#f1f5f9', color: '#475569' };

                    if (order.status === 'pending') {
                      displayStatus = 'pending';
                      badgeStyle = { background: '#fef3c7', color: '#d97706' };
                    } else if (order.status === 'approved') {
                      if (order.deliveryMethod === 'delivery-partner') {
                        if (order.deliveryStatus === 'picked_up') {
                          displayStatus = 'picked up';
                          badgeStyle = { background: '#dbeafe', color: '#1e40af' };
                        } else if (order.driverId) {
                          displayStatus = 'delivery partner assigned';
                          badgeStyle = { background: '#f3e8ff', color: '#6b21a8' };
                        } else {
                          displayStatus = 'approved';
                          badgeStyle = { background: '#dcfce7', color: '#15803d' };
                        }
                      } else {
                        displayStatus = 'approved';
                        badgeStyle = { background: '#dcfce7', color: '#15803d' };
                      }
                    } else if (order.status === 'completed') {
                      displayStatus = order.deliveryMethod === 'delivery-partner' ? 'delivered' : 'completed';
                      badgeStyle = { background: '#dcfce7', color: '#15803d' };
                    } else if (order.status === 'rejected') {
                      displayStatus = 'rejected';
                      badgeStyle = { background: '#fee2e2', color: '#dc2626' };
                    } else if (order.status === 'reported' || order.status === 'resolved') {
                      displayStatus = order.status;
                      badgeStyle = { background: '#fef3c7', color: '#d97706' };
                    }

                    return (
                      <span style={{
                        padding: '0.3rem 0.7rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '700', textTransform: 'uppercase',
                        ...badgeStyle
                      }}>{displayStatus}</span>
                    );
                  })()}
                  {recipe && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                        ₹{parseFloat(recipe.discountPrice || recipe.price).toFixed(2)} x {order.quantity}
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                        ₹{(parseFloat(recipe.discountPrice || recipe.price) * order.quantity).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {isPending && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button onClick={() => handleAction(order._id || order.id, 'approve')} style={{
                    flex: 1, padding: '0.7rem', borderRadius: '0.75rem', border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                    fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
                  }}>✓ Approve</button>
                  <button onClick={() => handleAction(order._id || order.id, 'reject')} style={{
                    flex: 1, padding: '0.7rem', borderRadius: '0.75rem',
                    border: '1px solid #fecaca', background: 'rgba(254,226,226,0.4)',
                    color: '#dc2626', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>✕ Reject</button>
                </div>
              )}
              {(order.status === 'picked_up' || order.status === 'completed') && order.deliveryMethod === 'delivery-partner'&& !order.donorRiderReported && !order.riderRated && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button 
                    onClick={() => setShowRiderModal(order._id || order.id)}
                    style={{
                      padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: 'none',
                      background: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontWeight: '700',
                      fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    Rate/Report Rider
                  </button>
                </div>
              )}
            </div>
          );
        }) : (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '1.5rem', border: '1px dashed #cbd5e1' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#94a3b8" style={{width:'48px',height:'48px',margin:'0 auto 1rem',display:'block'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <h3 style={{ color: '#334155', margin: '0 0 0.5rem', fontFamily: "'Outfit', sans-serif" }}>No incoming requests</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Requests will appear here when users reserve your food.</p>
          </div>
        )}
      </div>

      {/* Rider Feedback Modal */}
      {showRiderModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-card">
            <h3 style={modalTitleStyle}>Rate/Report Rider</h3>
            <p style={modalSubStyle}>How was your experience with the delivery partner?</p>

            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <label style={labelStyle}>Star Rating</label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map(num => (
                  <button key={num} onClick={() => setRiderRating(num)} style={{
                    width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                    background: riderRating >= num ? '#facc15' : '#e2e8f0', color: 'white',
                    cursor: 'pointer', fontWeight: '800', transition: 'all 0.2s'
                  }}>{num}</button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Feedback/Reason</label>
              <textarea 
                placeholder="Share your experience..." 
                value={riderFeedback} 
                onChange={(e) => setRiderFeedback(e.target.value)} 
                style={textareaStyle} 
              />
            </div>

            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', background: isRiderIssue ? '#fff1f2' : '#f8fafc', border: `1px solid ${isRiderIssue ? '#fecaca' : '#e2e8f0'}` }}>
              <input type="checkbox" id="isIssue" checked={isRiderIssue} onChange={(e) => setIsRiderIssue(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <label htmlFor="isIssue" style={{ fontSize: '0.85rem', fontWeight: '700', color: isRiderIssue ? '#dc2626' : '#64748b' }}>This is a serious issue (Report to Admin)</label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Proof Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={handleFileChange} style={fileInputStyle} />
              {riderImage && <div style={imagePreviewStyle}><img src={riderImage} alt="Preview" style={imgStyle} /></div>}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowRiderModal(null); setRiderRating(5); setRiderFeedback(''); setRiderImage(''); setIsRiderIssue(false); }} disabled={isSubmittingRider} style={secondaryBtnStyle}>Cancel</button>
              <button onClick={handleRiderFeedback} disabled={isSubmittingRider} style={{ ...primaryBtnStyle, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>{isSubmittingRider ? 'Submitting...' : 'Submit Feedback'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease-out' };
const modalContentStyle = { background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', padding: '2.5rem', borderRadius: '1.5rem', maxWidth: '420px', width: '90%', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.6)', animation: 'scaleIn 0.3s ease-out' };
const modalTitleStyle = { margin: '0 0 0.5rem', fontFamily: "'Outfit', sans-serif", fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' };
const modalSubStyle = { color: '#64748b', margin: '0 0 1.5rem', fontSize: '0.9rem' };
const labelStyle = { display:'block', fontSize:'0.8rem', fontWeight:'700', color:'#64748b', marginBottom:'0.4rem' };
const textareaStyle = { padding: '0.8rem 1rem', borderRadius: '0.85rem', border: '2px solid #f1f5f9', width: '100%', boxSizing: 'border-box', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', minHeight: '100px', resize: 'none' };
const fileInputStyle = { padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', fontSize: '0.85rem', cursor: 'pointer' };
const imagePreviewStyle = { marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: '150px' };
const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const primaryBtnStyle = { flex: 1, padding: '0.75rem', borderRadius: '0.85rem', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', fontWeight: '700', color: 'white', cursor: 'pointer', fontFamily: 'inherit' };
const secondaryBtnStyle = { flex: 1, padding: '0.75rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0', background: 'white', fontWeight: '700', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' };
const backBtnStyle = { display:'flex', alignItems:'center', gap:'0.5rem', color:'#64748b', fontWeight:'700', fontSize:'0.88rem', padding:'0.55rem 1.15rem', borderRadius:'9999px', background:'rgba(255,255,255,0.9)', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', cursor:'pointer', backdropFilter:'blur(8px)', fontFamily:'inherit' };

export default ManageDonations;
