import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Preloader from './components/Preloader';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AddRecipe from './pages/AddRecipe';
import RecipeDetails from './pages/RecipeDetails';
import Dashboard from './pages/Dashboard';
import MyOrders from './pages/MyOrders';
import ManageDonations from './pages/ManageDonations';
import AdminPortal from './pages/AdminPortal';
import NGODashboard from './pages/NGODashboard';
import VerificationRequest from './pages/VerificationRequest';
import SubmitFeedback from './pages/SubmitFeedback';

import './App.css';

const AuthChecker = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUserStatus = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;
      try {
        const user = JSON.parse(storedUser);
        const userId = user.id || user._id;
        if (!userId) return;

        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/api/users/${userId}`);
        if (res.status === 403 || res.status === 404) {
          let msg = 'Your account has been removed by an administrator.';
          try {
            const errData = await res.json();
            if (errData.error) msg = errData.error;
          } catch (e) {}
          handleForceLogout(msg);
          return;
        }
        if (res.ok) {
          const latestUser = await res.json();
          if (latestUser.status === 'deleted') {
            handleForceLogout('Your account has been removed by an administrator.');
          } else if (latestUser.status === 'restricted') {
            handleForceLogout('Your account has been restricted. Contact admin.');
          }
        }
      } catch (err) {
        console.error("Failed to verify user status:", err);
      }
    };

    const handleForceLogout = (msg) => {
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
      navigate('/login', { state: { message: msg || 'Your account has been removed by an administrator.' } });
    };

    checkUserStatus();
  }, [location.pathname, navigate]);

  return null;
};

function App() {
  const [initializing, setInitializing] = useState(true);

  if (initializing) {
    return <Preloader onFinish={() => setInitializing(false)} />;
  }

  return (
    <Router>
      <div className="app-container">
        <ScrollToTop />
        <AuthChecker />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/add-food" element={<AddRecipe />} />
            <Route path="/food/:id" element={<RecipeDetails />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/manage-donations" element={<ManageDonations />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/ngo-dashboard" element={<NGODashboard />} />
            <Route path="/verify-partner" element={<VerificationRequest />} />
            <Route path="/feedback/:orderId" element={<SubmitFeedback />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
