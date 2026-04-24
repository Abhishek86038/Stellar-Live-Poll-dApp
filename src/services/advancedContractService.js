/* global BigInt */
import * as StellarSdk from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

// Contract IDs - Hardcoded for absolute reliability
const POLL_ID = "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";
const POOL_ID = "CCJLAH3Y7ZYJEZH44PENQFV3XZ75452DZG2SPZNTRFAQC3MT5KGGERQV";
const TOKEN_ID = "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";

const server = new StellarSdk.rpc.Server(RPC_URL);

const getAddr = (walletAddress) => {
  if (typeof walletAddress === 'object' && walletAddress?.address) return walletAddress.address;
  return walletAddress;
};

const submitTx = async (walletAddress, buildTx) => {
  const addr = getAddr(walletAddress);
  const source = await server.getAccount(addr);
  
  const builder = await buildTx(source);
  const tx = builder.build();

  const sim = await server.simulateTransaction(tx);
  if (!sim || StellarSdk.rpc.Api.isSimulationError(sim)) {
    // Detailed error logging for debugging
    console.error("Simulation Error Details:", sim);
    const diagnostic = sim?.result?.events?.map(e => e.debug).join("\n") || "";
    throw new Error(`Contract Error: ${sim?.error || "Simulation failed"}. ${diagnostic}`);
  }

  let xdr;
  try {
    const assembled = StellarSdk.rpc.assembleTransaction(tx, sim);
    xdr = assembled.toXDR ? assembled.toXDR() : assembled.transaction.toXDR();
  } catch (e) {
    builder.setSorobanData(sim.result.auth, sim.result.footprint, sim.result.instructions);
    xdr = builder.build().toXDR();
  }

  const { signedTxXdr } = await window.freighterApi.signTransaction(xdr, {
    network: 'TESTNET',
    networkPassphrase: NETWORK_PASSPHRASE
  });

  if (!signedTxXdr) throw new Error("Signing cancelled.");

  const signedTx = new StellarSdk.Transaction(signedTxXdr, NETWORK_PASSPHRASE);
  const submission = await server.sendTransaction(signedTx);

  if (submission.status === "ERROR") {
    throw new Error(`Transaction rejected: ${submission.errorResultXdr}`);
  }

  let txResult = await server.getTransaction(submission.hash);
  let retry = 0;
  while (txResult.status === "NOT_FOUND" && retry < 15) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await server.getTransaction(submission.hash);
    retry++;
  }

  if (txResult.status === "SUCCESS") {
    return { hash: submission.hash, pollId: StellarSdk.scValToNative(txResult.returnValue) };
  }

  throw new Error("Transaction failed on blockchain.");
};

// ─── API ────────────────────────────────────────────────────────────────────

export const createPoll = async (walletAddress, question, options, cost) => {
  const contract = new StellarSdk.Contract(POLL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
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
  // Ensure amount is at least 1.0 XPOLL (10000000)
  const finalAmount = Math.max(Number(amount), 1.0);
  
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("vote",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(Number(pollId), { type: "u32" }),
        StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" }),
        StellarSdk.nativeToScVal(BigInt(Math.floor(finalAmount * 10000000)), { type: "i128" })
      ))
      .setTimeout(60)
  );
};

export const closePoll = async (walletAddress, pollId) => {
  const contract = new StellarSdk.Contract(POLL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("close_poll",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(Number(pollId), { type: "u32" })
      ))
      .setTimeout(60)
  );
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
  const method = isXPollIn ? "swap_xpoll_for_native" : "swap_native_for_xpoll";
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call(method,
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(BigInt(Math.floor(Number(amount) * 10000000)), { type: "i128" })
      ))
      .setTimeout(60)
  );
};

export const getTokenBalance = async (walletAddress) => {
  try {
    const contract = new StellarSdk.Contract(TOKEN_ID);
    const dummy = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("balance", new StellarSdk.Address(getAddr(walletAddress)).toScVal()))
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

export const getRecentActivity = async (walletAddress) => {
  try {
    const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
    const txs = await horizon.transactions().forAccount(getAddr(walletAddress)).limit(5).order("desc").call();
    return txs.records;
  } catch (e) { return []; }
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