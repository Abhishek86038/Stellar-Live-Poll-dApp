import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// FORCE TESTNET STRINGS
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";
const RPC_URL = "https://soroban-testnet.stellar.org";

console.log("Stellar Service Initializing on Network:", TESTNET_PASSPHRASE);

let server;
try {
  if (StellarSdk.rpc && StellarSdk.rpc.Server) {
    server = new StellarSdk.rpc.Server(RPC_URL);
  } else if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) {
    server = new StellarSdk.SorobanRpc.Server(RPC_URL);
  } else {
    server = new StellarSdk.rpc.Server(RPC_URL);
  }
} catch (e) {
  server = new StellarSdk.rpc.Server(RPC_URL);
}

export { server };

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  console.log("Building Transaction for:", method, "on", TESTNET_PASSPHRASE);
  
  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
  
  // Create transaction with explicit network
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "2000",
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  
  // Assemble using the same hardcoded passphrase
  const assemble = StellarSdk.rpc ? StellarSdk.rpc.assembleTransaction : StellarSdk.SorobanRpc.assembleTransaction;
  const finalized = assemble(tx, simResult).build();
  
  return finalized;
};

export const submitToTestnet = async (signedXdr) => {
  let xdrStr = typeof signedXdr === 'string' ? signedXdr : (signedXdr.signedTransaction || signedXdr.xdr || "");
  console.log("Submitting signed XDR to Testnet...");

  // Force Testnet Network Passphrase during re-parsing
  const tx = StellarSdk.TransactionBuilder.fromXDR(xdrStr, TESTNET_PASSPHRASE);
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") throw new Error("Transaction rejected");

  for (let i = 0; i < 20; i++) {
    const status = await server.getTransaction(response.hash);
    if (status.status === "SUCCESS") return response.hash;
    if (status.status === "FAILED") throw new Error("Execution failed");
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Polling timeout");
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  // EXPLICIT TYPE CONVERSION
  const addrStr = typeof walletAddress === 'string' ? walletAddress : (walletAddress?.address || walletAddress?.toString() || "");
  const voterScVal = new StellarSdk.Address(addrStr).toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(addrStr, contractAddress, "vote", [voterScVal, optionScVal]);
  
  // Sign using Freighter with explicit network name
  const signed = await signTransaction(transaction.toXDR(), { network: "TESTNET" });
  
  return await submitToTestnet(signed);
};

export const getResults = async (contractAddress) => {
  try {
    const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
    const dummy = new StellarSdk.Account("GCO527YCC6DNDK3K6FN654WXAINDGNB35FUFAN3LURDENIIBD7ZFAJN6", "0");
    
    const tx = new StellarSdk.TransactionBuilder(dummy, { 
      fee: "100", 
      networkPassphrase: TESTNET_PASSPHRASE 
    })
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
