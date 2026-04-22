import React, { useState, useEffect } from 'react';
import './LivePoll.css';
import { getResults, castVote } from '../services/contractService';

// Safely access environment variables with multiple fallbacks
const CONTRACT_ID = process.env.REACT_APP_CONTRACT_ADDRESS || "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";

const LivePoll = ({ walletAddress }) => {
  const [question, setQuestion] = useState("Loading poll data...");
  const [options, setOptions] = useState([
    { id: 0, text: 'Fast Transactions', votes: 0 },
    { id: 1, text: 'Low Fees', votes: 0 },
    { id: 2, text: 'Soroban Contracts', votes: 0 },
    { id: 3, text: 'Asset Issuance', votes: 0 }
  ]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [txStatus, setTxStatus] = useState(null); // 'pending', 'success', 'error'
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Robust Fetching Logic
  useEffect(() => {
    let isMounted = true;
    const fetchPollData = async () => {
      try {
        const results = await getResults(CONTRACT_ID);
        if (isMounted && results && Array.isArray(results)) {
          setOptions(prev => prev.map((opt, i) => ({ 
            ...opt, 
            votes: typeof results[i] === 'number' ? results[i] : (Number(results[i]) || 0) 
          })));
          setQuestion("What is your favorite Stellar feature?");
        }
      } catch (err) {
        console.error("Poll fetch error:", err);
        if (isMounted) setErrorMsg("Failed to load poll results. Please check your network.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPollData();
    return () => { isMounted = false; };
  }, []);

  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);

  const handleVote = async () => {
    if (!walletAddress) {
      setErrorMsg('Wallet not connected');
      setTxStatus('error');
      return;
    }
    if (selectedOption === null) return;

    setIsVoting(true);
    setTxStatus('pending');
    setErrorMsg('');
    setTxHash('');

    try {
      const hash = await castVote(walletAddress, CONTRACT_ID, selectedOption);
      setTxStatus('success');
      setTxHash(hash);
      
      // Refresh results after successful vote
      const latestResults = await getResults(CONTRACT_ID);
      if (latestResults && Array.isArray(latestResults)) {
        setOptions(prev => prev.map((opt, i) => ({ 
          ...opt, 
          votes: Number(latestResults[i]) || 0 
        })));
      }
    } catch (err) {
      setTxStatus('error');
      let msg = err.message || 'Transaction failed';
      if (msg.includes('Unreachable') || msg.includes('InvalidAction') || msg.includes('Simulation failed')) {
        msg = "You have already voted in this poll! (One vote per address)";
      }
      setErrorMsg(msg);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="live-poll-card glass-panel">
      <h2 className="poll-question">{isLoading ? "Connecting to Soroban..." : question}</h2>

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

      {txStatus === 'pending' && <p className="status-msg info">Please sign the transaction in Freighter...</p>}
      {txStatus === 'success' && (
        <div className="status-msg success">
          <p>✅ Vote successful!</p>
          {txHash && <small>Tx: {txHash.substring(0, 10)}...</small>}
        </div>
      )}
      {txStatus === 'error' && <p className="status-msg error">❌ {errorMsg}</p>}
    </div>
  );
};

export default LivePoll;
