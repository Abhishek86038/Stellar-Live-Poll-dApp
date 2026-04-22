import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Award, Clock } from 'lucide-react';
import * as advancedService from '../services/advancedContractService';

const Dashboard = ({ walletAddress }) => {
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({
    pollsCreated: 3,
    votesCast: 12,
    rewardsEarned: 450
  });

  useEffect(() => {
    if (walletAddress) {
      advancedService.getTokenBalance(walletAddress).then(setBalance);
    }
  }, [walletAddress]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        {/* User Info Card */}
        <div className="glass-panel stat-card main-stat">
          <div className="stat-header">
            <Wallet size={32} className="icon-blue" />
            <h3>XPOLL Balance</h3>
          </div>
          <div className="stat-value">{balance} <span className="denom">XPOLL</span></div>
          <div className="stat-footer">≈ {(balance * 0.25).toFixed(2)} XLM</div>
        </div>

        {/* Stats Row */}
        <div className="glass-panel stat-card">
          <TrendingUp size={24} className="icon-cyan" />
          <div className="stat-label">Polls Created</div>
          <div className="stat-small-value">{stats.pollsCreated}</div>
        </div>

        <div className="glass-panel stat-card">
          <Award size={24} className="icon-aqua" />
          <div className="stat-label">Rewards Earned</div>
          <div className="stat-small-value">{stats.rewardsEarned} XP</div>
        </div>

        <div className="glass-panel stat-card">
          <Clock size={24} className="icon-blue" />
          <div className="stat-label">Votes Cast</div>
          <div className="stat-small-value">{stats.votesCast}</div>
        </div>
      </div>

      <div className="recent-activity-section glass-panel mt-6">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="dot success"></span>
            <span className="activity-text">Voted on "Soroban Adoption" poll</span>
            <span className="activity-time">2h ago</span>
          </div>
          <div className="activity-item">
            <span className="dot info"></span>
            <span className="activity-text">Swapped 100 XLM for 400 XPOLL</span>
            <span className="activity-time">5h ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
