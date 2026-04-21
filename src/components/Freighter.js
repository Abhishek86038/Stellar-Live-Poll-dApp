import React from "react";
import {
  isConnected,
  getPublicKey,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

const Freighter = ({ address, setAddress, onConnect }) => {
  const handleConnect = async () => {
    try {
      if (!(await isConnected())) {
        alert("Please install Freighter extension first!");
        return;
      }

      const publicKey = await requestAccess();
      console.log("Freighter publicKey:", publicKey);
      
      // Ensure we get a string address
      let addressStr = typeof publicKey === 'string' ? publicKey : publicKey?.address;
      
      // Fallback to getPublicKey if requestAccess didn't return the key
      if (!addressStr) {
        addressStr = await getPublicKey();
      }

      if (addressStr) {
        setAddress(addressStr);
        if (onConnect) onConnect(addressStr);
      }
    } catch (error) {
      console.error("Connection failed:", error);
      alert("Failed to connect to Freighter: " + error.message);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
  };

  return (
    <div className="wallet-container">
      {!address ? (
        <button className="btn btn-primary" onClick={handleConnect}>
          Connect Freighter Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <p className="address-text">
            Connected: <span className="highlight">
              {typeof address === 'string' 
                ? `${address.slice(0, 6)}...${address.slice(-6)}`
                : "Invalid Address"}
            </span>
          </p>
          <button className="btn btn-outline" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default Freighter;
export { signTransaction };