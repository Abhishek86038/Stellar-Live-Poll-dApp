import { useState, useCallback } from 'react';
import { requestAccess, isConnected } from '@stellar/freighter-api';

export const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  
  const connect = useCallback(async () => {
    try {
      console.log("Attempting Freighter connection...");
      // Forcing requestAccess as first step is often more reliable
      const pubKey = await requestAccess();
      console.log("Freighter account retrieved:", pubKey);
      
      if (pubKey) {
        setWalletAddress(pubKey);
        return pubKey;
      }
      return null;
    } catch (e) {
      console.error("Connection error:", e);
      // Fallback: check if even installed
      if (!await isConnected()) {
        alert("Please install Freighter extension first!");
      }
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return { walletAddress, connect, disconnect };
};
