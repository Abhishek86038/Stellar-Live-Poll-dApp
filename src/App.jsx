import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Vote, Repeat, Droplets } from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import Dashboard from './pages/Dashboard';
import TokenSwap from './pages/TokenSwap';
import LivePoll from './components/LivePoll';
import LiquidityPool from './pages/LiquidityPool';
import EventStream from './components/EventStream';
import ToastNotification from './components/ToastNotification';
import './styles/App.css';

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <div className="header-brand">
            <h1>Stellar Live Poll</h1>
            <span className="subtitle">Level 4 🌊 Green Belt Edition</span>
          </div>

          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
            <NavLink to="/polls" className={({ isActive }) => isActive ? 'active' : ''}>Polls</NavLink>
            <NavLink to="/swap" className={({ isActive }) => isActive ? 'active' : ''}>Swap</NavLink>
          </nav>
        </header>

        <main className="app-main-grid">
          <aside className="app-sidebar">
            <WalletConnect 
              onConnect={setWalletAddress} 
              onDisconnect={() => setWalletAddress(null)} 
            />
          </aside>

          <section className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard walletAddress={walletAddress} />} />
              <Route path="/polls" element={<LivePoll walletAddress={walletAddress} />} />
              <Route path="/swap" element={<TokenSwap walletAddress={walletAddress} />} />
              <Route path="/pool" element={<LiquidityPool walletAddress={walletAddress} />} />
            </Routes>
          </section>
        </main>

        {/* Mobile Navbar */}
        <nav className="mobile-nav">
          <NavLink to="/"><LayoutDashboard size={24} /></NavLink>
          <NavLink to="/polls"><Vote size={24} /></NavLink>
          <NavLink to="/swap"><Repeat size={24} /></NavLink>
          <NavLink to="/pool"><Droplets size={24} /></NavLink>
        </nav>

        {toast.show && (
          <ToastNotification 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast({ ...toast, show: false })} 
          />
        )}
      </div>
    </Router>
  );
};

export default App;
