import React, { useState, useEffect } from 'react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import albedo from '@albedo-link/intent';
import './WalletConnect.css';

const WalletConnect = ({ onConnect }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isWalletInstalled, setIsWalletInstalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false); // Multi-wallet modal active state

  const truncateAddress = (address) => {
    if (!address) return '';
    const addStr = typeof address === 'string' ? address : (address.address || '');
    if (!addStr) return '';
    return `${addStr.slice(0, 6)}...${addStr.slice(-4)}`;
  };

  useEffect(() => {
    checkFreighter();
  }, []);

  const checkFreighter = async () => {
    setLoading(true);
    setError('');
    try {
      const connected = await isConnected();
      setIsWalletInstalled(connected);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generalized connection interface to handle routing multi-wallet requests
  const handleWalletSelect = async (walletType) => {
    setShowModal(false);
    setError('');
    setLoading(true);

    if (walletType === 'freighter') {
      try {
        if (!isWalletInstalled) {
          setError('Freighter wallet not found. Please install the extension.');
          setLoading(false);
          return;
        }
        
        const pubKey = await requestAccess();
        if (pubKey) {
          setWalletAddress(pubKey);
          if (onConnect) onConnect(pubKey);
        } else {
          setError('Connection rejected or no public key found.');
        }
      } catch (err) {
        console.error(err);
        setError('Wallet connection failed or was rejected.');
      }
    } else if (walletType === 'Albedo') {
      try {
        const res = await albedo.publicKey({});
        if (res.pubkey) {
          setWalletAddress(res.pubkey);
          if (onConnect) onConnect(res.pubkey);
        }
      } catch (err) {
        console.error(err);
        setError('Albedo login cancelled or failed.');
      }
    } else if (walletType === 'xBull') {
        // basic xBull extension trigger fallback if detected
        if (window.xBullSDK) {
           setError("xBull SDK detected but manual bridge requires setup.");
        } else {
           setError("xBull wallet extension not found in browser.");
        }
    } else {
        setError(`Cannot connect via ${walletType}: Integration not configured locally.`);
    }
    
    setLoading(false);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    if (onConnect) onConnect(null);
  };

  return (
    <div className="wallet-card">
      <div className="wallet-header">
        <h2>Live Poll Wallet</h2>
        {loading && <div className="loader"></div>}
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
                  disabled={loading}
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
