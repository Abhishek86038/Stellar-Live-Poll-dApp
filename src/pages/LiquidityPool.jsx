import React, { useState, useEffect } from 'react';
import { Droplets, Plus, Info } from 'lucide-react';
import * as advancedService from '../services/advancedContractService';

const LiquidityPool = ({ walletAddress }) => {
  const [amounts, setAmounts] = useState({ xpoll: '', native: '' });
  const [reserves, setReserves] = useState({ xpoll: '0', native: '0' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const fetchReserves = async () => {
    // This would call get_reserves from the contract
    // For now, we simulation the fetch to show UI integration
    console.log("Fetching reserves...");
  };

  useEffect(() => {
    fetchReserves();
  }, []);

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    if (!walletAddress) return alert("Connect wallet first");
    
    setLoading(true);
    setStatus("Processing transaction...");
    try {
      // Logic for advancedService.addLiquidity would go here
      alert("Liquidity added successfully!");
      fetchReserves();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  return (
    <div className="pool-page-container flex-center">
      <div className="glass-panel pool-card">
        <div className="pool-header">
          <Droplets size={32} className="icon-blue" />
          <h2>Liquidity Pool</h2>
          <p>Provide liquidity to earn rewards and enable swaps.</p>
        </div>

        <div className="reserves-display glass-panel">
          <div className="reserve-item">
            <span>XPOLL Reserved</span>
            <strong>{reserves.xpoll}</strong>
          </div>
          <div className="reserve-item">
            <span>XLM Reserved</span>
            <strong>{reserves.native}</strong>
          </div>
        </div>

        <form onSubmit={handleAddLiquidity} className="pool-form">
          <div className="input-group">
            <label>Amount (XPOLL)</label>
            <input 
              type="number" 
              value={amounts.xpoll} 
              onChange={(e) => setAmounts({ ...amounts, xpoll: e.target.value })} 
              placeholder="0.0"
            />
          </div>

          <div className="plus-icon"><Plus size={20} /></div>

          <div className="input-group">
            <label>Amount (XLM)</label>
            <input 
              type="number" 
              value={amounts.native} 
              onChange={(e) => setAmounts({ ...amounts, native: e.target.value })} 
              placeholder="0.0"
            />
          </div>

          <div className="pool-info glass-panel">
            <Info size={14} />
            <small>By adding liquidity, you will receive LP tokens representing your share of the pool.</small>
          </div>

          <button type="submit" className="btn btn-primary pool-btn" disabled={loading}>
            {loading ? 'Adding...' : 'Add Liquidity'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiquidityPool;
