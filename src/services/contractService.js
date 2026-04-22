import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// FORCED CONSTANTS
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";
const RPC_URL = "https://soroban-testnet.stellar.org";

console.log("!!! BOOTING STELLAR SERVICE - V_ULTIMATE_CHECK !!!");

// Force Global Network (Old SDK Style)
try {
  if (StellarSdk.Network) {
    StellarSdk.Network.useTestNetwork();
  } else if (StellarSdk.Networks) {
    // Some SDK versions use this
  }
} catch(e) {}

let server;
try {
  server = StellarSdk.rpc
    ? new StellarSdk.rpc.Server(RPC_URL)
    : new StellarSdk.SorobanRpc.Server(RPC_URL);
} catch (e) {
  server = new StellarSdk.rpc.Server(RPC_URL);
}

export { server };

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  console.log("Building for Address:", walletAddress);
  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);

  // New SDK Style
  const builder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "4000",
    networkPassphrase: TESTNET_PASSPHRASE,
  });

  const tx = builder
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  const assemble = StellarSdk.rpc
    ? StellarSdk.rpc.assembleTransaction
    : StellarSdk.SorobanRpc.assembleTransaction;
    
  const finalized = assemble(tx, simResult).build();
  
  // Double Check Passphrase before shipping to wallet
  console.log("XDR built. Network:", finalized.networkPassphrase || "Implicit");
  return finalized;
};

export const submitToTestnet = async (signedData) => {
  console.log("Raw Result from Freighter:", signedData);
  
  try {
    let xdr = "";
    if (typeof signedData === "string") {
      xdr = signedData;
    } else if (signedData && typeof signedData === "object") {
      // Catch every possible key Freighter might use
      xdr = signedData.signedTransaction || 
            signedData.signedXdr || 
            signedData.xdr || 
            signedData.result || 
            "";
    }

    if (!xdr) {
      console.error("DEBUG: signTransaction returned nothing usable:", signedData);
      throw new Error("Empty signature received from wallet. Did the popup show Mainnet?");
    }

    const tx = new StellarSdk.Transaction(xdr, TESTNET_PASSPHRASE);
    const response = await server.sendTransaction(tx);

    if (response.status === "ERROR") throw new Error("Rejected by Network RPC");

    for (let i = 0; i < 30; i++) {
        const txData = await server.getTransaction(response.hash);
        if (txData.status === "SUCCESS") return response.hash;
        if (txData.status === "FAILED") throw new Error("Transaction execution failed on ledger");
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Verification timeout - Transaction may still succeed later");
  } catch (err) {
    throw err;
  }
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  const addr = typeof walletAddress === "string" ? walletAddress : (walletAddress?.address || walletAddress?.toString() || "");
  const voterScVal = new StellarSdk.Address(addr).toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(addr, contractAddress, "vote", [voterScVal, optionScVal]);
  
  // LOG for console debugging
  console.log("Prompting signTransaction for Testnet...");
  
  const result = await signTransaction(transaction.toXDR(), {
    network: "TESTNET",
    networkPassphrase: TESTNET_PASSPHRASE
  });

  return await submitToTestnet(result);
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
  } catch (err) { return []; }
};
