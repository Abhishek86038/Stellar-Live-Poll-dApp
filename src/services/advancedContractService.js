/* global BigInt */
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

let server;
try {
  server = new StellarSdk.rpc.Server(RPC_URL);
} catch (e) {
  try { server = new StellarSdk.SorobanRpc.Server(RPC_URL); } catch (e2) { console.error("RPC init failed", e2); }
}

export const TOKEN_ID = process.env.REACT_APP_XPOLL_TOKEN_CONTRACT_ID || "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";
export const POOL_ID  = process.env.REACT_APP_LIQUIDITY_POOL_CONTRACT_ID || "CCJLAH3Y7ZYJEZH44PENQFV3XZ75452DZG2SPZNTRFAQC3MT5KGGERQV";
export const POLL_ID  = process.env.REACT_APP_ADVANCED_POLL_CONTRACT_ID  || "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAddr = (wallet) => {
  if (!wallet) return "";
  if (typeof wallet === 'string') return wallet;
  return wallet.address || "";
};

// Simulate a read-only contract call safely, return native value or null
const simulateRead = async (contractId, method, ...args) => {
  try {
    const contract = new StellarSdk.Contract(contractId);
    const dummy = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30).build();
    const sim = await server.simulateTransaction(tx);
    // Check for simulation errors BEFORE accessing result
    if (!sim || sim.error || !sim.result || !sim.result.retval) return null;
    return StellarSdk.scValToNative(sim.result.retval);
  } catch (e) {
    return null; // Silently swallow — never crash UI
  }
};

// Build, simulate, assemble, sign, and submit a write transaction
const submitTx = async (walletAddress, buildFn) => {
  const addr = getAddr(walletAddress);
  if (!addr) throw new Error("Wallet not connected.");

  const sourceAccount = await server.getAccount(addr);
  const tx = buildFn(sourceAccount);

  // Simulate first
  const sim = await server.simulateTransaction(tx);

  // ── CRITICAL CHECK: if simulation failed, STOP here ──
  if (!sim || sim.error) {
    const msg = sim?.error || "Simulation failed";
    throw new Error(`Contract Error: ${msg}`);
  }
  if (StellarSdk.rpc.Api && StellarSdk.rpc.Api.isSimulationError && StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed. Check your token balance and contract state.`);
  }

  // Assemble only if sim succeeded
  const assembled = StellarSdk.rpc.assembleTransaction(tx, sim).build();

  // Sign with Freighter
  const signedResponse = await signTransaction(assembled.toXDR(), {
    network: "TESTNET",
    networkPassphrase: NETWORK_PASSPHRASE
  });

  // Extract XDR — Freighter v2 uses signedTxXdr, older uses plain string
  let xdr = "";
  if (typeof signedResponse === "string") {
    xdr = signedResponse;
  } else if (signedResponse && typeof signedResponse === "object") {
    xdr = signedResponse.signedTxXdr
       || signedResponse.signedXdr
       || signedResponse.result
       || "";
  }

  if (!xdr || xdr.length < 10) {
    throw new Error("Freighter did not return a valid signed transaction. Make sure Freighter is on Testnet.");
  }

  const signedTx = new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE);
  const submission = await server.sendTransaction(signedTx);

  if (submission.status === "ERROR") {
    throw new Error(`Transaction rejected: ${submission.errorResultXdr || "Unknown error"}`);
  }

  // NEW: Wait for transaction to be included in ledger to get the result
  let txResult = await server.getTransaction(submission.hash);
  let retry = 0;
  while (txResult.status === "NOT_FOUND" && retry < 10) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await server.getTransaction(submission.hash);
    retry++;
  }

  if (txResult.status === "SUCCESS") {
    // Parse the return value from the transaction result
    const result = StellarSdk.scValToNative(txResult.returnValue);
    return { hash: submission.hash, pollId: result };
  }

  return { hash: submission.hash, pollId: null };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const getTokenBalance = async (walletAddress) => {
  const addr = getAddr(walletAddress);
  if (!addr || !TOKEN_ID) return "0.00";
  const raw = await simulateRead(TOKEN_ID, "balance_of", new StellarSdk.Address(addr).toScVal());
  if (raw === null) return "0.00";
  const n = Number(raw) / 10000000;
  return n > 0 ? n.toFixed(2) : Number(raw).toString();
};

export const getNativeBalance = async (walletAddress) => {
  const addr = getAddr(walletAddress);
  if (!addr) return "0.00";
  try {
    const res  = await fetch(`https://horizon-testnet.stellar.org/accounts/${addr}`);
    const data = await res.json();
    const native = (data.balances || []).find(b => b.asset_type === 'native');
    return native ? parseFloat(native.balance).toFixed(2) : "0.00";
  } catch (e) { return "0.00"; }
};

export const getRecentActivity = async (walletAddress) => {
  const addr = getAddr(walletAddress);
  if (!addr) return [];
  try {
    const res  = await fetch(`https://horizon-testnet.stellar.org/accounts/${addr}/transactions?limit=5&order=desc`);
    const data = await res.json();
    return (data._embedded?.records || []).map(tx => ({
      hash: tx.hash,
      created_at: tx.created_at,
      successful: tx.successful
    }));
  } catch (e) { return []; }
};

export const getPoolReserves = async () => {
  if (!POOL_ID) return { xpoll: '0.00', native: '0.00' };
  const raw = await simulateRead(POOL_ID, "get_reserves");
  if (!raw || !Array.isArray(raw)) return { xpoll: '0.00', native: '0.00' };
  return {
    xpoll:  (Number(raw[0]) / 10000000).toFixed(2),
    native: (Number(raw[1]) / 10000000).toFixed(2)
  };
};

export const getAdvancedPollResults = async (pollId) => {
  if (!POLL_ID) return null;
  return await simulateRead(POLL_ID, "get_poll_info",
    StellarSdk.nativeToScVal(Number(pollId), { type: "u32" })
  );
};

export const swapTokens = async (walletAddress, amount, isXPollToXlm) => {
  if (!POOL_ID) throw new Error("Pool contract not configured.");
  const addr = getAddr(walletAddress);
  const amtBig = BigInt(Math.floor(Number(amount) * 10000000));
  const method = isXPollToXlm ? "swap_xpoll_to_native" : "swap_native_to_xpoll";
  const contract = new StellarSdk.Contract(POOL_ID);

  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call(method,
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(amtBig, { type: "i128" })
      ))
      .setTimeout(60).build()
  );
};

export const createPoll = async (walletAddress, question, options, cost) => {
  if (!POLL_ID) throw new Error("Poll contract not configured.");
  const addr = getAddr(walletAddress);
  const costBig = BigInt(Math.floor(Number(cost) * 10000000));

  // Correctly encode Vec<String> for Soroban
  const optionsScVal = StellarSdk.xdr.ScVal.scvVec(
    options.map(opt => StellarSdk.nativeToScVal(String(opt), { type: "string" }))
  );

  const contract = new StellarSdk.Contract(POLL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("create_poll",
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(String(question), { type: "string" }),
        optionsScVal,
        StellarSdk.nativeToScVal(costBig, { type: "i128" })
      ))
      .setTimeout(60).build()
  );
};

export const castAdvancedVote = async (walletAddress, pollId, optionIndex, amount) => {
  if (!POLL_ID) throw new Error("Poll contract not configured.");
  const addr = getAddr(walletAddress);
  const amt = BigInt(Math.floor(Number(amount || 1) * 10000000));
  const contract = new StellarSdk.Contract(POLL_ID);

  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("vote",
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(Number(pollId),     { type: "u32" }),
        StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" }),
        StellarSdk.nativeToScVal(amt,                 { type: "i128" })
      ))
      .setTimeout(60).build()
  );
};

export const closePoll = async (walletAddress, pollId) => {
    if (!POLL_ID) throw new Error("Poll contract not configured.");
    const addr = getAddr(walletAddress);
    const contract = new StellarSdk.Contract(POLL_ID);

    return await submitTx(walletAddress, (src) =>
        new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
            .addOperation(contract.call("close_poll",
                new StellarSdk.Address(addr).toScVal(),
                StellarSdk.nativeToScVal(Number(pollId), { type: "u32" })
            ))
            .setTimeout(60).build()
    );
};