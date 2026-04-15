import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import Freighter from "./components/Freighter";
import SplitBill from "./components/SplitBill";
import { getAccountBalance } from "./services/stellar";

function App() {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState("0");
  const [loadingBalance, setLoadingBalance] = useState(false);

  const fetchBalance = useCallback(async (publicKey) => {
    if (!publicKey) return;
    setLoadingBalance(true);
    try {
      const bal = await getAccountBalance(publicKey);
      setBalance(bal);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    if (address) {
      fetchBalance(address);
    } else {
      setBalance("0");
    }
  }, [address, fetchBalance]);

  return (
    <div className="app-container">
      <header>
        <h1><strong>Stellar</strong> Split</h1>
        <p className="subtitle">Instant <strong>splitting</strong> on the <strong>Stellar Testnet</strong></p>
      </header>

      <Freighter 
        address={address} 
        setAddress={setAddress} 
        onConnect={fetchBalance}
      />

      {address && (
        <div className="card balance-card">
          <p className="balance-label">Your <strong>Balance</strong></p>
          <p className={`balance-amount ${loadingBalance ? "loading-text" : ""}`}>
            {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} <strong>XLM</strong>
          </p>
          <button 
            className="btn btn-outline" 
            style={{ marginTop: '1rem', width: 'auto' }}
            onClick={() => fetchBalance(address)}
            disabled={loadingBalance}
          >
            {loadingBalance ? "Refreshing..." : "Sync Balance"}
          </button>
        </div>
      )}

      {address ? (
        <SplitBill 
          senderAddress={address} 
          balance={balance} 
          refreshBalance={() => fetchBalance(address)} 
        />
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Please connect your Freighter wallet to start splitting bills.</p>
        </div>
      )}

      <footer style={{ marginTop: '3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Built with Stellar SDK & Freighter API • Testnet Only
      </footer>
    </div>
  );
}

export default App;
