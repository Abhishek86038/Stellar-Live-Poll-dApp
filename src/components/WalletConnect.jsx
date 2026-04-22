import React, { useState } from 'react';
import './WalletConnect.css';
import { useWallet } from '../hooks/useWallet';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingSpinner from './LoadingSpinner';

const WalletConnect = ({ onConnect }) => {
  const { walletAddress, connect, disconnect } = useWallet();
  const { isLoading, setIsLoading } = useLoadingState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const truncateAddress = (address) => {
    if (!address) return '';
    const addStr = typeof address === 'string' ? address : (address.address || '');
    if (!addStr) return '';
    return `${addStr.slice(0, 6)}...${addStr.slice(-4)}`;
  };

  const handleWalletSelect = async (walletType) => {
    setShowModal(false);
    setError('');
    setIsLoading(true);

    if (walletType === 'freighter') {
      const pubKey = await connect();
      if (pubKey) {
        if (onConnect) onConnect(pubKey);
      } else {
        setError('Freighter wallet connection failed or rejected.');
      }
    } else {
        setError(`Cannot connect via ${walletType}: Integration not configured locally.`);
    }
    
    setIsLoading(false);
  };

  const disconnectWallet = () => {
    disconnect();
    if (onConnect) onConnect(null);
  };

  return (
    <div className="wallet-card">
      <div className="wallet-header">
        <h2>Live Poll Wallet</h2>
        {isLoading && <LoadingSpinner size="small" />}
      </div>

      {error && <div className="wallet-error">{error}</div>}

      <div className="wallet-content">
        {!walletAddress ? (
          <div className="wallet-disconnected">
            <div className="status-container">
              <div className="status-indicator d-offline"></div>
              <p className="status-text">Disconnected</p>
            </div>
            
            {showModal ? (
               <div className="multi-wallet-modal">
                 <h4>Select Wallet Provider</h4>
                 <div className="wallet-list">
                    <button className="wallet-option" onClick={() => handleWalletSelect('freighter')}>
                       <span className="wallet-icon">⚓</span> Freighter
                    </button>
                    <button className="wallet-option" onClick={() => handleWalletSelect('xBull')}>
                       <span className="wallet-icon">🐂</span> xBull Wallet
                    </button>
                    <button className="wallet-option" onClick={() => handleWalletSelect('Albedo')}>
                       <span className="wallet-icon">🦊</span> Albedo Intent
                    </button>
                 </div>
                 <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            ) : (
                <button 
                  className="btn btn-connect" 
                  onClick={() => setShowModal(true)} 
                  disabled={isLoading}
                >
                  Connect Wallet
                </button>
            )}
          </div>
        ) : (
          <div className="wallet-connected">
            <div className="status-container">
              <div className="status-indicator d-online"></div>
              <p className="status-text">Connected Securely</p>
            </div>
            <div className="address-badge">
              {truncateAddress(walletAddress)}
            </div>
            <button className="btn btn-disconnect" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;
