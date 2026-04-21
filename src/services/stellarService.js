import { SorobanRpc, Networks, xdr } from "@stellar/stellar-sdk";

// ==========================================
// 1. Network Configuration & RPC Setup
// ==========================================

export const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;

// ==========================================
// 2. Initialize Soroban Client for Testnet
// ==========================================

export const sorobanServer = new SorobanRpc.Server(TESTNET_RPC_URL);

// ==========================================
// 3. Transaction Submission
// ==========================================

/**
 * Safely parses the signed Base64 XDR payload into a Transaction Envelope 
 * and casts it out to the Soroban RPC Testnet endpoint.
 */
export const submitTransaction = async (signedXdr) => {
  try {
    const envelope = xdr.TransactionEnvelope.fromXDR(signedXdr, "base64");
    const sendResponse = await sorobanServer.sendTransaction(envelope);

    if (sendResponse.status === "ERROR") {
       throw new Error(`Transaction submitted with error: ${sendResponse.errorResultXdr}`);
    }

    // Immediately return the transaction hash regardless of execution finality
    return sendResponse.hash; 
  } catch (error) {
    console.error("submitTransaction Failure:", error);
    throw error;
  }
};

// ==========================================
// 4. Result Polling
// ==========================================

/**
 * Due to Soroban's asynchronous execution window, we must continuously check 
 * the network utilizing the transaction hash until execution returns SUCCESS or FAILED.
 */
export const pollTransactionResult = async (txHash, maxRetries = 15, timeout = 2500) => {
  try {
    for (let attempts = 0; attempts < maxRetries; attempts++) {
      const response = await sorobanServer.getTransaction(txHash);

      // Statuses are generally: NOT_FOUND, ENQUEUED (pending), SUCCESS, FAILED
      if (response.status !== "NOT_FOUND") {
        if (response.status === "SUCCESS") {
           return response; // Fully validated 
        } else if (response.status === "FAILED") {
           throw new Error("Transaction execution failed strictly on-chain.");
        }
      }

      // Buffer time before checking RPC payload again
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
    
    throw new Error(`Execution Poll timeout exceeded after ${maxRetries} attempts. Contract taking too long to finalize.`);
  } catch (error) {
    console.error("pollTransactionResult Error:", error);
    throw error;
  }
};

// ==========================================
// 5. Explorer Link Generation
// ==========================================

/**
 * Returns a standardized Stellar.Expert block explorer URI using the network topology.
 * Extremely helpful for providing UX feedback after a signed action.
 */
export const generateExplorerLink = (txHash, network = "testnet") => {
  if (!txHash) return "";
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
};
