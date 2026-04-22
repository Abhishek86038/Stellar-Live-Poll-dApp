import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const getRpcServer = (url) => {
  if (StellarSdk.rpc && StellarSdk.rpc.Server) return new StellarSdk.rpc.Server(url);
  if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) return new StellarSdk.SorobanRpc.Server(url);
  throw new Error("RPC Server not found");
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
    const isSimError = (StellarSdk.rpc && StellarSdk.rpc.Api.isSimulationError(simResult)) || 
                       (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Api.isSimulationError(simResult));

    if (isSimError) {
        throw new Error(`Simulation failed: ${simResult.error || "Execution reverted (Already voted?)"}`);
    }

    if (StellarSdk.rpc) return StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    return StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();
  } catch (error) {
    throw error;
  }
};

export const submitToTestnet = async (signedXdr) => {
  try {
    // FIX: Safely handles both String and Object responses from Freighter
    const xdrString = typeof signedXdr === 'string' ? signedXdr : (signedXdr.signedTransaction || signedXdr.xdr || signedXdr);
    
    if (typeof xdrString !== 'string') {
        throw new Error("Invalid signed transaction format received from wallet");
    }

    const transaction = StellarSdk.TransactionBuilder.fromXDR(xdrString, NETWORK_PASSPHRASE);
    const sendResponse = await server.sendTransaction(transaction);

    if (sendResponse.status === "ERROR") throw new Error(`Transaction rejected`);

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
    throw error;
  }
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  const args = [
    StellarSdk.nativeToScVal(walletAddress, { type: "address" }),
    StellarSdk.nativeToScVal(optionIndex, { type: "u32" })
  ];
  const transaction = await buildTransaction(walletAddress, contractAddress, "vote", args);
  
  // Get signature from Freighter
  const signedResult = await signTransaction(transaction.toXDR(), { network: "TESTNET" });
  
  // Submit cleaned XDR
  return await submitToTestnet(signedResult);
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
    return [];
  }
};
