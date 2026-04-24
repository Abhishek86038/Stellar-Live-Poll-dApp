/* global BigInt */
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = process.env.REACT_APP_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

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
    
    // Use a string address for simulation account
    const simulationAddr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    const simulationAccount = new StellarSdk.Account(simulationAddr, "0");
    const tx = new StellarSdk.TransactionBuilder(simulationAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(contract.call("balance_of", new StellarSdk.Address(addr).toScVal()))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (!sim.result || !sim.result.retval) return "0.00";
    
    const rawBalance = StellarSdk.scValToNative(sim.result.retval);
    // Standard Stellar 7-decimal conversion
    const formatted = (Number(rawBalance) / 10000000);
    return formatted > 0 ? formatted.toFixed(2) : Number(rawBalance).toString();
  } catch (err) {
    console.error("Balance fetch error:", err);
    return "0.00";
  }
};

export const getPoolReserves = async () => {
  if (!POOL_ID) return { xpoll: '0', native: '0' };
  try {
    const contract = new StellarSdk.Contract(POOL_ID);
    const simAccount = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(simAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("get_reserves"))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (!sim.result || !sim.result.retval) return { xpoll: '0', native: '0' };
    
    const [rx, rn] = StellarSdk.scValToNative(sim.result.retval);
    return {
      xpoll: (Number(rx) / 10000000).toFixed(2),
      native: (Number(rn) / 10000000).toFixed(2)
    };
  } catch (err) {
    console.error("Reserves fetch error:", err);
    return { xpoll: '0', native: '0' };
  }
};

export const getNativeBalance = async (walletAddress) => {
  if (!walletAddress) return "0.00";
  try {
    const addr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || walletAddress.toString());
    const horizonUrl = "https://horizon-testnet.stellar.org";
    const resp = await fetch(`${horizonUrl}/accounts/${addr}`);
    const data = await resp.json();
    const nativeBal = data.balances.find(b => b.asset_type === 'native');
    return nativeBal ? parseFloat(nativeBal.balance).toFixed(2) : "0.00";
  } catch (err) {
    console.error("Native balance error:", err);
    return "0.00";
  }
};

export const getRecentActivity = async (walletAddress) => {
  if (!walletAddress) return [];
  try {
    const addr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || walletAddress.toString());
    const horizonUrl = "https://horizon-testnet.stellar.org";
    const resp = await fetch(`${horizonUrl}/accounts/${addr}/transactions?limit=5&order=desc`);
    const data = await resp.json();
    
    return data._embedded.records.map(tx => ({
      hash: tx.hash,
      created_at: tx.created_at,
      successful: tx.successful
    }));
  } catch (err) {
    console.error("Activity fetch error:", err);
    return [];
  }
};

export const initPollContract = async (walletAddress, tokenAddr) => {
  const addr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || walletAddress.toString());
  const sourceAccount = await server.getAccount(addr);
  const contract = new StellarSdk.Contract(POLL_ID);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("init", new StellarSdk.Address(tokenAddr).toScVal()))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
  const signedResponse = await signTransaction(assembledTx.toXDR(), { network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
  
  let xdr = typeof signedResponse === "string" ? signedResponse : (signedResponse.signedXdr || signedResponse.result);
  return await server.sendTransaction(new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE));
};

export const createPoll = async (walletAddress, question, options, cost) => {
  const addr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || walletAddress.toString());
  const sourceAccount = await server.getAccount(addr);
  const contract = new StellarSdk.Contract(POLL_ID);

  const costBigInt = BigInt(Math.floor(Number(cost) * 10000000));

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("create_poll", 
      new StellarSdk.Address(addr).toScVal(),
      StellarSdk.nativeToScVal(question),
      StellarSdk.nativeToScVal(options),
      StellarSdk.nativeToScVal(costBigInt, { type: "i128" })
    ))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simResult)) throw new Error(simResult.error);

  const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
  const signedResponse = await signTransaction(assembledTx.toXDR(), { network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
  
  let xdr = typeof signedResponse === "string" ? signedResponse : (signedResponse.signedXdr || signedResponse.result);
  const submission = await server.sendTransaction(new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE));
  return submission.hash;
};

export const castAdvancedVote = async (walletAddress, pollId, optionIndex, amount) => {
  if (!POLL_ID) throw new Error("Poll Contract not configured");
  
  const addr = typeof walletAddress === 'string' ? walletAddress : (walletAddress.address || walletAddress.toString());
  const sourceAccount = await server.getAccount(addr);
  const contract = new StellarSdk.Contract(POLL_ID);

  // Advanced Poll: vote(voter, poll_id, option_index, amount)
  const amountBigInt = BigInt(Math.floor(Number(amount || 1) * 10000000)); 

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("vote", 
      new StellarSdk.Address(addr).toScVal(),
      StellarSdk.nativeToScVal(Number(pollId), { type: "u32" }),
      StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" }),
      StellarSdk.nativeToScVal(amountBigInt, { type: "i128" })
    ))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
  
  const signedResponse = await signTransaction(assembledTx.toXDR(), {
    network: "TESTNET",
    networkPassphrase: NETWORK_PASSPHRASE
  });

  let xdr = "";
  if (typeof signedResponse === "string") xdr = signedResponse;
  else if (signedResponse?.signedXdr) xdr = signedResponse.signedXdr;
  else if (signedResponse?.result) xdr = signedResponse.result;

  const signedTx = new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE);
  const submission = await server.sendTransaction(signedTx);
  
  if (submission.status === "ERROR") throw new Error("Transaction rejected.");
  return submission.hash;
};

export const getAdvancedPollResults = async (pollId) => {
  if (!POLL_ID) return null;
  try {
    const contract = new StellarSdk.Contract(POLL_ID);
    const simAccount = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    
    const tx = new StellarSdk.TransactionBuilder(simAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(contract.call("get_poll_info", StellarSdk.nativeToScVal(Number(pollId), { type: "u32" })))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      return null;
    }
    if (!sim.result || !sim.result.retval) return null;
    
    try {
      return StellarSdk.scValToNative(sim.result.retval);
    } catch (e) {
      return null;
    }
  } catch (err) {
    console.error("Poll fetch error:", err);
    return null;
  }
};
