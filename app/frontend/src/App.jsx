import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  const [initializing, setInitializing] = useState(true);

  if (initializing) {
    return <Preloader onFinish={() => setInitializing(false)} />;
  }

  return (
    <Router>
      <div className="app-container">
        <ScrollToTop />
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
