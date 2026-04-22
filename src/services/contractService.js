import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// Robust RPC Server Initialization
let server;
try {
  const rpcUrl = "https://soroban-testnet.stellar.org";
  if (StellarSdk.rpc) {
    server = new StellarSdk.rpc.Server(rpcUrl);
  } else if (StellarSdk.SorobanRpc) {
    server = new StellarSdk.SorobanRpc.Server(rpcUrl);
  } else {
    // Basic fallback for older SDKs
    server = new StellarSdk.SorobanRpc.Server(rpcUrl);
  }
} catch (e) {
  console.error("RPC Init failed", e);
}

export { server };
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
  
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "1000", 
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  
  // Universal simulation error check
  const isError = (StellarSdk.rpc && StellarSdk.rpc.Api.isSimulationError(simResult)) || 
                  (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Api.isSimulationError(simResult));

  if (isError) {
      throw new Error("Simulation failed - Already voted?");
  }

  // Universal assembly
  if (StellarSdk.rpc) return StellarSdk.rpc.assembleTransaction(tx, simResult).build();
  return StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();
};

export const submitToTestnet = async (signedXdr) => {
  let xdrStr = typeof signedXdr === 'string' ? signedXdr : (signedXdr.signedTransaction || signedXdr.xdr || "");
  
  if (!xdrStr) throw new Error("No XDR received from wallet");

  const tx = StellarSdk.TransactionBuilder.fromXDR(xdrStr, NETWORK_PASSPHRASE);
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") throw new Error("Transaction rejected");

  for (let i = 0; i < 15; i++) {
    const status = await server.getTransaction(response.hash);
    if (status.status === "SUCCESS") return response.hash;
    if (status.status === "FAILED") throw new Error("Contract execution failed");
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Timeout");
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  // Robust Address Extraction (Fixes [object Object] error)
  const addrStr = typeof walletAddress === 'string' ? walletAddress : (walletAddress?.address || walletAddress?.toString() || "");
  
  if (!addrStr || !addrStr.startsWith('G')) {
    throw new Error("Invalid wallet address string");
  }

  const voterScVal = new StellarSdk.Address(addrStr).toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(addrStr, contractAddress, "vote", [voterScVal, optionScVal]);
  const signed = await signTransaction(transaction.toXDR(), { network: "TESTNET" });
  return await submitToTestnet(signed);
};

export const getResults = async (contractAddress) => {
  try {
    const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
    const dummy = new StellarSdk.Account("GCO527YCC6DNDK3K6FN654WXAINDGNB35FUFAN3LURDENIIBD7ZFAJN6", "0");
    const tx = new StellarSdk.TransactionBuilder(dummy, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("get_results"))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (!sim.result || !sim.result.retval) return [];
    return StellarSdk.scValToNative(sim.result.retval);
  } catch (err) {
    return [];
  }
};
