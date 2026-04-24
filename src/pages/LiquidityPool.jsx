import React, { useState, useEffect } from 'react';
import { Droplets, Plus, Info } from 'lucide-react';
import * as advancedService from '../services/advancedContractService';

const LiquidityPool = ({ walletAddress }) => {
  const [amounts, setAmounts] = useState({ xpoll: '', native: '' });
  const [reserves, setReserves] = useState({ xpoll: '0.00', native: '0.00' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const fetchReserves = async () => {
    try {
      const data = await advancedService.getPoolReserves();
      setReserves(data);
    } catch (err) {
      console.error("Fetch reserves error:", err);
    }
  };

  useEffect(() => {
    fetchReserves();
    const interval = setInterval(fetchReserves, 10000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    if (!walletAddress) return alert("Connect wallet first");
    
    setLoading(true);
    setStatus("Processing transaction...");
    try {
      // Note: Real addLiquidity call would go here
      // await advancedService.addLiquidity(walletAddress, amounts.xpoll, amounts.native);
      alert("Liquidity added successfully! (In a real scenario, this would trigger a Soroban contract call)");
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
          <p>Provide liquidity to enable swaps and earn rewards.</p>
        </div>

        <div className="reserves-display glass-panel">
          <div className="reserve-item">
            <span className="label">XPOLL Reserves</span>
            <strong className="value">{reserves.xpoll}</strong>
          </div>
          <div className="reserve-item">
            <span className="label">XLM Reserves</span>
            <strong className="value">{reserves.native}</strong>
          </div>
        </div>

        {reserves.xpoll === '0.00' && (
          <div className="status-banner warning">
            ⚠️ The pool is empty. Swaps will result in 0 tokens until liquidity is added.
          </div>
        )}

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
            <small>Providing liquidity helps others swap and keeps the ecosystem alive.</small>
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
