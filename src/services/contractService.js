import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// 100% HARDCODED FOR STABILITY
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";
const RPC_URL = "https://soroban-testnet.stellar.org";

let server;
try {
  if (StellarSdk.rpc) {
    server = new StellarSdk.rpc.Server(RPC_URL);
  } else {
    server = new StellarSdk.SorobanRpc.Server(RPC_URL);
  }
} catch (e) {
  server = new StellarSdk.rpc.Server(RPC_URL);
}

export { server };

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
  
  // Create transaction with explicit network string
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "3000",
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  
  const assemble = StellarSdk.rpc ? StellarSdk.rpc.assembleTransaction : StellarSdk.SorobanRpc.assembleTransaction;
  return assemble(tx, simResult).build();
};

export const submitToTestnet = async (signedXdr) => {
  try {
    let xdrStr = typeof signedXdr === 'string' ? signedXdr : (signedXdr.signedTransaction || signedXdr.xdr || "");
    if (!xdrStr) throw new Error("No XDR");

    // USE DIRECT TRANSACTION CONSTRUCTOR (Most Stable)
    const tx = new StellarSdk.Transaction(xdrStr, TESTNET_PASSPHRASE);
    const response = await server.sendTransaction(tx);

    if (response.status === "ERROR") throw new Error("Rejected");

    for (let i = 0; i < 20; i++) {
      const status = await server.getTransaction(response.hash);
      if (status.status === "SUCCESS") return response.hash;
      if (status.status === "FAILED") throw new Error("Execution failed");
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Timeout");
  } catch (e) {
    throw e;
  }
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  const addrStr = typeof walletAddress === 'string' ? walletAddress : (walletAddress?.address || walletAddress?.toString() || "");
  const voterScVal = new StellarSdk.Address(addrStr).toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(addrStr, contractAddress, "vote", [voterScVal, optionScVal]);
  const signed = await signTransaction(transaction.toXDR(), { 
    network: "TESTNET",
    networkPassphrase: TESTNET_PASSPHRASE 
  });
  return await submitToTestnet(signed);
};

export const getResults = async (contractAddress) => {
  try {
    const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
    const dummy = new StellarSdk.Account("GCO527YCC6DNDK3K6FN654WXAINDGNB35FUFAN3LURDENIIBD7ZFAJN6", "0");
    const tx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: TESTNET_PASSPHRASE })
      .addOperation(contract.call("get_results"))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (!sim.result || !sim.result.retval) return [];
    return StellarSdk.scValToNative(sim.result.retval);
  } catch (err) { return []; }
};
