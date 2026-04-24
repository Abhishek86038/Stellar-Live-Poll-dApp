import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3"; // Primary fallback, should use process.env.REACT_APP_CONTRACT_ID in production
const RPC_URL = "https://soroban-testnet.stellar.org";

let server;
try {
  server = StellarSdk.rpc ? new StellarSdk.rpc.Server(RPC_URL) : new StellarSdk.SorobanRpc.Server(RPC_URL);
} catch (e) {
  server = new StellarSdk.rpc.Server(RPC_URL);
}

export { server };

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "5000",
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simResult = await server.simulateTransaction(tx);
  const assemble = StellarSdk.rpc ? StellarSdk.rpc.assembleTransaction : StellarSdk.SorobanRpc.assembleTransaction;
  return assemble(tx, simResult).build();
};

export const submitToTestnet = async (signedResponse) => {
  console.log("Processing Wallet Response:", signedResponse);
  let xdr = "";

  // SEARCH & RESCUE LOGIC: Find any string that looks like an XDR signature
  if (typeof signedResponse === "string") {
    xdr = signedResponse;
  } else if (signedResponse && typeof signedResponse === "object") {
    // 1. Direct Keys
    xdr = signedResponse.signedTransaction || signedResponse.signedXdr || signedResponse.xdr || signedResponse.result || "";
    
    // 2. Deep Scan: If still not found, look for any long string property
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
    throw new Error(`Signature missing. Keys: ${Object.keys(signedResponse || {}).join(", ")}`);
  }

  const tx = new StellarSdk.Transaction(xdr, TESTNET_PASSPHRASE);
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") throw new Error("Transaction rejected by network.");

  // Fast-track response
  return response.hash;
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  const addr = typeof walletAddress === "string" ? walletAddress : (walletAddress?.address || walletAddress?.toString() || "");
  const voterScVal = new StellarSdk.Address(addr).toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(addr, contractAddress, "vote", [voterScVal, optionScVal]);
  
  // Use try-catch to handle Freighter's specific error throws
  try {
    const result = await signTransaction(transaction.toXDR(), {
        network: "TESTNET",
        networkPassphrase: TESTNET_PASSPHRASE
    });
    return await submitToTestnet(result);
  } catch (err) {
    throw new Error(err.message || "Signing was cancelled in Freighter.");
  }
};

export const getResults = async (walletAddress, contractAddress) => {
  try {
    const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
    
    // Use the connected wallet if available, otherwise a generic public address for read-only simulation
    const sourceAddr = walletAddress || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"; 
    const sourceAccount = new StellarSdk.Account(sourceAddr, "0");

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, { 
      fee: "100", 
      networkPassphrase: TESTNET_PASSPHRASE 
    })
      .addOperation(contract.call("get_results"))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (!sim.result || !sim.result.retval) return [];
    
    // Native conversion of Soroban ScVal
    return StellarSdk.scValToNative(sim.result.retval);
  } catch (err) { 
    console.error("Fetch Results Error:", err);
    return []; 
  }
};
