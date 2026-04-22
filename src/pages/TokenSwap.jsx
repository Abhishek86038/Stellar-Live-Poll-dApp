import React, { useState } from 'react';
import { ArrowDownUp, Info } from 'lucide-react';
import * as advancedService from '../services/advancedContractService';

const TokenSwap = ({ walletAddress }) => {
  const [fromAmount, setFromAmount] = useState('');
  const [isXPollIn, setIsXPollIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const exchangeRate = isXPollIn ? 0.25 : 4; // 1 XPOLL = 0.25 XLM

  const handleSwap = async (e) => {
    e.preventDefault();
    if (!walletAddress) return alert("Connect wallet");
    setLoading(true);
    try {
      await advancedService.swapTokens(walletAddress, fromAmount, isXPollIn);
      alert("Swap successful!");
    } catch (err) {
      alert("Swap failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="swap-page-container flex-center">
      <div className="glass-panel swap-card">
        <div className="swap-header">
          <h2>Token Swap</h2>
          <span className="rate-badge">1 XLM = 4 XPOLL</span>
        </div>

        <form onSubmit={handleSwap} className="swap-form">
          <div className="input-group">
            <div className="input-header">
              <span>From</span>
              <span className="balance">Balance: 1250.00</span>
            </div>
            <div className="input-row">
              <input 
                type="number" 
                value={fromAmount} 
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
              />
              <span className="token-name">{isXPollIn ? 'XPOLL' : 'XLM'}</span>
            </div>
          </div>

          <div className="divider-row">
            <button 
              type="button" 
              className="circle-toggle" 
              onClick={() => setIsXPollIn(!isXPollIn)}
            >
              <ArrowDownUp size={20} />
            </button>
          </div>

          <div className="input-group">
            <div className="input-header">
              <span>To (Estimated)</span>
              <span className="balance">Balance: 45.20</span>
            </div>
            <div className="input-row">
              <input 
                type="text" 
                value={fromAmount ? (Number(fromAmount) * exchangeRate).toFixed(2) : ''} 
                readOnly
                placeholder="0.0"
              />
              <span className="token-name">{isXPollIn ? 'XLM' : 'XPOLL'}</span>
            </div>
          </div>

          <div className="swap-info glass-panel">
            <div className="info-item">
              <Info size={14} />
              <span>Slippage Tolerance</span>
              <span className="val">0.5%</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary swap-btn" disabled={loading || !fromAmount}>
            {loading ? 'Processing...' : 'Swap Tokens'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TokenSwap;
