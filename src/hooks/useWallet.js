import { useState, useCallback } from 'react';
import { requestAccess, isConnected } from '@stellar/freighter-api';

export const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  
  const connect = useCallback(async () => {
    try {
      const isOk = await isConnected();
      if (!isOk) return null;
      const pubKey = await requestAccess();
      setWalletAddress(pubKey);
      return pubKey;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return { walletAddress, connect, disconnect };
};
