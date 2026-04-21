import {
  isConnected,
  requestAccess,
  getPublicKey as getFreighterPublicKey,
  signTransaction as signFreighterTransaction
} from "@stellar/freighter-api";

import { Horizon } from "@stellar/stellar-sdk";

// Initialize the Horizon server to efficiently query ledger balances natively
const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

/**
 * 1. Checks if the Freighter wallet extension is installed and available.
 */
export const checkFreighterInstalled = async () => {
  try {
    const connected = await isConnected();
    return connected;
  } catch (error) {
    console.error("Error checking Freighter installation:", error);
    return false;
  }
};

/**
 * 2. Connects to the wallet.
 * Prompts the user to authorize the decentralized application via Freighter.
 * Returns the public key if successful.
 */
export const connectWallet = async () => {
  try {
    const isInstalled = await checkFreighterInstalled();
    if (!isInstalled) {
      throw new Error("Freighter Extension is not installed");
    }
    // requestAccess pops the modal to user asking for permission
    const accessNode = await requestAccess();
    if (accessNode) {
       // If access is granted, we immediately get the public key
       return await getFreighterPublicKey();
    } else {
       throw new Error("Connection request rejected by the user.");
    }
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    throw error;
  }
};

/**
 * 3. Disconnects the wallet.
 * Note: Freighter manages implicit authorization tracking so an explicit 
 * "disconnect" RPC method does not exist natively in the extension. 
 * You handle this entirely by clearing localized state variables inside React.
 */
export const disconnectWallet = async () => {
  try {
    console.log("Wallet disconnected locally. Remember to completely clear the address stored in React State.");
    return true;
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
    throw error;
  }
};

/**
 * 4. Gets the current public key securely tracked by Freighter.
 * Typically used to verify identity silently if previously authorized.
 */
export const getPublicKey = async () => {
  try {
      const publicKey = await getFreighterPublicKey();
      return publicKey;
  } catch (error) {
      console.error("Error fetching public key natively from Freighter:", error);
      throw error;
  }
};

/**
 * 5. Grabs the raw XLM balance of the connected wallet straight from the blockchain.
 * Utilizes classical Horizon API for easy REST JSON lookups (doesn't require Soroban RPC simulations).
 */
export const getWalletBalance = async (publicKey) => {
  try {
    if (!publicKey) {
      throw new Error("No valid public key provided to check balance.");
    }

    // loadAccount returns rich JSON state of user
    const account = await horizonServer.loadAccount(publicKey);
    
    // Find the standard native XLM object inside the balances array
    const nativeBalance = account.balances.find(
       (balance) => balance.asset_type === "native"
    );

    return nativeBalance ? nativeBalance.balance : "0.0000000";
  } catch (error) {
    // If the account has literally zero balance whatsoever or hasn't interacted with Friendbot yet, 
    // it will throw a 404 block-not-found Native. We catch this here seamlessly:
    if (error.response && error.response.status === 404) {
       return "0.0000000";
    }
    console.error("Error fetching wallet balance:", error);
    throw error;
  }
};

/**
 * 6. Signs a transaction explicitly providing XDR to Freighter.
 */
export const signTransaction = async (xdrString) => {
  try {
    // Pushes payload out to the user interface waiting for their biometric/password verification prompt
    const signedXdr = await signFreighterTransaction(xdrString, {
      network: "TESTNET", // Ensure we define network scope to prevent signature errors
    });
    
    return signedXdr;
  } catch (error) {
    console.error("Transaction signature rejected or failed:", error);
    throw error;
  }
};
