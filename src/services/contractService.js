import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

/**
 * Universal Compatibility Layer for Stellar SDK (v14 and v15+)
 */
const getRpcServer = (url) => {
  // Try v15+ format (rpc namespace)
  if (StellarSdk.rpc && StellarSdk.rpc.Server) {
    return new StellarSdk.rpc.Server(url);
  }
  // Try v14 and below format (SorobanRpc namespace)
  if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) {
    return new StellarSdk.SorobanRpc.Server(url);
  }
  // Ultimate fallback
  throw new Error("Compatible Stellar SDK RPC Server not found. Please check your dependencies.");
};

export const server = getRpcServer("https://soroban-testnet.stellar.org");
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const CONTRACT_ADDRESS = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  try {
    const sourceAccount = await server.getAccount(walletAddress);
    const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ADDRESS);
    const operation = contract.call(method, ...args);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: "100", 
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    
    // Safety check for simulation status
    const isSimError = (StellarSdk.rpc && StellarSdk.rpc.Api.isSimulationError(simResult)) || 
                       (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Api.isSimulationError(simResult));

    if (isSimError) {
        throw new Error(`Simulation failed: ${simResult.error || "Unknown error"}`);
    }

    // Universal assemble
    if (StellarSdk.rpc) return StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    return StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();
  } catch (error) {
    console.error("buildTransaction Error:", error);
    throw error;
  }
};

export const submitToTestnet = async (signedXdr) => {
  try {
    const transaction = StellarSdk.xdr.TransactionEnvelope.fromXDR(signedXdr, "base64");
    const sendResponse = await server.sendTransaction(transaction);

    if (sendResponse.status === "ERROR") {
      throw new Error(`Transaction rejected`);
    }

    let statusResponse;
    for (let i = 0; i < 15; i++) {
        statusResponse = await server.getTransaction(sendResponse.hash);
        if (statusResponse.status !== "NOT_FOUND") {
            if (statusResponse.status === "SUCCESS") return sendResponse.hash;
            if (statusResponse.status === "FAILED") throw new Error("Contract execution failed");
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Polling timeout");
  } catch (error) {
    console.error("submitToTestnet Error:", error);
    throw error;
  }
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  const args = [
    StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
    StellarSdk.nativeToScVal(optionIndex, { type: "u32" })
  ];
  const transaction = await buildTransaction(walletAddress, contractAddress, "vote", args);
  const signedXdr = await signTransaction(transaction.toXDR(), { network: "TESTNET" });
  return await submitToTestnet(signedXdr);
};

export const getResults = async (contractAddress) => {
  try {
    const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ADDRESS);
    const dummyAccount = new StellarSdk.Account("GCO527YCC6DNDK3K6FN654WXAINDGNB35FUFAN3LURDENIIBD7ZFAJN6", "0");
    const operation = contract.call("get_results");
    
    const tx = new StellarSdk.TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (!simResult.result || !simResult.result.retval) return [];
    return StellarSdk.scValToNative(simResult.result.retval);
  } catch (error) {
    console.error("getResults Error:", error);
    return [];
  }
};
