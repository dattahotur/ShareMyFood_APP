import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from '../components/Notification';
import useNavigationGuard from '../hooks/useNavigationGuard';
import VerifiedBadge from '../components/VerifiedBadge';

const tabs = ['Reports', 'Verification', 'Analytics', 'Users'];

const API_URL = import.meta.env.VITE_API_URL;

const AdminPortal = () => {
  const navigate = useNavigate();
  useNavigationGuard();
  const [activeTab, setActiveTab] = useState('Reports');
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [confirmRestrict, setConfirmRestrict] = useState(null); // { report, donor }

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (u.role !== 'admin') { navigate('/'); return; }
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [ordRes, usrRes, recRes] = await Promise.all([
          fetch(`${API_URL}/api/orders`),fetch(`${API_URL}/api/users`),fetch(`${API_URL}/api/recipes`)
        ]);
        const ordData = await ordRes.json();
        const usrData = await usrRes.json();
        const recData = await recRes.json();
        setReports(ordData.filter(o => o.foodReported === true && o.status !== 'resolved'));
        setAllOrders(ordData);
        setUsers(usrData);
        setRecipes(recData);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [navigate]);

  const handleVerify = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/verify`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationStatus: 'verified' }) });
      if (res.ok) {
        setNotification({ message: 'Partner verified!', type: 'success' });
        setUsers(prev => prev.map(u => u.id === userId || u._id === userId ? { ...u, verificationStatus: 'verified' } : u));
      }
    } catch { setNotification({ message: 'Verification failed.', type: 'error' }); }
  };

  const handleRejectVerification = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/verify`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationStatus: 'rejected' }) });
      if (res.ok) {
        setNotification({ message: 'Verification rejected.', type: 'info' });
        setUsers(prev => prev.map(u => u.id === userId || u._id === userId ? { ...u, verificationStatus: 'rejected' } : u));
      }
    } catch { setNotification({ message: 'Action failed.', type: 'error' }); }
  };

  const handleDeleteUser = (userId) => {
    setConfirmDeleteUser(userId);
  };

  const executeDeleteUser = async () => {
    const userId = confirmDeleteUser;
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ message: 'User deleted.', type: 'success' });
        setUsers(prev => prev.filter(u => (u.id || u._id) !== userId));
      }
    } catch { setNotification({ message: 'Failed to delete user.', type: 'error' }); }
    finally { setConfirmDeleteUser(null); }
  };

  const [manualId, setManualId] = useState('');
  const [showManualAction, setShowManualAction] = useState(null); // { report, type }

  const handleAction = async (report, type, overrideId = null) => {
    const rId = report._id || report.id;
    const recipe = recipes.find(rc => String(rc.id || rc._id) === String(report.recipeId));
    const donorId = overrideId || report.donorId || recipe?.donorId;
    
    if (!donorId) { 
      setShowManualAction({ report, type });
      return; 
    }

    // Optimistic UI update: Remove from list immediately
    setReports(prev => prev.filter(r => (r._id || r.id) !== rId));
    
    try {
      if (type === 'restrict') {
        fetch(`${API_URL}/api/users/${donorId}/restrict`, { method: 'PUT' }); // Background fire-and-forget
      } else {
        const donor = users.find(u => String(u.id || u._id) === String(donorId));
                await fetch(`${API_URL}/api/users/warn-rider-final`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: donorId,
                  donorId: donorId,
                  reason: report.reportReason,
                  adminName: "Platform Admin",
                  orderId: rId
          })
        });
        setUsers(prev => prev.map(u => {
          if (String(u.id || u._id) === String(donorId)) {
            const currentWarnings = u.warnings || [];
            return {
              ...u,
              warnings: [...currentWarnings, { id: Date.now(), reason: report.reportReason }]
            };
          }
          return u;
        }));
      }
      // Resolve the report in order service
      fetch(`${API_URL}/api/orders/${rId}/resolve`, { method: 'PUT' });
      setNotification({ message: 'Action processed.', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Background action encountered an issue.', type: 'error' });
    }
  };

  const handleResolveReport = async (orderId) => {
    // Optimistic UI update: Remove from list immediately
    setReports(prev => prev.filter(r => (r._id || r.id) !== orderId));
    
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/resolve`, { method: 'PUT' });
      if (res.ok) {
        setNotification({ message: 'Report resolved.', type: 'success' });
      }
    } catch { 
      setNotification({ message: 'Network sync failed.', type: 'error' }); 
    }
  };

  const handleRestrictClick = (r) => {
    setConfirmRestrict(r);
  };

  const executeRestrict = async () => {
    if (!confirmRestrict) return;
    const report = confirmRestrict;
    const recipe = recipes.find(rc => String(rc.id || rc._id) === String(report.recipeId));
    const donorId = report.donorId || recipe?.donorId;
    const rId = report._id || report.id;
    
    // Optimistic UI update for reports
    setReports(prev => prev.filter(r => (r._id || r.id) !== rId));
    
    // Update local users list state so the user is removed from users list
    if (donorId) {
      setUsers(prev => prev.filter(u => (u.id || u._id) !== donorId));
    }

    try {
      if (donorId) {
        await fetch(`${API_URL}/api/users/${donorId}/restrict`, { method: 'PUT' });
      }
      await fetch(`${API_URL}/api/orders/${rId}/resolve`, { method: 'PUT' });
      setNotification({ message: 'Donor restricted and report resolved.', type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Failed to complete the restriction.', type: 'error' });
    } finally {
      setConfirmRestrict(null);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="loader"></div></div>;

  const pendingVerifications = users.filter(u => u.verificationStatus === 'pending');
  const totalMeals = allOrders.filter(o => o.status !== 'reported').reduce((s, o) => s + (o.quantity || 0), 0);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem 0', minHeight: '80vh', animation: 'fadeIn 0.4s ease-out' }}>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />

      <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '1.5rem',
        padding: '2.5rem 2rem', marginTop: '1.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position:'absolute', width:'350px', height:'350px', borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.1) 0%,transparent 70%)', top:'-120px', right:'-80px', pointerEvents:'none' }} />
        <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: '800', color: 'white', position: 'relative', zIndex: 1 }}>Admin Portal</h1>
        <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}>Manage platform operations</p>
      </div>

      {/* Tabs */}
      <div className="admin-portal-tabs">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: '700',
            fontSize: '0.88rem', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            transition: 'all 0.25s',
            ...(activeTab === tab
              ? { background: 'white', color: '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
              : { background: 'transparent', color: '#64748b' })
          }}>
            {tab}
            {tab === 'Reports' && reports.length > 0 && (
              <span style={{ marginLeft: '6px', background: '#ef4444', color: 'white', borderRadius: '9999px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: '800' }}>{reports.length}</span>
            )}
            {tab === 'Verification' && pendingVerifications.length > 0 && (
              <span style={{ marginLeft: '6px', background: '#f59e0b', color: 'white', borderRadius: '9999px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: '800' }}>{pendingVerifications.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* REPORTS TAB */}
      {activeTab === 'Reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reports.length > 0 ? reports.map((r, i) => {
            const recipe = recipes.find(rc => rc.id === r.recipeId);
            const donor = users.find(u => String(u.id) === String(r.donorId));
            const rId = r._id || r.id;
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                padding: '1.5rem', borderRadius: '1.25rem', borderLeft: '4px solid #ef4444',
                border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontWeight: '700', color: '#0f172a' }}>{recipe ? recipe.title : `Order #${rId}`}</h3>
                    <p style={{ margin: '0.2rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                      Reported on {new Date(r.timestamp).toLocaleString()} 
                      {donor && <span style={{ marginLeft: '8px', color: '#ef4444', fontWeight: '700' }}>• Donor: {donor.name}</span>}
                    </p>
                    
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Details:</span>
                      <p style={{ margin: 0, color: '#334155', fontSize: '0.88rem', lineHeight: '1.4' }}>{r.reportReason || 'No details provided.'}</p>
                    </div>

                    {(r.reportProofImage || r.evidenceImage) && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Proof:</span>
                        <img 
                          src={r.reportProofImage || r.evidenceImage} 
                          alt="Report Proof" 
                          onClick={() => setSelectedPhoto(r.reportProofImage || r.evidenceImage)}
                          style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '0.5rem', cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }}
                          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                    <button onClick={() => handleResolveReport(rId)} style={{
                      padding: '0.5rem 1rem', borderRadius: '0.6rem', border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                      fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                    }}>Resolve Only</button>
                    
                    <button onClick={() => handleAction(r, 'warning')} style={{
                      padding: '0.5rem 1rem', borderRadius: '0.6rem', border: '1px solid #10b981',
                      background: 'white', color: '#059669',
                      fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                    }}>Send Warning & Resolve</button>

                    <button onClick={() => handleRestrictClick(r)} style={{
                      padding: '0.5rem 1rem', borderRadius: '0.6rem', border: '1px solid #ef4444',
                      background: 'rgba(239,68,68,0.05)', color: '#ef4444',
                      fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                    }}>Restrict Donor & Resolve</button>
                  </div>
                </div>
              </div>
            );
          }) : <EmptyState text="No open reports" />}
        </div>
      )}

      {/* VERIFICATION TAB */}
      {activeTab === 'Verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingVerifications.length > 0 ? pendingVerifications.map((u, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
              padding: '1.5rem', borderRadius: '1.25rem', borderLeft: '4px solid #f59e0b',
              border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: '700', color: '#0f172a' }}>{u.name}</h3>
                  <p style={{ margin: '0.2rem 0', color: '#64748b', fontSize: '0.85rem' }}>{u.email} · Role: {u.role}</p>
                  {u.verificationDocs && u.verificationDocs.length > 0 ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.4rem' }}>Verification Photo:</p>
                      <div style={{
                        width: '120px', height: '80px', borderRadius: '0.5rem', overflow: 'hidden',
                        border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }} onClick={() => setSelectedPhoto(u.verificationDocs[0].url)}>
                        <img src={u.verificationDocs[0].url} alt="Document" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.5rem' }}>No photo uploaded</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleVerify(u.id || u._id)} style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Verify</button>
                  <button onClick={() => handleRejectVerification(u.id || u._id)} style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid #fecaca', background: 'rgba(254,226,226,0.4)', color: '#dc2626', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>✕ Reject</button>
                </div>
              </div>
            </div>
          )) : <EmptyState text="No pending verifications" />}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'Analytics' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Users', value: users.length, color: '#3b82f6' },
              { label: 'Total Listings', value: recipes.length, color: '#10b981' },
              { label: 'Total Orders', value: allOrders.length, color: '#8b5cf6' },
              { label: 'Meals Rescued', value: totalMeals, color: '#f59e0b' },
              { label: 'Waste Prevented', value: `${(totalMeals * 0.5).toFixed(1)} kg`, color: '#06b6d4' },
              { label: 'Active Reports', value: reports.length, color: '#ef4444' }
            ].map((s, i) => (
              <div key={i} className="hover-lift" style={{
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                padding: '1.5rem', borderRadius: '1.25rem', textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.04)',
                borderTop: `3px solid ${s.color}`
              }}>
                <span style={{ fontSize: '2rem', fontWeight: '900', fontFamily: "'Outfit', sans-serif", color: '#0f172a', display: 'block' }}>{s.value}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'Users' && (
        <div style={{
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
          borderRadius: '1.25rem', overflowX: 'auto',
          border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.05)'
        }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Name', 'Email', 'Role', 'Verified', 'Warnings', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontWeight: '700', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: '600', color: '#0f172a' }}>{u.name}</td>
                  <td style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.9rem' }}>{u.email}</td>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: '700', textTransform: 'uppercase',
                      ...(u.role === 'admin' ? { background: '#dbeafe', color: '#2563eb' } : u.role === 'restaurant' ? { background: '#dcfce7', color: '#15803d' } : u.role === 'ngo' ? { background: '#f3e8ff', color: '#7c3aed' } : { background: '#f1f5f9', color: '#475569' })
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    {u.verificationStatus === 'verified' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <VerifiedBadge size="16px" />
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.85rem' }}>Verified</span>
                      </div>
                    ) : u.verificationStatus === 'pending' ? (
                      <span style={{ color: '#f59e0b', fontWeight: '700', fontSize: '0.85rem' }}>⏳ Pending</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: '700', color: (u.warnings?.length || 0) > 0 ? '#ef4444' : '#64748b' }}>
                    {u.warnings?.length || 0}
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id || u._id)} style={{
                        padding: '0.35rem 0.7rem', borderRadius: '0.5rem', border: 'none',
                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                        fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit'
                      }}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Image Modal */}
      {selectedPhoto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setSelectedPhoto(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Verification Full" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '4px solid white' }} />
            <button onClick={() => setSelectedPhoto(null)} className="admin-photo-modal-close">×</button>
          </div>
        </div>
      )}
      {/* Confirm Delete User Modal */}
      {confirmDeleteUser && (
        <div className="app-modal-overlay">
          <div className="app-modal-card" style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ef4444" style={{width:'28px',height:'28px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9.14c-.05.92-.78 1.66-1.7 1.66H11.3c-.92 0-1.65-.74-1.7-1.66L9.26 9m9.96-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontFamily: "'Outfit', sans-serif", fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>Delete User</h3>
            <p style={{ color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.5, fontSize: '0.92rem' }}>
              Are you sure you want to delete this user permanently? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirmDeleteUser(null)} style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0',
                background: 'white', fontWeight: '700', color: '#475569', cursor: 'pointer', fontFamily: 'inherit'
              }}>Cancel</button>
              <button onClick={executeDeleteUser} style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.85rem', border: 'none',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                fontWeight: '700', color: 'white', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 6px 16px -3px rgba(239,68,68,0.3)'
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Restrict Modal */}
      {confirmRestrict && (
        <div className="app-modal-overlay">
          <div className="app-modal-card" style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ef4444" style={{width:'28px',height:'28px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9.14c-.05.92-.78 1.66-1.7 1.66H11.3c-.92 0-1.65-.74-1.7-1.66L9.26 9m9.96-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontFamily: "'Outfit', sans-serif", fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>Confirm Account Restriction</h3>
            <p style={{ color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.5, fontSize: '0.92rem' }}>
              Are you sure you want to restrict this account?
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirmRestrict(null)} style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.85rem', border: '1px solid #e2e8f0',
                background: 'white', fontWeight: '700', color: '#475569', cursor: 'pointer', fontFamily: 'inherit'
              }}>Cancel</button>
              <button onClick={executeRestrict} style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.85rem', border: 'none',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                fontWeight: '700', color: 'white', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 6px 16px -3px rgba(239,68,68,0.3)'
              }}>Confirm Restriction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ text }) => (
  <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
    <p style={{ color: '#64748b', margin: 0 }}>{text}</p>
  </div>
);

const backBtnStyle = { display:'flex', alignItems:'center', gap:'0.5rem', color:'#64748b', fontWeight:'700', fontSize:'0.88rem', padding:'0.55rem 1.15rem', borderRadius:'9999px', background:'rgba(255,255,255,0.9)', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', cursor:'pointer', backdropFilter:'blur(8px)', fontFamily:'inherit' };

export default AdminPortal;
