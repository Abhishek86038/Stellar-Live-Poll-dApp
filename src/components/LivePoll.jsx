import React, { useState, useEffect } from 'react';
import './LivePoll.css';
import * as advancedService from '../services/advancedContractService';

const LivePoll = ({ walletAddress }) => {
  const [activeTab, setActiveTab] = useState('vote'); // 'vote', 'create', 'manage'
  const [pollId, setPollId] = useState(1);
  const [pollData, setPollData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [voteAmount, setVoteAmount] = useState('1.0');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // Creation State
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', ''],
    cost: '10'
  });

  const fetchPoll = async () => {
    if (!pollId) return;
    setLoading(true);
    try {
      const data = await advancedService.getAdvancedPollResults(pollId);
      if (data && data.question) {
        setPollData(data);
      } else {
        setStatus({ type: 'error', msg: 'Poll not found' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  const handleVote = async () => {
    if (!walletAddress) return setStatus({ type: 'error', msg: 'Please connect wallet' });
    if (selectedOption === null) return;

    setLoading(true);
    setStatus({ type: 'info', msg: 'Signing transaction...' });
    try {
      await advancedService.castAdvancedVote(walletAddress, pollId, selectedOption, voteAmount);
      setStatus({ type: 'success', msg: 'Vote cast successfully!' });
      fetchPoll();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Vote failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!walletAddress) return setStatus({ type: 'error', msg: 'Connect wallet' });
    
    setLoading(true);
    try {
      const result = await advancedService.createPoll(
        walletAddress, 
        newPoll.question, 
        newPoll.options.filter(o => o.trim()), 
        newPoll.cost
      );
      setStatus({ 
        type: 'success', 
        msg: `Poll Created! Your Poll ID is: ${result.pollId}. (TX: ${result.hash.substring(0, 8)}...)` 
      });
      
      // NEW: Alert and Auto-fill
      if (result.pollId) {
        alert(`Congratulations! Your Poll created successfully with ID: ${result.pollId}`);
        setPollId(result.pollId);
      }
      
      setActiveTab('vote');
      fetchPoll(); // Auto-load the new poll
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Creation failed' });
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });

  return (
    <div className="live-poll-card glass-panel">
      <div className="poll-tabs">
        <button className={activeTab === 'vote' ? 'active' : ''} onClick={() => setActiveTab('vote')}>Vote</button>
        <button className={activeTab === 'create' ? 'active' : ''} onClick={() => setActiveTab('create')}>Create Poll</button>
      </div>

      {status.msg && <div className={`status-banner ${status.type}`}>{status.msg}</div>}

      {activeTab === 'vote' && (
        <div className="vote-section">
          <div className="poll-id-input">
            <label>Poll ID: </label>
            <input type="number" value={pollId} onChange={(e) => setPollId(e.target.value)} />
            <button onClick={fetchPoll} className="btn-small">Load</button>
          </div>

          {pollData ? (
            <div className="poll-content">
              <h3 className="poll-question">{pollData.question}</h3>
              <div className="options-grid">
                {pollData.options.map((opt, i) => {
                  const totalVotes = pollData.votes.reduce((a, b) => Number(a) + Number(b), 0);
                  const optionVotes = Number(pollData.votes[i]);
                  const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                  
                  return (
                    <div 
                      key={i} 
                      className={`option-item ${selectedOption === i ? 'selected' : ''}`}
                      onClick={() => setSelectedOption(i)}
                    >
                      <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                      <div className="option-content">
                        <div className="vote-info">
                          <span className="opt-text">{opt}</span>
                        </div>
                        <div className="vote-stats">
                          <span className="vote-count">{Math.floor(optionVotes / 10000000)} votes</span>
                          <span className="percentage">{percent}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="vote-controls">
                <input 
                  type="number" 
                  value={voteAmount} 
                  onChange={(e) => setVoteAmount(e.target.value)} 
                  placeholder="Stake amount"
                />
                <button className="btn btn-primary" onClick={handleVote} disabled={loading}>
                  {loading ? 'Processing...' : 'Cast Vote'}
                </button>
              </div>
            </div>
          ) : (
            <p>Enter a Poll ID to begin.</p>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <form className="create-poll-form" onSubmit={handleCreatePoll}>
          <h3>Create Advanced Poll</h3>
          <input 
            placeholder="Poll Question" 
            value={newPoll.question} 
            onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })} 
            required 
          />
          <div className="options-list">
            {newPoll.options.map((opt, i) => (
              <input 
                key={i} 
                placeholder={`Option ${i + 1}`} 
                value={opt} 
                onChange={(e) => {
                  const opts = [...newPoll.options];
                  opts[i] = e.target.value;
                  setNewPoll({ ...newPoll, options: opts });
                }} 
                required
              />
            ))}
            <button type="button" onClick={addOption} className="btn-small">+ Add Option</button>
          </div>
          <div className="cost-input">
            <label>Creation Cost (XPOLL): </label>
            <input type="number" value={newPoll.cost} onChange={(e) => setNewPoll({ ...newPoll, cost: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Poll on Ledger'}
          </button>
        </form>
      )}
    </div>
  );
};

export default LivePoll;
