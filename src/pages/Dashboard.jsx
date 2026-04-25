import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Award, Clock } from 'lucide-react';
import * as advancedService from '../services/advancedContractService';

const Dashboard = ({ walletAddress }) => {
  const [balance, setBalance] = useState('0.00');
  const [stats, setStats] = useState({
    pollsCreated: 0,
    votesCast: 0,
    rewardsEarned: 0,
    xlmBalance: '0.00'
  });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const [xpoll, xlm, recent] = await Promise.all([
        advancedService.getTokenBalance(walletAddress),
        advancedService.getNativeBalance(walletAddress),
        advancedService.getRecentActivity(walletAddress)
      ]);
      setBalance(xpoll);
      setStats(prev => ({ 
        ...prev, 
        xlmBalance: xlm
      }));
      setActivity(recent);

      // Check for first 20 polls now that it's safe
      let count = 0;
      for (let i = 1; i <= 20; i++) {
        const p = await advancedService.getAdvancedPollResults(i);
        if (p) count = i;
        else break; // Stop when no more polls are found
      }
      setStats(prev => ({ ...prev, pollsCreated: count }));
    } catch (err) {
      console.error("Dashboard data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        <div className="glass-panel stat-card main-stat anim-fade-in">
          <div className="stat-header">
            <Wallet size={32} className="icon-blue" />
            <h3>XPOLL Balance</h3>
          </div>
          <div className="stat-value">{balance} <span className="denom">XPOLL</span></div>
          {/* XLM balance hidden for now as requested */}
        </div>

        <div className="glass-panel stat-card anim-fade-in">
          <TrendingUp size={24} className="icon-cyan" />
          <div className="stat-label">Polls Created</div>
          <div className="stat-small-value">{stats.pollsCreated}</div>
        </div>
      </div>

      <div className="recent-activity-section glass-panel mt-6 anim-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3>Recent Blockchain Activity</h3>
          {loading && <small className="pulse-blue">Syncing...</small>}
        </div>
        <div className="activity-list">
          {activity.length > 0 ? (
            activity.map((tx, i) => (
              <div key={i} className="activity-item">
                <span className={`dot ${tx.successful ? 'success' : 'error'}`}></span>
                <span className="activity-text">
                  Transaction: {tx.hash.substring(0, 12)}...
                </span>
                <span className="activity-time">
                  {new Date(tx.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <p className="empty-msg">No recent transactions found on the ledger.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
