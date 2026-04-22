import React, { useState, useEffect, useCallback } from 'react';
import './LivePoll.css';
import * as contractService from '../services/contractService';

const LivePoll = ({ walletAddress }) => {
  const [question, setQuestion] = useState("Loading...");
  const [options, setOptions] = useState([
    { id: 0, text: 'Fast Transactions', votes: 0 },
    { id: 1, text: 'Low Fees', votes: 0 },
    { id: 2, text: 'Soroban Contracts', votes: 0 },
    { id: 3, text: 'Asset Issuance', votes: 0 }
  ]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Hardcoded ID as fallback to ensure it NEVER crashes
  const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";

  useEffect(() => {
    let mounted = true;
    const fetchResults = async () => {
      try {
        const results = await contractService.getResults(CONTRACT_ID);
        if (mounted && results) {
          setOptions(prev => prev.map((opt, i) => ({ 
            ...opt, 
            votes: Number(results[i]) || 0 
          })));
          setQuestion("What is your favorite Stellar feature?");
        }
      } catch (err) {
        console.error("Poll fetch failed", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchResults();
    const interval = setInterval(fetchResults, 5000); // Polling every 5s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);

  const handleVote = async () => {
    if (!walletAddress) {
      setErrorMsg('Connect Wallet First');
      setTxStatus('error');
      return;
    }
    if (selectedOption === null) return;
    if (pollStatus.is_closed) return;

    setIsVoting(true);
    setTxStatus('pending');
    setErrorMsg('');

    try {
      const hash = await contractService.castVote(walletAddress, CONTRACT_ID, selectedOption);
      setTxStatus('success');
      setTxHash(hash);
      
      const latest = await contractService.getResults(CONTRACT_ID);
      if (latest) {
        setOptions(prev => prev.map((opt, i) => ({ ...opt, votes: Number(latest[i]) || 0 })));
      }
    } catch (err) {
      setTxStatus('error');
      let msg = err.message || 'Transaction failed';
      if (msg.includes('Unreachable') || msg.includes('InvalidAction') || msg.includes('Simulation')) {
        msg = "You have already voted!";
      }
      setErrorMsg(msg);
    } finally {
      setIsVoting(false);
    }
  };

  const handleClosePoll = async () => {
    if (!walletAddress) return;
    try {
      setIsVoting(true);
      setTxStatus('pending');
      const hash = await closePoll(walletAddress, null);
      setTxStatus('success');
      setTxHash(hash);
      addToast('Poll successfully closed', 'success');
      loadPollData();
    } catch (error) {
      setTxStatus('error');
      setErrorMsg('Failed to close poll');
      addToast('Closure failed', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  const getWinnerInfo = () => {
    if (!pollStatus.is_closed || options.length === 0) return null;
    let winner = options[0];
    for (const opt of options) {
      if (opt.votes > winner.votes) winner = opt;
    }
    return winner;
  };

  const winner = getWinnerInfo();

  return (
    <div className="live-poll-card glass-panel">
      <h2 className="poll-question">{isLoading ? "Syncing with Stellar..." : question}</h2>

      <div className="poll-options">
        {options.map((opt, index) => {
          const percentage = totalVotes === 0 ? 0 : Math.round(((opt.votes || 0) / totalVotes) * 100);
          return (
            <label key={opt.id} className={`poll-option ${selectedOption === index ? 'selected' : ''}`}>
              <div className="option-header">
                <div className="option-input-group">
                  <input
                    type="radio"
                    name="poll-option"
                    disabled={isVoting || isLoading}
                    checked={selectedOption === index}
                    onChange={() => setSelectedOption(index)}
                  />
                  <span className="option-text">{opt.text}</span>
                </div>
                <span className="option-votes">{opt.votes || 0} votes ({percentage}%)</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="poll-actions">
        <button 
          className="btn btn-vote" 
          disabled={isVoting || selectedOption === null || isLoading}
          onClick={handleVote}
        >
          {isVoting ? 'Processing...' : 'Cast Vote'}
        </button>
      </div>

      {txStatus === 'pending' && <p className="status-msg info">Signing Transaction...</p>}
      {txStatus === 'success' && <p className="status-msg success">✅ Vote Recorded! Hash: {txHash.substring(0, 8)}...</p>}
      {txStatus === 'error' && <p className="status-msg error">❌ {errorMsg}</p>}
    </div>
  );
};

export default LivePoll;
