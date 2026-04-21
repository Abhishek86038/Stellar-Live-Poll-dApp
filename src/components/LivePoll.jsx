import React, { useState, useEffect } from 'react';
import './LivePoll.css';

const LivePoll = ({ walletAddress }) => {
  // Using generic mock data to demonstrate functionality properly.
  // In a real environment, it would be initialized from the smart contract!
  const [question, setQuestion] = useState("What is your favorite blockchain?");
  const [options, setOptions] = useState([
    { id: 0, text: 'Stellar', votes: 154 },
    { id: 1, text: 'Ethereum', votes: 85 },
    { id: 2, text: 'Solana', votes: 45 }
  ]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [txStatus, setTxStatus] = useState(null); // 'pending', 'success', 'error'
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate total votes
  const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);

  // Poll for real-time results every 2 seconds
  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Here we would call the contract:
        // const currentResults = await contract.get_results();
        // setOptions(currentResults);
        // console.log("Real-time results updated");
      } catch (err) {
        console.error("Failed to fetch polling data", err);
      }
    };

    fetchResults(); // Initial fetch
    const interval = setInterval(fetchResults, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleVote = async () => {
    if (!walletAddress) {
      setTxStatus('error');
      setErrorMsg('Wallet not connected');
      return;
    }

    if (selectedOption === null) return;

    setIsVoting(true);
    setTxStatus('pending');
    setErrorMsg('');
    setTxHash('');

    try {
      // Simulate transaction signing and submission wait time
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Simulate a contract call context. Change this boolean to test the Error states.
      const isSuccess = true; 
      
      if (isSuccess) {
        setTxStatus('success');
        setTxHash('6a29b8c2d7e5f9a1b4c8d3e6f7a9b2c5d8e1f4a7b9c2d5e8f1a4b7c9d2e5f');
        
        // Optimistic UI update to visually show the change
        const updatedOptions = [...options];
        updatedOptions[selectedOption].votes += 1;
        setOptions(updatedOptions);
      } else {
        // Modify this string during testing to trigger different handled errors
        throw new Error('rejected'); 
      }

    } catch (err) {
      setTxStatus('error');
      
      // Strict categorization of 3+ error types
      if (err.message.includes('rejected') || err.message.includes('balance')) {
        setErrorMsg('Transaction rejected or insufficient balance');
      } else if (err.message.includes('contract')) {
        setErrorMsg('Failed to call contract');
      } else {
        setErrorMsg('Network error - please retry');
      }
    } finally {
      setIsVoting(false);
      setSelectedOption(null); // Clear selection after voting
    }
  };

  return (
    <div className="live-poll-card glass-panel">
      <h2 className="poll-question">{question}</h2>

      <div className="poll-options">
        {options.map((opt, index) => {
          const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
          
          return (
            <label 
              key={opt.id} 
              className={`poll-option ${selectedOption === index ? 'selected' : ''}`}
            >
              <div className="option-header">
                <div className="option-input-group">
                  <input
                    type="radio"
                    name="poll-option"
                    value={index}
                    checked={selectedOption === index}
                    onChange={() => setSelectedOption(index)}
                    disabled={isVoting}
                  />
                  <span className="option-text">{opt.text}</span>
                </div>
                <span className="option-votes">{opt.votes} votes ({percentage}%)</span>
              </div>
              
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="poll-actions">
        <button 
          className="btn btn-vote"
          onClick={handleVote}
          disabled={selectedOption === null || isVoting}
        >
          Cast Vote
        </button>
      </div>

      {txStatus && (
        <div className={`tx-status-container ${txStatus}`}>
          {txStatus === 'pending' && (
            <div className="status-msg pending">
              <span className="spinner"></span> 
              Voting in progress...
            </div>
          )}
          
          {txStatus === 'success' && (
            <div className="status-msg success">
              ✅ Vote successful! 
              <br/>
              <a 
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="tx-link"
              >
                View Transaction on Stellar Expert ({txHash.substring(0, 8)}...)
              </a>
            </div>
          )}

          {txStatus === 'error' && (
            <div className="status-msg error">
              <div className="error-text">❌ Vote failed: {errorMsg}</div>
              <button className="btn btn-retry" onClick={handleVote}>Retry</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LivePoll;
