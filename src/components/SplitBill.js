import React, { useState, useEffect } from "react";
import { buildPaymentTransaction, submitTransaction } from "../services/stellar";
import { signTransaction } from "@stellar/freighter-api";

const SplitBill = ({ senderAddress, balance, refreshBalance }) => {
  const [totalAmount, setTotalAmount] = useState("");
  const [participants, setParticipants] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const sharePerPerson = totalAmount && participants
    ? (parseFloat(totalAmount) / (parseInt(participants) + 1)).toFixed(7)
    : "0";

  const handleSendPayment = async () => {
    if (!recipient || !totalAmount || parseFloat(totalAmount) <= 0) {
      alert("Please enter a valid recipient and amount.");
      return;
    }

    setLoading(true);
    setTxHash(null);
    setError(null);

    try {
      // Build the transaction
      const xdr = await buildPaymentTransaction(
        senderAddress,
        recipient,
        sharePerPerson
      );

      // Sign with Freighter
      const signedXDR = await signTransaction(xdr, { network: "TESTNET" });

      // Submit to network
      const result = await submitTransaction(signedXDR);
      
      setTxHash(result.hash);
      refreshBalance();
      alert("Split payment sent successfully!");
    } catch (err) {
      console.error("Transaction failed:", err);
      setError(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card split-bill-card">
      <h2><strong>Split</strong> Bill Calculator</h2>
      
      <div className="input-group">
        <label>Total <strong>Bill Amount</strong> (XLM)</label>
        <input
          type="number"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="e.g. 100"
        />
      </div>

      <div className="input-group">
        <label>Number of <strong>Friends</strong> (Excluding you)</label>
        <input
          type="number"
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          min="1"
        />
      </div>

      <div className="share-info">
        <p>Total <strong>People</strong>: <span className="highlight">{parseInt(participants) + 1}</span></p>
        <p>Amount per <strong>Person</strong>: <span className="highlight"><strong>{sharePerPerson}</strong> XLM</span></p>
      </div>

      <div className="divider"></div>

      <div className="input-group">
        <label>Recipient <strong>Address</strong> (Send your share)</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="G..."
        />
      </div>

      <button
        className={`btn btn-primary ${loading ? "loading" : ""}`}
        onClick={handleSendPayment}
        disabled={loading || !senderAddress}
      >
        {loading ? "Processing..." : <span>Send <strong>Your Share</strong></span>}
      </button>

      <div className="divider"></div>

      <div className="request-section">
        <h3>Request from <strong>Friends</strong></h3>
        <p className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
          Share this link with <strong>friends</strong> so they can pay their share easily.
        </p>
        <div className="request-link-box">
          <code>
            <strong>web+stellar:pay</strong>?destination={senderAddress}&amount={sharePerPerson}
          </code>
          <button 
            className="btn btn-outline" 
            style={{ marginTop: '1rem' }}
            onClick={() => {
              const uri = `web+stellar:pay?destination=${senderAddress}&amount=${sharePerPerson}`;
              navigator.clipboard.writeText(uri);
              alert("Payment request link copied to clipboard!");
            }}
          >
            Copy <strong>Request Link</strong>
          </button>
        </div>
      </div>

      {txHash && (
        <div className="status success">
          <p>Success! Transaction Hash:</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-10)}
          </a>
        </div>
      )}

      {error && (
        <div className="status error">
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
};

export default SplitBill;
