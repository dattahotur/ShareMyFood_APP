import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notification from '../components/Notification';
import useNavigationGuard from '../hooks/useNavigationGuard';

const API_URL = import.meta.env.VITE_API_URL;

const MyOrders = () => {
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

  // Food report state
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportImage, setReportImage] = useState('');
  const [reportDescription, setReportDescription ] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id && !user._id) { navigate('/login'); return; }

    let isMounted = true;

    const fetchRecipes = async () => {
      try {
        const recipeRes = await fetch(`${API_URL}/api/recipes`);
        const recipeData = await recipeRes.json();
        const recipeMap = {};
        recipeData.forEach(r => recipeMap[r.id || r._id] = r);
        if (isMounted) setRecipes(recipeMap);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchOrdersData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/user/${user.id || user._id}`);
        const data = await res.json();
        if (isMounted) setOrders(data);
      } catch (err) {
        console.error(err);
      }
    };

    const init = async () => {
      setLoading(true);
      await fetchRecipes();
      await fetchOrdersData();
      setLoading(false);

      // Start polling for orders in the background
      const interval = setInterval(() => {
        fetchOrdersData();
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

  const handleReport = async () => {
    if (!showReportModal) return;
    if (!reportDescription.trim()) { setNotification({ message: 'Please provide details about the issue.', type: 'error' }); return; }
    if (!reportImage) { setNotification({ message: 'Please attach a photo as evidence.', type: 'error' }); return; }
    
    setIsSubmittingReport(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${showReportModal}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: reportDescription,
          proofImage: reportImage 
        })
      });
      if (res.ok) {
        setNotification({ message: 'Report submitted successfully.', type: 'success' });
        setOrders(prev => prev.map(o => (o._id === showReportModal || o.id === showReportModal) ? { ...o,foodReported: true } : o));
        setShowReportModal(null); setReportImage(''); setReportDescription('');
      } else { setNotification({ message: 'Failed to submit report.', type: 'error' }); }
    } catch { setNotification({ message: 'Network error.', type: 'error' }); }
    finally { setIsSubmittingReport(false); }
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

      // Riders are stored in the Delivery App's own user service (port 5010)
      // We call it directly since it's a separate database from ShareMyFood
      const res = await axios.post(
        `https://deliver-user-service.onrender.com/${order.driverId}/rider-feedback`,
        payload
      );
      
      if (res.status === 200) {
        await axios.post(
          `${API_URL}/api/orders/${order._id || order.id}/rider-report`,
          {
            type: 'reported',
            reporter: 'user'
          }
        );


        setOrders(prev =>
          prev.map(o =>
            (o._id === order._id || o.id === order.id)
              ? {
                  ...o,
                  userRiderReported: true,
                  riderRated: false
                }
              : o
          )
        );
        
        setNotification({ message: 'Feedback submitted successfully.', type: 'success' });
        setOrders(prev =>
          prev.map(o =>
            (o._id === order._id || o.id === order.id)
              ? {
                  ...o,
                  userRiderReported: isRiderIssue,
                  riderRated: !isRiderIssue
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

  const handleFileChange = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setNotification({ message: 'File too large (max 2MB)', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'food') setReportImage(reader.result);
        else setRiderImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="loader"></div></div>;

  const statusStyle = (s, deliveryMethod, deliveryStatus, driverId) => {
    if (s === 'pending') return { background: '#fef3c7', color: '#d97706' };
    if (s === 'approved') {
      if (deliveryMethod === 'delivery-partner') {
        if (deliveryStatus === 'picked_up') {
          return { background: '#dbeafe', color: '#1e40af' }; // blue
        }
        if (driverId) {
          return { background: '#f3e8ff', color: '#6b21a8' }; // purple
        }
      }
      return { background: '#dcfce7', color: '#15803d' }; // green
    }
    if (s === 'completed') return { background: '#dcfce7', color: '#15803d' };
    if (s === 'rejected') return { background: '#fee2e2', color: '#dc2626' };
    if (s === 'reported' || s === 'resolved') return { background: '#fef3c7', color: '#d97706' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  const borderColor = (s, deliveryMethod, deliveryStatus, driverId) => {
    if (s === 'pending') return '#f59e0b';
    if (s === 'approved') {
      if (deliveryMethod === 'delivery-partner') {
        if (deliveryStatus === 'picked_up') return '#3b82f6'; // blue
        if (driverId) return '#a855f7'; // purple
      }
      return '#10b981'; // green
    }
    if (s === 'completed') return '#10b981';
    if (s === 'rejected') return '#ef4444';
    if (s === 'reported' || s === 'resolved') return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0', minHeight: '80vh', animation: 'fadeIn 0.4s ease-out' }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>

      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '1.5rem 0 0.5rem', letterSpacing: '-0.5px' }}>
        My <span style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Orders</span>
      </h1>
      <p style={{ color: '#64748b', margin: '0 0 2rem' }}>Track your food reservations and history</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.length > 0 ? orders.map((order, i) => {
          const recipe = recipes[order.recipeId];
          const isFoodReported = order.foodReported === true;
          const isRiderReported = order.userRiderReported === true;
          const isRiderRated = order.riderRated === true;
          const riderFeedbackGiven = isRiderReported || isRiderRated;

          return (
            <div key={i} className="responsive-card" style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
              padding: '1.5rem', borderRadius: '1.25rem',
              border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)',
              borderLeft: `4px solid ${borderColor(order.status, order.deliveryMethod, order.deliveryStatus, order.driverId)}`
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <span style={{ fontSize: '0.73rem', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>
                  {new Date(order.timestamp).toLocaleString()}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                  {recipe ? recipe.title : `Order #${order._id || order.id}`}
                </h3>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  {recipe ? recipe.restaurant : ''} · Qty: {order.quantity}
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
                <span style={{
                  padding: '0.3rem 0.7rem', borderRadius: '9999px', fontSize: '0.73rem',
                  fontWeight: '700', textTransform: 'uppercase', ...statusStyle(order.status, order.deliveryMethod, order.deliveryStatus, order.driverId)
                }}>{order.status === 'pending' ? 'reserved' : (
                  order.status === 'approved' && order.deliveryMethod === 'delivery-partner' ? (
                    order.deliveryStatus === 'picked_up' ? 'picked up' : (
                      order.driverId ? 'delivery partner assigned' : 'approved'
                    )
                  ) : (
                    order.status === 'completed' && order.deliveryMethod === 'delivery-partner' ? 'delivered' : order.status
                  )
                )}</span>
                {recipe && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                      ₹{parseFloat(recipe.discountPrice || recipe.price).toFixed(2)} x {order.quantity}
                    </div>
                    <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>
                      ₹{(parseFloat(recipe.discountPrice || recipe.price) * order.quantity).toFixed(2)}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {((order.deliveryMethod === 'self-pickup' && order.status === 'approved') || order.status === 'completed' || isFoodReported) && (
                    <button 
                      onClick={() => !isFoodReported && setShowReportModal(order._id || order.id)} 
                      disabled={isFoodReported}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: 'none',
                        background: isFoodReported ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.08)', 
                        color: isFoodReported ? '#94a3b8' : '#ef4444', 
                        fontWeight: '700',
                        fontSize: '0.75rem', cursor: isFoodReported ? 'default' : 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      {isFoodReported ? 'Food Reported' : 'Report Food'}
                    </button>
                  )}
                  {order.status === 'completed' && order.deliveryMethod === 'delivery-partner' && (
                    <button 
                      onClick={() => !riderFeedbackGiven && setShowRiderModal(order._id || order.id)}
                      disabled={riderFeedbackGiven}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: 'none',
                        background: riderFeedbackGiven ? 'rgba(59,130,246,0.03)' : 'rgba(59,130,246,0.08)', 
                        color: riderFeedbackGiven ? '#94a3b8' : '#3b82f6', 
                        fontWeight: '700',
                        fontSize: '0.75rem', cursor: riderFeedbackGiven ? 'default' : 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      {isRiderReported ? 'Rider Reported' : (isRiderRated ? 'Rider Rated' : 'Rate/Report Rider')}
                    </button>
                  )}
                </div>
                {(isFoodReported || riderFeedbackGiven) && (
                  <div style={{ 
                    fontSize: '0.73rem', 
                    fontWeight: '800', 
                    marginTop: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.6rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    ...(isFoodReported || isRiderReported 
                      ? { color: '#b91c1c', background: '#fff1f2', border: '1px solid #fecaca' }
                      : { color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0' })
                  }}>
                    {isFoodReported || isRiderReported ? '⚠️' : '✅'}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {isFoodReported && <span style={{ textTransform: 'uppercase' }}>Food Reported</span>}
                      {isRiderReported && <span style={{ textTransform: 'uppercase' }}>Rider Reported</span>}
                      {isRiderRated && !isRiderReported && <span style={{ textTransform: 'uppercase' }}>Rider Rated</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '1.5rem', border: '1px dashed #cbd5e1' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#94a3b8" style={{width:'48px',height:'48px',margin:'0 auto 1rem',display:'block'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <h3 style={{ color: '#334155', margin: '0 0 0.5rem', fontFamily: "'Outfit', sans-serif" }}>No orders yet</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Browse available food and start saving!</p>
          </div>
        )}
      </div>

      {/* Food Report Modal */}
      {showReportModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-card">
            <h3 style={modalTitleStyle}>Report Food Issue</h3>
            <p style={modalSubStyle}>Provide details and attach a photo as evidence.</p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Details of Issue</label>
              <textarea 
                placeholder="Describe what happened..." 
                value={reportDescription} 
                onChange={(e) => setReportDescription(e.target.value)} 
                style={textareaStyle} 
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Evidence Photo <span style={{ color: '#ef4444' }}>(Mandatory)</span></label>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'food')} style={fileInputStyle} />
              {reportImage && <div style={imagePreviewStyle}><img src={reportImage} alt="Preview" style={imgStyle} /></div>}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowReportModal(null); setReportImage(''); setReportDescription(''); }} disabled={isSubmittingReport} style={secondaryBtnStyle}>Cancel</button>
              <button onClick={handleReport} disabled={isSubmittingReport || !reportDescription.trim() || !reportImage} style={primaryBtnStyle}>{isSubmittingReport ? 'Submitting...' : 'Submit Report'}</button>
            </div>
          </div>
        </div>
      )}

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
              <label style={labelStyle}>
                Proof Photo {isRiderIssue ? <span style={{ color: '#ef4444' }}>(Mandatory for serious issues)</span> : '(Optional)'}
              </label>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'rider')} style={fileInputStyle} />
              {riderImage && <div style={imagePreviewStyle}><img src={riderImage} alt="Preview" style={imgStyle} /></div>}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowRiderModal(null); setRiderRating(5); setRiderFeedback(''); setRiderImage(''); setIsRiderIssue(false); }} disabled={isSubmittingRider} style={secondaryBtnStyle}>Cancel</button>
              <button 
                onClick={handleRiderFeedback} 
                disabled={isSubmittingRider || (isRiderIssue && !riderImage) || !riderFeedback.trim()} 
                style={{ ...primaryBtnStyle, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
              >
                {isSubmittingRider ? 'Submitting...' : 'Submit Feedback'}
              </button>
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

export default MyOrders;
