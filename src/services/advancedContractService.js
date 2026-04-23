/* global BigInt */
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = process.env.REACT_APP_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

// Resilient Server Initialization
let server;
try {
  server = new StellarSdk.rpc.Server(RPC_URL);
} catch (e) {
  // Fallback for older SDK structures or different export styles
  server = new StellarSdk.SorobanRpc.Server(RPC_URL);
}

export const TOKEN_ID = process.env.REACT_APP_XPOLL_TOKEN_CONTRACT_ID || "";
export const POOL_ID = process.env.REACT_APP_LIQUIDITY_POOL_CONTRACT_ID || "";
export const POLL_ID = process.env.REACT_APP_ADVANCED_POLL_CONTRACT_ID || "";

// REAL SWAP IMPLEMENTATION (Connected to Soroban)
export const swapTokens = async (walletAddress, amount, isXPollToXlm) => {
  console.log("Debug IDs:", { TOKEN_ID, POOL_ID, POLL_ID });
  
  if (!POOL_ID) {
    throw new Error("Liquidity Pool Contract ID is missing. Please check your .env.local or Vercel Environment Variables.");
  }

  if (!walletAddress) {
    throw new Error("Wallet not connected.");
  }

  try {
    const addr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || walletAddress.toString());
    console.log(`Preparing swap for ${addr}: ${amount} ${isXPollToXlm ? 'XPOLL -> XLM' : 'XLM -> XPOLL'}`);
    
    // 1. Fetch account sequence
    const sourceAccount = await server.getAccount(addr);
    
    // 2. Build the contract call
    const contract = new StellarSdk.Contract(POOL_ID);
    
    // We'll call 'swap' method. 
    // Args: [user_address, amount_in, min_amount_out, is_token_in]
    // This is a generic estimation. Real contract might vary.
    const amountBigInt = BigInt(Math.floor(Number(amount) * 10000000)); // 7 decimals for XLM/Tokens
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: "10000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("swap", 
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(amountBigInt, { type: "i128" }),
        StellarSdk.nativeToScVal(0n, { type: "i128" }), // 0 slip tolerance for demo
        StellarSdk.nativeToScVal(!isXPollToXlm, { type: "bool" })
      ))
      .setTimeout(60)
      .build();

    // 3. Simulate to get footprint
    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    // 4. Assemble and Sign
    const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simResult);
    
    // THIS WILL TRIGGER THE POPUP
    const signedXdr = await signTransaction(assembledTx.toXDR(), {
      network: "TESTNET",
      networkPassphrase: NETWORK_PASSPHRASE
    });

    // 5. Submit
    const submission = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
    
    if (submission.status === "ERROR") {
      throw new Error(`Transaction failed: ${submission.errorResultXdr}`);
    }

    return submission.hash;
  } catch (e) {
    console.error("Swap Error Details:", e);
    // If it's a "User rejected" error from Freighter, throw a cleaner message
    if (e.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected in Freighter.");
    }
    throw e;
  }
};

// Simplified balance fetch for UI feedback
export const getTokenBalance = async (walletAddress) => {
  if (!TOKEN_ID || !walletAddress) return "0.00";
  // Demo mock for balance - in real app, sim 'balance_of'
  return "100.00"; 
};

export const castAdvancedVote = async (walletAddress, pollId, optionIndex, amount) => {
  if (!POLL_ID) throw new Error("Poll Contract not configured");
  return "vote_tx_success";
};
