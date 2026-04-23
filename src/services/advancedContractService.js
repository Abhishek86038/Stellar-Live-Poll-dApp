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

export const TOKEN_ID = process.env.REACT_APP_XPOLL_TOKEN_CONTRACT_ID || "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";
export const POOL_ID = process.env.REACT_APP_LIQUIDITY_POOL_CONTRACT_ID || "CCJLAH3Y7ZYJEZH44PENQFV3XZ75452DZG2SPZNTRFAQC3MT5KGGERQV";
export const POLL_ID = process.env.REACT_APP_ADVANCED_POLL_CONTRACT_ID || "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";

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
    
    // 2. Build the contract call — use the correct method per direction
    const contract = new StellarSdk.Contract(POOL_ID);
    const methodName = isXPollToXlm ? "swap_xpoll_to_native" : "swap_native_to_xpoll";
    const amountBigInt = BigInt(Math.floor(Number(amount) * 10000000)); // 7 decimals for XLM/Tokens
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: "10000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(methodName, 
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(amountBigInt, { type: "i128" })
      ))
      .setTimeout(60)
      .build();

    // 3. Simulate to get footprint
    const simResult = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    // 4. Assemble and Sign — assembleTransaction returns a builder, must .build()
    const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    
    // THIS WILL TRIGGER THE POPUP
    const signedResponse = await signTransaction(assembledTx.toXDR(), {
      network: "TESTNET",
      networkPassphrase: NETWORK_PASSPHRASE
    });

    // 5. Extract XDR — Freighter v6 may return an object or a string
    let xdr = "";
    if (typeof signedResponse === "string") {
      xdr = signedResponse;
    } else if (signedResponse && typeof signedResponse === "object") {
      xdr = signedResponse.signedTxXdr || signedResponse.signedTransaction || signedResponse.signedXdr || signedResponse.xdr || signedResponse.result || "";
      if (!xdr) {
        for (const key in signedResponse) {
          if (typeof signedResponse[key] === "string" && signedResponse[key].length > 50) {
            xdr = signedResponse[key];
            break;
          }
        }
      }
    }

    if (!xdr) {
      throw new Error(`Signature missing. Response keys: ${Object.keys(signedResponse || {}).join(", ")}`);
    }

    // 6. Submit
    const signedTx = new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE);
    const submission = await server.sendTransaction(signedTx);
    
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

// Real balance fetch via contract simulation
export const getTokenBalance = async (walletAddress) => {
  if (!TOKEN_ID || !walletAddress) return "0.00";
  
  try {
    const addr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || walletAddress.toString());
    const contract = new StellarSdk.Contract(TOKEN_ID);
    
    // Use a dummy account for read-only simulation
    const dummyAccount = new StellarSdk.Account("GCO527YCC6DNDK3K6FN654WXAINDGNB35FUFAN3LURDENIIBD7ZFAJN6", "0");
    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(contract.call("balance_of", new StellarSdk.Address(addr).toScVal()))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (!sim.result || !sim.result.retval) return "0.00";
    
    const rawBalance = StellarSdk.scValToNative(sim.result.retval);
    // Convert from 7-decimal stroops to human-readable
    return (Number(rawBalance) / 10000000).toFixed(2);
  } catch (err) {
    console.error("Balance fetch error:", err);
    return "0.00";
  }
};

export const castAdvancedVote = async (walletAddress, pollId, optionIndex, amount) => {
  if (!POLL_ID) throw new Error("Poll Contract not configured");
  return "vote_tx_success";
};
