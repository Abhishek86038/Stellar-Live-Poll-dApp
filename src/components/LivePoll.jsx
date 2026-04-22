import React, { useState, useEffect } from 'react';
import './LivePoll.css';
import { getResults, castVote } from '../services/contractService';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";

const LivePoll = ({ walletAddress }) => {
  const [question, setQuestion] = useState("Loading poll...");
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

  // Initial Data Fetch
  useEffect(() => {
    const initFetch = async () => {
      try {
        const results = await getResults(CONTRACT_ADDRESS);
        if (results && results.length > 0) {
          setOptions(prev => prev.map((opt, i) => ({ ...opt, votes: results[i] || 0 })));
          setQuestion("What is your favorite Stellar feature?"); // This makes setQuestion "used" effectively
        }
      } catch (err) {
        console.error("Poll fetch failed", err);
      }
    };
    initFetch();
  }, []);

  const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);

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

    try {
      const hash = await castVote(walletAddress, CONTRACT_ADDRESS, selectedOption);
      setTxStatus('success');
      setTxHash(hash);
      
      // Refresh results after successful vote
      const latestResults = await getResults(CONTRACT_ADDRESS);
      setOptions(prev => prev.map((opt, i) => ({ ...opt, votes: latestResults[i] || 0 })));
      
    } catch (err) {
      setTxStatus('error');
      let msg = err.message || 'Transaction failed';
      if (msg.includes('Unreachable') || msg.includes('InvalidAction')) {
        msg = "You have already voted in this poll!";
      }
      setErrorMsg(msg);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="live-poll-card glass-panel">
      <h2 className="poll-question">{question}</h2>

      <div className="poll-options">
        {options.map((opt, index) => {
          const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
          return (
            <label key={opt.id} className={`poll-option ${selectedOption === index ? 'selected' : ''}`}>
              <div className="option-header">
                <div className="option-input-group">
                  <input
                    type="radio"
                    name="poll-option"
                    value={index}
                    disabled={isVoting}
                    onChange={() => setSelectedOption(index)}
                  />
                  <span className="option-text">{opt.text}</span>
                </div>
                <span className="option-votes">{opt.votes} votes ({percentage}%)</span>
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
          disabled={isVoting || selectedOption === null}
          onClick={handleVote}
        >
          {isVoting ? 'Voting...' : 'Cast Vote'}
        </button>
      </div>

      {txStatus === 'pending' && <p className="status-msg info">Signing & Submitting Transaction...</p>}
      {txStatus === 'success' && (
        <div className="status-msg success">
          <p>✅ Vote successful!</p>
          <small>Hash: {txHash.substring(0, 15)}...</small>
        </div>
      )}
      {txStatus === 'error' && <p className="status-msg error">❌ Error: {errorMsg}</p>}
    </div>
  );
};

export default LivePoll;
