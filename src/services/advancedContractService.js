import * as StellarSdk from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const POLL_ID = process.env.REACT_APP_ADVANCED_POLL_CONTRACT_ID || "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";

const server = new StellarSdk.rpc.Server(RPC_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getAddr = (walletAddress) => {
  if (typeof walletAddress === 'object' && walletAddress?.address) return walletAddress.address;
  return walletAddress;
};

const submitTx = async (walletAddress, buildTx) => {
  const addr = getAddr(walletAddress);
  const source = await server.getAccount(addr);
  const tx = await buildTx(source);

  const sim = await server.simulateTransaction(tx);
  if (!sim || StellarSdk.rpc.Api.isSimulationError(sim)) {
    const msg = sim?.error || "Simulation failed. Check balance or permissions.";
    throw new Error(`Contract Error: ${msg}`);
  }

  const assembled = StellarSdk.rpc.assembleTransaction(tx, sim);
  const xdr = assembled.toXDR();
  
  const { signedTxXdr } = await window.freighterApi.signTransaction(xdr, {
    network: 'TESTNET',
    networkPassphrase: NETWORK_PASSPHRASE
  });

  if (!signedTxXdr) throw new Error("Signing cancelled.");

  const signedTx = new StellarSdk.Transaction(signedTxXdr, NETWORK_PASSPHRASE);
  const submission = await server.sendTransaction(signedTx);

  if (submission.status === "ERROR") {
    throw new Error(`Transaction rejected: ${submission.errorResultXdr || "Unknown error"}`);
  }

  let txResult = await server.getTransaction(submission.hash);
  let retry = 0;
  while (txResult.status === "NOT_FOUND" && retry < 12) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await server.getTransaction(submission.hash);
    retry++;
  }

  if (txResult.status === "SUCCESS") {
    const result = StellarSdk.scValToNative(txResult.returnValue);
    return { hash: submission.hash, pollId: result };
  }

  return { hash: submission.hash, pollId: null };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const createPoll = async (walletAddress, question, options, cost) => {
  const contract = new StellarSdk.Contract(POLL_ID);
  const scOptions = options.map(opt => StellarSdk.nativeToScVal(opt, { type: "string" }));

  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("create_poll",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(question, { type: "string" }),
        StellarSdk.xdr.ScVal.scvVec(scOptions),
        StellarSdk.nativeToScVal(Number(cost), { type: "u32" })
      ))
      .setTimeout(60).build()
  );
};

export const castAdvancedVote = async (walletAddress, pollId, optionIndex, amount) => {
  const contract = new StellarSdk.Contract(POLL_ID);
  return await submitTx(walletAddress, (src) =>
    new StellarSdk.TransactionBuilder(src, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("cast_vote",
        new StellarSdk.Address(getAddr(walletAddress)).toScVal(),
        StellarSdk.nativeToScVal(Number(pollId), { type: "u32" }),
        StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" }),
        StellarSdk.nativeToScVal(Number(amount), { type: "u32" })
      ))
      .setTimeout(60).build()
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
      .setTimeout(60).build()
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
      return StellarSdk.scValToNative(sim.result.retval);
    }
  } catch (e) {}
  return null;
};

export const getTokenBalance = async (walletAddress) => {
  try {
    const TOKEN_ID = process.env.REACT_APP_XPOLL_TOKEN_CONTRACT_ID || "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";
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
  } catch (e) {
    return "0.00";
  }
};

export const getRecentActivity = async (walletAddress) => {
  try {
    const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
    const txs = await horizon.transactions().forAccount(getAddr(walletAddress)).limit(5).order("desc").call();
    return txs.records;
  } catch (e) {
    return [];
  }
};