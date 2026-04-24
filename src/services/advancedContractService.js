/* global BigInt */
import * as StellarSdk from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

// Contract IDs from Environment or Defaults
const POLL_ID = process.env.REACT_APP_ADVANCED_POLL_CONTRACT_ID || "CC6VHB7JGO6XWNWSDWPKNKNA6N63K5Z567RPGZQPBAHNZCWAVMNMSI7S";
const POOL_ID = process.env.REACT_APP_LIQUIDITY_POOL_CONTRACT_ID || "CBUKW4W6FNO6J6E2672OZ6EXERWH3H7CBYUZXMMTNK7PFXK3WQRAVKNV";
const TOKEN_ID = process.env.REACT_APP_XPOLL_TOKEN_CONTRACT_ID || "CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ";

const server = new StellarSdk.rpc.Server(RPC_URL);

const getAddr = (walletAddress) => {
  if (typeof walletAddress === 'object' && walletAddress?.address) return walletAddress.address;
  return walletAddress;
};

const submitTx = async (walletAddress, buildTx) => {
  const addr = getAddr(walletAddress);
  const account = await server.getAccount(addr);
  const builder = await buildTx(account);
  const tx = builder.build();

  const sim = await server.simulateTransaction(tx);
  if (!sim || StellarSdk.rpc.Api.isSimulationError(sim)) {
    console.error("Simulation Result:", sim);
    throw new Error(`Simulation failed: Check your balance or contract state.`);
  }

  let xdr;
  try {
    // 1. Try SDK's assembleTransaction
    const assembled = StellarSdk.rpc.assembleTransaction(tx, sim);
    
    // Safety check for toXDR existence
    if (assembled && typeof assembled.toXDR === 'function') {
      xdr = assembled.toXDR();
    } else if (assembled && assembled.transaction && typeof assembled.transaction.toXDR === 'function') {
      xdr = assembled.transaction.toXDR();
    } else {
      // 2. Fallback: Manual Injection
      builder.setSorobanData(sim.result.auth, sim.result.footprint, sim.result.instructions);
      xdr = builder.build().toXDR();
    }
  } catch (e) {
    console.warn("Assembly fallback triggered:", e);
    builder.setSorobanData(sim.result.auth, sim.result.footprint, sim.result.instructions);
    xdr = builder.build().toXDR();
  }

  // Final check to ensure XDR is a string before signing
  if (typeof xdr !== 'string') {
    if (xdr && typeof xdr.toString === 'function') xdr = xdr.toString();
    else throw new Error("Failed to generate valid XDR string.");
  }

  const { signedTxXdr } = await window.freighterApi.signTransaction(xdr, {
    network: 'TESTNET',
    networkPassphrase: NETWORK_PASSPHRASE
  });

  if (!signedTxXdr) throw new Error("Transaction cancelled by user.");

  const signedTx = new StellarSdk.Transaction(signedTxXdr, NETWORK_PASSPHRASE);
  const submission = await server.sendTransaction(signedTx);

  if (submission.status === "ERROR") {
    throw new Error(`Chain Error: ${submission.errorResultXdr}`);
  }

  // Wait for confirmation
  let txResult = await server.getTransaction(submission.hash);
  let retry = 0;
  while (txResult.status === "NOT_FOUND" && retry < 25) {
    await new Promise(r => setTimeout(r, 1000));
    txResult = await server.getTransaction(submission.hash);
    retry++;
  }

  if (txResult.status === "SUCCESS") {
    return { hash: submission.hash, returnValue: txResult.returnValue };
  }
  
  throw new Error(`Final Transaction Status: ${txResult.status}`);
};

export const createPoll = async (walletAddress, question, options, cost) => {
  const contract = new StellarSdk.Contract(POLL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "30000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("create_poll",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(question, { type: "string" }),
        StellarSdk.xdr.ScVal.scvVec(options.map(o => StellarSdk.nativeToScVal(o, { type: "string" }))),
        StellarSdk.nativeToScVal(BigInt(Math.floor(Number(cost) * 10000000)), { type: "i128" })
      ))
      .setTimeout(60)
  );
};

export const castAdvancedVote = async (walletAddress, pollId, optionIndex, amount) => {
  const contract = new StellarSdk.Contract(POLL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "30000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("vote",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(Number(pollId), { type: "u32" }),
        StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" }),
        StellarSdk.nativeToScVal(BigInt(Math.floor(Number(amount) * 10000000)), { type: "i128" })
      ))
      .setTimeout(60)
  );
};

export const closePoll = async (walletAddress, pollId) => {
  const contract = new StellarSdk.Contract(POLL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "30000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("close_poll",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(Number(pollId), { type: "u32" })
      ))
      .setTimeout(60)
  );
};

export const getTokenBalance = async (walletAddress) => {
  try {
    const contract = new StellarSdk.Contract(TOKEN_ID);
    const dummy = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("balance_of", new StellarSdk.Address(getAddr(walletAddress)).toScVal()))
      .setTimeout(30).build();
    const sim = await server.simulateTransaction(tx);
    if (sim.result && sim.result.retval) {
      return Number(StellarSdk.scValToNative(sim.result.retval)) / 10000000;
    }
  } catch (e) {}
  return 0;
};

export const getNativeBalance = async (walletAddress) => {
  try {
    const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
    const account = await horizon.loadAccount(getAddr(walletAddress));
    const native = account.balances.find(b => b.asset_type === "native");
    return native ? native.balance : "0.00";
  } catch (e) { return "0.00"; }
};

export const getAdvancedPollResults = async (pollId) => {
  try {
    const contract = new StellarSdk.Contract(POLL_ID);
    const dummy = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("get_poll_info", StellarSdk.nativeToScVal(Number(pollId), { type: "u32" })))
      .setTimeout(30).build();
    const sim = await server.simulateTransaction(tx);
    if (sim.result && sim.result.retval) {
      const data = StellarSdk.scValToNative(sim.result.retval);
      if (data.votes) data.votes = data.votes.map(v => Number(v));
      return data;
    }
  } catch (e) {}
  return null;
};

export const swapTokens = async (walletAddress, amount, isXPollIn) => {
  const contract = new StellarSdk.Contract(POOL_ID);
  const method = isXPollIn ? "swap_xpoll_to_native" : "swap_native_to_xpoll";
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "30000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call(method,
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(BigInt(Math.floor(Number(amount) * 10000000)), { type: "i128" })
      ))
      .setTimeout(60)
  );
};

export const depositLiquidity = async (walletAddress, xpollAmount, nativeAmount) => {
  const contract = new StellarSdk.Contract(POOL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "30000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("add_liquidity",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(BigInt(Math.floor(Number(xpollAmount) * 10000000)), { type: "i128" }),
        StellarSdk.nativeToScVal(BigInt(Math.floor(Number(nativeAmount) * 10000000)), { type: "i128" })
      ))
      .setTimeout(60)
  );
};

export const getPoolReserves = async () => {
  try {
    const contract = new StellarSdk.Contract(POOL_ID);
    const dummy = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("get_reserves"))
      .setTimeout(30).build();
    const sim = await server.simulateTransaction(tx);
    if (sim.result && sim.result.retval) {
      const reserves = StellarSdk.scValToNative(sim.result.retval);
      return { xpoll: Number(reserves[0]) / 10000000, native: Number(reserves[1]) / 10000000 };
    }
  } catch (e) {}
  return { xpoll: 0, native: 0 };
};

export const getRecentActivity = async (walletAddress) => {
  try {
    const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
    const txs = await horizon.transactions().forAccount(getAddr(walletAddress)).limit(5).order("desc").call();
    return txs.records;
  } catch (e) { return []; }
};