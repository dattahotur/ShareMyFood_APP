import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notification from '../components/Notification';

const API_URL = import.meta.env.VITE_API_URL;

const SubmitFeedback = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    const [isIssue, setIsIssue] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                console.log(`[FEEDBACK-PAGE] Fetching order details for ID: "${orderId}"`);
                const url = `/api/orders/order-detail/${orderId}`;
                console.log(`[FEEDBACK-PAGE] Full URL: ${url}`);
                const res = await axios.get(url);
                setOrder(res.data);
            } catch (err) {
                console.error("Failed to fetch order", err);
                setError("Could not load order details. Please try again later.");
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!order || !order.driverId) {
            setNotification({ message: "No driver assigned to this order.", type: 'error' });
            return;
        }
        
        setSubmitting(true);
        try {
            console.log(`[FEEDBACK-PAGE] Submitting feedback for driver: ${order.driverId}`);
            const payload = {
                rating,
                feedback,
                isIssue,
                fromId: user.id || user._id,
                fromName: user.name,
                orderId
            };
            console.log(`[FEEDBACK-PAGE] Payload:`, payload);
            
            const res = await axios.post(`/api/users/${order.driverId}/feedback`, payload);
            console.log(`[FEEDBACK-PAGE] Success:`, res.data);
            
            setNotification({ message: 'Thank you for your feedback!', type: 'success' });
            setTimeout(() => navigate('/my-orders'), 2000);
        } catch (err) {
            console.error("[FEEDBACK-PAGE] Submission error:", err.response?.data || err.message);
            setNotification({ message: `Failed to submit feedback: ${err.response?.data?.error || err.message}`, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (error) return <div className="p-8 text-center text-red-600 font-bold">{error}</div>;
    if (!order) return <div className="p-8 text-center">Loading order details...</div>;

    return (
        <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '2rem', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', position: 'relative' }}>
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Rate your experience</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>Order #{orderId.slice(-6)} • Delivered by {order.driverName || 'a partner'}</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Rating</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[1, 2, 3, 4, 5].map(num => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => setRating(num)}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                                    background: rating >= num ? '#facc15' : '#e2e8f0',
                                    color: rating >= num ? 'white' : '#64748b',
                                    cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s'
                                }}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Comment</label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us more about your experience..."
                        style={{ 
                            width: '100%', padding: '1rem', borderRadius: '0.75rem', 
                            border: '1px solid #e2e8f0', minHeight: '100px', 
                            fontFamily: 'inherit', outline: 'none'
                        }}
                    />
                </div>

                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.75rem', 
                    padding: '1rem', background: isIssue ? '#fff1f2' : '#f8fafc', 
                    borderRadius: '0.75rem', border: `1px solid ${isIssue ? '#fecaca' : '#e2e8f0'}`,
                    transition: 'all 0.2s'
                }}>
                    <input
                        type="checkbox"
                        id="isIssue"
                        checked={isIssue}
                        onChange={(e) => setIsIssue(e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isIssue" style={{ fontWeight: 600, color: isIssue ? '#dc2626' : '#64748b', cursor: 'pointer' }}>
                        I want to report an issue with the rider
                    </label>
                </div>

                <button
                    disabled={submitting}
                    style={{
                        padding: '1rem', borderRadius: '0.75rem', border: 'none',
                        background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #06b6d4)',
                        color: 'white', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </form>
        </div>
    );
};

export default SubmitFeedback;
