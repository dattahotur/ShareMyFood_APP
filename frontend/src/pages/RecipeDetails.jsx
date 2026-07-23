import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Notification from '../components/Notification';
import VerifiedBadge from '../components/VerifiedBadge';

const API_URL = import.meta.env.VITE_API_URL;

const RecipeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [donorName, setDonorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isNGOPriceActive, setIsNGOPriceActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('self-pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const timerRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const showNotification = (message, type) => setNotification({ message, type });

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/recipes/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRecipe(data);
          if (data.restaurantId) {
            const uRes = await fetch(`${API_URL}/api/users/${data.restaurantId}`);
            if (uRes.ok) { const u = await uRes.json(); setDonorName(u.name); }
          }
        } else { showNotification('Recipe not found', 'error'); }
      } catch (err) { showNotification('Error loading recipe', 'error'); }
      finally { setLoading(false); }
    };
    fetchRecipe();
  }, [id]);

  useEffect(() => {
    if (!recipe || !recipe.expiryTimestamp) return;
    const update = () => {
      const diff = recipe.expiryTimestamp - Date.now();
      if (diff <= 0) { setTimeLeft('EXPIRED'); setIsNGOPriceActive(false); return; }
      if (diff <= 30 * 60 * 1000 && user.role === 'ngo') setIsNGOPriceActive(true);
      const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recipe, user.role]);

  const handleClaim = async () => {
    if (isSubmitting) return;
    
    // Mobile number validation (Indian format: 10 digits starting with 6-9, optional +91)
    if (deliveryMethod === 'delivery-partner') {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(deliveryPhone)) {
        showNotification('Please enter a valid 10-digit mobile number (e.g. 9876543210).', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      console.log("Recipe object:", recipe);
      console.log("recipe._id =", recipe._id);
      console.log("recipe.id =", recipe.id);

      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id || user._id, 
          userName: user.name,
          donorId: recipe.donorId,
          recipeId: recipe._id || recipe.id, 
          quantity, 
          deliveryMethod, 
          deliveryAddress: deliveryMethod === 'delivery-partner' ? deliveryAddress : '',
          deliveryPhone: deliveryMethod === 'delivery-partner' ? deliveryPhone : '',
          status: 'pending' 
        })
      });
      if (res.ok) {
        showNotification(`You reserved ${quantity} ${recipe.title}! The donor will confirm shortly.`, 'success');
        setShowConfirm(false);
        const updated = await fetch(`${API_URL}/api/recipes/${id}`);
        if (updated.ok) setRecipe(await updated.json());
      } else {
        const d = await res.json();
        showNotification(d.error || 'Failed to place order', 'error');
      }
    } catch (err) { showNotification('Network error', 'error'); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="loader"></div></div>;
  if (!recipe) return <div style={{ textAlign: 'center', padding: '4rem 2rem' }}><h2 style={{ color: '#334155' }}>Recipe not found</h2></div>;

  const isExpired = recipe.expiryTimestamp && recipe.expiryTimestamp <= Date.now();
  const isSoldOut = recipe.quantity === 0;
  const isOwner = user?.id === recipe.restaurantId || user?._id === recipe.restaurantId;
  const isNotAllowedRole = recipe.allowedRoles && !recipe.allowedRoles.includes(user.role);
  
  // New permissions logic:
  // - Restaurants cannot claim food.
  // - NGOs must be verified to claim.
  // - Normal users and Admins can always claim.
  const isRestaurant = user.role === 'restaurant';
  const isNGO = user.role === 'ngo';
  const isVerified = user.verificationStatus === 'verified';
  
  let rolePermissionError = null;
  if (isRestaurant) rolePermissionError = "Restaurant accounts are restricted to listing food, not claiming.";
  else if (isNGO && !isVerified) rolePermissionError = "NGO accounts must be verified to claim food donations.";
  
  const canClaim = !isExpired && !isSoldOut && !isOwner && !isNotAllowedRole && user?.id && !rolePermissionError;
  const displayPrice = isNGOPriceActive ? 0 : parseFloat(recipe.discountPrice || recipe.price || 0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 0', animation: 'fadeIn 0.4s ease-out' }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>

      <div className="recipe-details-grid">
        {/* Left Column: Image and Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ borderRadius: '1.5rem', overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
            <img src={recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
              alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'; }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, rgba(0,0,0,0.3))' }} />
            {recipe.allowedRoles?.includes('ngo') && recipe.allowedRoles?.length === 1 && (
              <div style={{ position:'absolute', top:'16px', right:'16px', background:'linear-gradient(135deg, #7c3aed, #6d28d9)', color:'white', padding:'0.4rem 0.85rem', borderRadius:'0.75rem', fontSize:'0.78rem', fontWeight:'800' }}>NGO ONLY</div>
            )}
          </div>

          {recipe.description && (
            <div style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
              padding: '1.5rem', borderRadius: '1.25rem',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 4px 20px -4px rgba(0,0,0,0.06)'
            }}>
              <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.4rem' }}>Description</span>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>{recipe.description}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>{recipe.title}</h1>
            <p style={{ margin: '0.5rem 0 0', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
              by {donorName || recipe.restaurant}
              {recipe.donorVerified && <VerifiedBadge size="18px" />}
              {recipe.category && (
                <span style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', color: '#475569', borderRadius: '4px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid #e2e8f0', textTransform: 'uppercase' }}>{recipe.category}</span>
              )}
            </p>
          </div>

          {/* Price card */}
          <div style={{
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
            padding: '1.5rem', borderRadius: '1.25rem',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 20px -4px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: "'Outfit', sans-serif", color: isNGOPriceActive ? '#8b5cf6' : '#0f172a' }}>
                {isNGOPriceActive ? 'FREE' : `₹${displayPrice.toFixed(2)}`}
              </span>
              {recipe.originalPrice && !isNGOPriceActive && (
                <del style={{ color: '#94a3b8', fontSize: '1.1rem' }}>₹{parseFloat(recipe.originalPrice).toFixed(2)}</del>
              )}
            </div>
            {recipe.originalPrice && !isNGOPriceActive && (
              <div style={{
                display: 'inline-flex', background: '#ecfdf5', color: '#059669',
                padding: '0.3rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '800',
                marginTop: '0.5rem'
              }}>↓ Save ₹{(recipe.originalPrice - displayPrice).toFixed(2)}</div>
            )}
            {isNGOPriceActive && (
              <div style={{ background:'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))', borderRadius:'0.75rem', padding:'0.75rem', marginTop:'0.75rem', fontSize:'0.85rem', color:'#6d28d9', fontWeight:'600' }}>
                🎉 Free for NGOs! Claim before expiry.
              </div>
            )}
          </div>

          {/* Timer & Quantity */}
          {recipe.expiryTimestamp && (
            <div style={{
              background: isExpired ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
              borderRadius: '1rem', padding: '1rem',
              border: `1px solid ${isExpired ? '#fecaca' : '#d1fae5'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>⏱ Time left</span>
                <span style={{ fontWeight: '800', fontFamily: "'Outfit', sans-serif", color: isExpired ? '#ef4444' : '#059669' }}>{timeLeft}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(248,250,252,0.6)', padding: '0.75rem 1rem', borderRadius: '0.85rem' }}>
            <span style={{ color: '#64748b', fontWeight: '600' }}>Available: <b style={{ color: '#0f172a' }}>{recipe.quantity}</b></span>
            <span style={{ color: '#64748b', fontWeight: '600' }}>Until: <b style={{ color: '#0f172a' }}>{recipe.availableUntil}</b></span>
          </div>

          {recipe.address && (
            <div style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
              padding: '1rem', borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 4px 20px -4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pickup Address</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>{recipe.address}</span>
              </div>
            </div>
          )}

          {canClaim && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Delivery Method Selector */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>How would you like to get it?</label>
                <div className="delivery-selector">
                  {[
                    { 
                      value: 'self-pickup', 
                      label: 'Self Pickup', 
                      desc: 'Go to the store yourself', 
                      icon: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z', 
                      color: '#10b981',
                      badge: 'Preferred',
                      badgeBg: '#ecfdf5',
                      badgeBorder: '#a7f3d0',
                      badgeColor: '#047857'
                    },
                    { 
                      value: 'delivery-partner', 
                      label: 'Delivery Partner', 
                      desc: 'Get it delivered to you', 
                      icon: 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12', 
                      color: '#8b5cf6',
                      badge: 'Charges Applied',
                      badgeBg: '#fffbeb',
                      badgeBorder: '#fde68a',
                      badgeColor: '#b45309'
                    }
                  ].map(opt => (
                    <button type="button" key={opt.value} onClick={() => setDeliveryMethod(opt.value)}
                      style={{
                        flex: 1, padding: '1.25rem 0.75rem 1rem', borderRadius: '0.85rem', cursor: 'pointer',
                        position: 'relative',
                        border: deliveryMethod === opt.value ? `2px solid ${opt.color}` : '2px solid #f1f5f9',
                        backgroundColor: deliveryMethod === opt.value ? `${opt.color}08` : '#f8fafc',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                        transition: 'all 0.25s', fontFamily: 'inherit'
                      }}>
                      {opt.badge && (
                        <span style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          border: `1px solid ${opt.badgeBorder}`,
                          backgroundColor: opt.badgeBg,
                          color: opt.badgeColor
                        }}>
                          {opt.badge}
                        </span>
                      )}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                        stroke={deliveryMethod === opt.value ? opt.color : '#94a3b8'}
                        style={{ width: '28px', height: '28px', transition: 'all 0.25s' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                      </svg>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: deliveryMethod === opt.value ? opt.color : '#475569' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
                {deliveryMethod === 'delivery-partner' && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    fontSize: '0.78rem',
                    color: '#6d28d9',
                    lineHeight: '1.45',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1rem', marginTop: '-2px' }}>ℹ️</span>
                    <span>
                      <b>Service Disclaimer:</b> Delivery fulfillment, transit, and tracking are managed by independent third-party partners. ShareMyFood is not responsible for transit delays, order handling, or courier actions.
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity & Reserve */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', borderRadius: '0.85rem', border: '2px solid #e2e8f0', overflow: 'hidden' }}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '0.5rem 0.85rem', border: 'none', background: 'white', cursor: 'pointer', fontWeight: '800', fontSize: '1.1rem', color: '#64748b', fontFamily: 'inherit' }}>−</button>
                  <span style={{ padding: '0.5rem 1rem', fontWeight: '800', color: '#0f172a', minWidth: '40px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(recipe.quantity, quantity + 1))} style={{ padding: '0.5rem 0.85rem', border: 'none', background: 'white', cursor: 'pointer', fontWeight: '800', fontSize: '1.1rem', color: '#64748b', fontFamily: 'inherit' }}>+</button>
                </div>
                <button onClick={() => setShowConfirm(true)} style={{
                  flex: 1, padding: '0.85rem 1.5rem', borderRadius: '0.85rem', cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white',
                  fontWeight: '700', fontSize: '1.05rem', fontFamily: 'inherit',
                  boxShadow: '0 8px 20px -4px rgba(16,185,129,0.35)'
                }}>Reserve Now – ₹{(displayPrice * quantity).toFixed(2)}</button>
              </div>
            </div>
          )}

          {isSoldOut && <div style={{ textAlign: 'center', padding: '1rem', background: '#fef2f2', borderRadius: '1rem', color: '#dc2626', fontWeight: '700' }}>Out of Stock</div>}
          {isExpired && <div style={{ textAlign: 'center', padding: '1rem', background: '#fef2f2', borderRadius: '1rem', color: '#dc2626', fontWeight: '700' }}>This listing has expired</div>}
          {isNotAllowedRole && <div style={{ textAlign: 'center', padding: '1rem', background: '#f5f3ff', borderRadius: '1rem', color: '#7c3aed', fontWeight: '700' }}>This item is reserved for specific roles</div>}
          {rolePermissionError && (
            <div style={{
              padding: '1.25rem', borderRadius: '1rem',
              background: user.role === 'ngo' ? 'rgba(124,58,237,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${user.role === 'ngo' ? '#ddd6fe' : '#fecaca'}`,
              marginBottom: '1.5rem', textAlign: 'center', animation: 'shake 0.5s ease-in-out'
            }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: user.role === 'ngo' ? '#ddd6fe' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={user.role === 'ngo' ? '#7c3aed' : '#ef4444'} style={{width:'22px',height:'22px'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h4 style={{ margin: '0 0 0.25rem', color: user.role === 'ngo' ? '#6d28d9' : '#b91c1c', fontWeight: '800' }}>
                {user.role === 'ngo' ? 'Verification Required' : 'Access Restricted'}
              </h4>
              <p style={{ margin: 0, color: user.role === 'ngo' ? '#7c3aed' : '#ef4444', fontSize: '0.85rem', fontWeight: '600' }}>
                {rolePermissionError}
              </p>
              {user.role === 'ngo' && (
                <button onClick={() => navigate('/verify-partner')} style={{ marginTop: '0.85rem', padding: '0.45rem 1rem', borderRadius: '0.6rem', border: 'none', background: '#7c3aed', color: 'white', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>Get Verified Now</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-card">
            <div className="confirm-modal-icon-container">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#10b981" style={{width:'28px',height:'28px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="confirm-modal-title">Confirm Reservation</h3>
            <p className="confirm-modal-details">
              Reserve <b>{quantity}x {recipe.title}</b><br/>Total: <b style={{ color: '#0f172a' }}>₹{(displayPrice * quantity).toFixed(2)}</b>
            </p>
            <div className={`confirm-modal-badge ${deliveryMethod === 'self-pickup' ? 'self-pickup' : 'delivery-partner'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={deliveryMethod === 'self-pickup' ? '#10b981' : '#8b5cf6'} style={{width:'18px',height:'18px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d={deliveryMethod === 'self-pickup' ? 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z' : 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12'} />
              </svg>
              <span>
                {deliveryMethod === 'self-pickup' ? 'Self Pickup' : 'Delivery Partner'}
              </span>
            </div>

            {deliveryMethod === 'delivery-partner' && (
              <div className="confirm-modal-inputs-wrapper">
                <div className="confirm-modal-input-group">
                  <label>Delivery Address</label>
                  <textarea 
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your exact dropoff address..."
                    className="confirm-modal-input confirm-modal-textarea"
                    required
                  />
                </div>
                <div className="confirm-modal-input-group">
                  <label>Mobile Number</label>
                  <input 
                    type="tel"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="confirm-modal-input"
                    required
                  />
                  <p className="confirm-modal-input-hint">Enter exactly 10 digits (e.g., 9876543210)</p>
                </div>
              </div>
            )}
            <div className="confirm-modal-btn-wrapper">
              <button onClick={() => setShowConfirm(false)} className="confirm-modal-cancel-btn">Cancel</button>
              <button 
                onClick={handleClaim} 
                disabled={isSubmitting || (deliveryMethod === 'delivery-partner' && (!deliveryAddress.trim() || !deliveryPhone.trim()))} 
                className="confirm-modal-confirm-btn"
                style={{
                  background: (isSubmitting || (deliveryMethod === 'delivery-partner' && (!deliveryAddress.trim() || !deliveryPhone.trim()))) ? 'var(--slate-400)' : 'linear-gradient(135deg, #10b981, #06b6d4)',
                  cursor: (isSubmitting || (deliveryMethod === 'delivery-partner' && (!deliveryAddress.trim() || !deliveryPhone.trim()))) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
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

export default RecipeDetails;
