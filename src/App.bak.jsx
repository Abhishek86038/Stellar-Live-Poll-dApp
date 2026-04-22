import React, { useState } from 'react';
import './styles/App.css';
import WalletConnect from './components/WalletConnect';
import LivePoll from './components/LivePoll';

function App() {
  // Top-level state management for Wallet Connection
  // It trickles down as props to the LivePoll component so it can perform transactions
  const [walletAddress, setWalletAddress] = useState(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Stellar Live Poll</h1>
        <p className="subtitle">Journey to Mastery ‒ Green Belt</p>
      </header>

      <main className="app-main-grid">
        {/* Left column / Top on mobile: Wallet Integration */}
        <section className="sidebar-section">
          <WalletConnect onConnect={setWalletAddress} />
          
          <div className="info-card glass-panel">
            <h3>How to use</h3>
            <ol className="instructions-list">
              <li>Connect your <strong>Stellar Freighter</strong> wallet on the Testnet.</li>
              <li>Select your response from the options provided.</li>
              <li>Click <strong>Cast Vote</strong> and sign the Soroban transaction inside Freighter.</li>
              <li>Wait for the network to validate your vote onto the ledger.</li>
            </ol>
          </div>
        </section>

        {/* Right column / Bottom on mobile: The core Poll DApp */}
        <section className="main-content-section">
          {/* Passes wallet context down allowing the poll to initiate signed blockchain executions */}
          <LivePoll walletAddress={walletAddress} />
        </section>
      </main>
    </div>
  );
}

export default App;
