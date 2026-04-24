/* global BigInt */
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = process.env.REACT_APP_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

let server;
try {
  server = new StellarSdk.rpc.Server(RPC_URL);
} catch (e) {
  server = new StellarSdk.SorobanRpc.Server(RPC_URL);
}

export const TOKEN_ID = process.env.REACT_APP_XPOLL_TOKEN_CONTRACT_ID || "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";
export const POOL_ID = process.env.REACT_APP_LIQUIDITY_POOL_CONTRACT_ID || "CCJLAH3Y7ZYJEZH44PENQFV3XZ75452DZG2SPZNTRFAQC3MT5KGGERQV";
export const POLL_ID = process.env.REACT_APP_ADVANCED_POLL_CONTRACT_ID || "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";

// Helper to safely get address string
const getAddr = (wallet) => {
  if (!wallet) return "";
  if (typeof wallet === 'string') return wallet;
  return wallet.address || wallet.toString() || "";
};

export const swapTokens = async (walletAddress, amount, isXPollToXlm) => {
  const addr = getAddr(walletAddress);
  if (!addr || !POOL_ID) throw new Error("Invalid Configuration");

  try {
    const sourceAccount = await server.getAccount(addr);
    const contract = new StellarSdk.Contract(POOL_ID);
    const methodName = isXPollToXlm ? "swap_xpoll_to_native" : "swap_native_to_xpoll";
    const amountBigInt = BigInt(Math.floor(Number(amount) * 10000000));
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call(methodName, 
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(amountBigInt, { type: "i128" })
      ))
      .setTimeout(60).build();

    const sim = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(sim)) throw new Error("Simulation Failed");

    const assembledTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
    const signed = await signTransaction(assembledTx.toXDR(), { network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
    
    let xdr = typeof signed === 'string' ? signed : (signed.signedXdr || signed.result || "");
    const submission = await server.sendTransaction(new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE));
    return submission.hash;
  } catch (e) {
    console.error("Swap Error:", e);
    throw e;
  }
};

export const getTokenBalance = async (walletAddress) => {
  const addr = getAddr(walletAddress);
  if (!addr || !TOKEN_ID) return "0.00";
  try {
    const contract = new StellarSdk.Contract(TOKEN_ID);
    const simAccount = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(simAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("balance_of", new StellarSdk.Address(addr).toScVal()))
      .setTimeout(30).build();

    const sim = await server.simulateTransaction(tx);
    if (!sim || !sim.result || !sim.result.retval) return "0.00";
    
    const raw = StellarSdk.scValToNative(sim.result.retval);
    const formatted = (Number(raw) / 10000000);
    return formatted > 0 ? formatted.toFixed(2) : Number(raw).toString();
  } catch (e) {
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
      .setTimeout(30).build();

    const sim = await server.simulateTransaction(tx);
    if (!sim || !sim.result || !sim.result.retval) return { xpoll: '0', native: '0' };
    const [rx, rn] = StellarSdk.scValToNative(sim.result.retval);
    return { xpoll: (Number(rx)/10000000).toFixed(2), native: (Number(rn)/10000000).toFixed(2) };
  } catch (e) { return { xpoll: '0', native: '0' }; }
};

export const getNativeBalance = async (walletAddress) => {
  const addr = getAddr(walletAddress);
  if (!addr) return "0.00";
  try {
    const resp = await fetch(`https://horizon-testnet.stellar.org/accounts/${addr}`);
    const data = await resp.json();
    const native = data.balances.find(b => b.asset_type === 'native');
    return native ? parseFloat(native.balance).toFixed(2) : "0.00";
  } catch (e) { return "0.00"; }
};

export const getRecentActivity = async (walletAddress) => {
  const addr = getAddr(walletAddress);
  if (!addr) return [];
  try {
    const resp = await fetch(`https://horizon-testnet.stellar.org/accounts/${addr}/transactions?limit=5&order=desc`);
    const data = await resp.json();
    return data._embedded.records.map(tx => ({ hash: tx.hash, created_at: tx.created_at, successful: tx.successful }));
  } catch (e) { return []; }
};

export const createPoll = async (walletAddress, question, options, cost) => {
  const addr = getAddr(walletAddress);
  if (!addr || !POLL_ID) throw new Error("Config Error");
  try {
    const sourceAccount = await server.getAccount(addr);
    const contract = new StellarSdk.Contract(POLL_ID);
    const costBigInt = BigInt(Math.floor(Number(cost) * 10000000));

    // Correctly encode Vec<String> for Soroban contract
    const optionsScVal = StellarSdk.xdr.ScVal.scvVec(
      options.map(opt => StellarSdk.nativeToScVal(String(opt), { type: "string" }))
    );

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("create_poll", 
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(String(question), { type: "string" }),
        optionsScVal,
        StellarSdk.nativeToScVal(costBigInt, { type: "i128" })
      ))
      .setTimeout(60).build();

    const sim = await server.simulateTransaction(tx);
    const assembledTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
    const signed = await signTransaction(assembledTx.toXDR(), { network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
    let xdr = typeof signed === 'string' ? signed : (signed.signedXdr || signed.result || "");
    const submission = await server.sendTransaction(new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE));
    return submission.hash;
  } catch (e) { throw e; }
};

export const castAdvancedVote = async (walletAddress, pollId, optionIndex, amount) => {
  const addr = getAddr(walletAddress);
  if (!addr || !POLL_ID) throw new Error("Config Error");
  try {
    const sourceAccount = await server.getAccount(addr);
    const contract = new StellarSdk.Contract(POLL_ID);
    const amt = BigInt(Math.floor(Number(amount) * 10000000));

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("vote", 
        new StellarSdk.Address(addr).toScVal(),
        StellarSdk.nativeToScVal(Number(pollId), { type: "u32" }),
        StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" }),
        StellarSdk.nativeToScVal(amt, { type: "i128" })
      ))
      .setTimeout(60).build();

    const sim = await server.simulateTransaction(tx);
    const assembledTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
    const signed = await signTransaction(assembledTx.toXDR(), { network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
    let xdr = typeof signed === 'string' ? signed : (signed.signedXdr || signed.result || "");
    const submission = await server.sendTransaction(new StellarSdk.Transaction(xdr, NETWORK_PASSPHRASE));
    return submission.hash;
  } catch (e) { throw e; }
};

export const getAdvancedPollResults = async (pollId) => {
  if (!POLL_ID) return null;
  try {
    const contract = new StellarSdk.Contract(POLL_ID);
    const simAccount = new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tx = new StellarSdk.TransactionBuilder(simAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("get_poll_info", StellarSdk.nativeToScVal(Number(pollId), { type: "u32" })))
      .setTimeout(30).build();
    const sim = await server.simulateTransaction(tx);
    if (!sim || !sim.result || !sim.result.retval) return null;
    return StellarSdk.scValToNative(sim.result.retval);
  } catch (e) { return null; }
};
