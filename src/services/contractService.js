import { 
  SorobanRpc, 
  Networks, 
  TransactionBuilder, 
  Contract, 
  nativeToScVal,
  scValToNative,
  Account,
  xdr
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// Initialize the Soroban RPC Server for Stellar Testnet
export const server = new SorobanRpc.Server("https://soroban-testnet.stellar.org");
export const NETWORK_PASSPHRASE = Networks.TESTNET;

// Securely load constants from our new .env.local file. We fall back gracefully to variables if missing.
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "C7QKVWBJG74HOUTZVLA6YV7QVBUQWKSDIE4OCCBNBWE45WAYJY7OY2H7";
const CONFIG_NETWORK = process.env.REACT_APP_NETWORK || "testnet";

/**
 * 1. Build Transaction Helper
 * Packages footprint simulation and finalized transaction builder securely.
 */
export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  try {
    // Fetch latest account sequence number from the network
    const sourceAccount = await server.getAccount(walletAddress);
    
    // Initialize the smart contract wrapper
    const contract = new Contract(contractAddress);
    
    // Convert native javascript values directly into ScVal Operations safely
    const operation = contract.call(method, ...args);

    // Build the underlying Stellar foundation transaction footprint
    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100", // Will be automatically augmented by the simulation result
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Provide the transaction to Soroban RPC for footprint creation and budget estimation
    const simResult = await server.simulateTransaction(tx);
    
    if (SorobanRpc.Api.isSimulationError(simResult)) {
        throw new Error(`Failed to call contract (simulation failed): ${simResult.error}`);
    }

    // Assemble the finalized transactional state applying simulation insights back into XDR footprint
    return SorobanRpc.assembleTransaction(tx, simResult).build();
  } catch (error) {
    console.error("buildTransaction Error:", error);
    throw error;
  }
};

/**
 * 2. Submit Transaction to Testnet
 * Shoots signed transaction to the RPC node and safely awaits execution confirmation.
 */
export const submitToTestnet = async (signedXdr) => {
  try {
    // Send standard Base64 Signed XDR output
    const sendResponse = await server.sendTransaction(
      xdr.TransactionEnvelope.fromXDR(signedXdr, "base64")
    );

    if (sendResponse.status === "ERROR") {
      throw new Error(`Transaction rejected or insufficient balance`);
    }

    // Since Soroban smart contract executions take varied time, we continuously check the hash status
    let statusResponse;
    const maxRetries = 15;
    
    for (let i = 0; i < maxRetries; i++) {
        statusResponse = await server.getTransaction(sendResponse.hash);
        
        if (statusResponse.status !== "NOT_FOUND") {
            if (statusResponse.status === "SUCCESS") {
                return sendResponse.hash; // Success
            } else if (statusResponse.status === "FAILED") {
                throw new Error("Failed to call contract: Smart contract execution reverted.");
            }
        }
        
        // Timeout pause between server polling
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error("Network error - please retry (Polling Timed out)");
  } catch (error) {
    console.error("submitToTestnet Error:", error);
    throw error;
  }
};

/**
 * Initializes the Poll via Contract
 */
export const initPoll = async (walletAddress, question, options) => {
  try {
    // Mapping arguments into contract-safe ScVals
    const args = [
      nativeToScVal(question, { type: "string" }),
      nativeToScVal(options, { type: "vec", elements: { type: "string" } }) // Note type specifications help parse arrays properly!
    ];

    const transaction = await buildTransaction(
      walletAddress, 
      CONTRACT_ADDRESS, 
      "init_poll", 
      args
    );

    // Call Freighter API exclusively
    const signedXdr = await signTransaction(transaction.toXDR(), { network: "TESTNET" });

    // Launch XDR securely 
    return await submitToTestnet(signedXdr);

  } catch (error) {
    console.error("initPoll Error:", error);
    throw error; 
  }
};

/**
 * Casts a vote using specifically mapped argument parameters.
 */
export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  try {
    if (!walletAddress) {
      throw new Error("Wallet not connected");
    }

    const args = [nativeToScVal(optionIndex, { type: "u32" })];

    const transaction = await buildTransaction(
      walletAddress, 
      contractAddress, 
      "vote", 
      args
    );

    const signedXdr = await signTransaction(transaction.toXDR(), { network: "TESTNET" });
    
    return await submitToTestnet(signedXdr);

  } catch (error) {
    console.error("castVote Error:", error);
    throw error;
  }
};

/**
 * Fetch static results from Soroban. No user interaction or Freighter signatures are needed!
 */
export const getResults = async (contractAddress) => {
  try {
    const contract = new Contract(contractAddress);
    
    // We utilize a dummy placeholder key address because `simulateTransaction` requires a mathematically valid baseline address
    const dummyAccount = new Account("GBZXN7PIRZGNJC5A5TGGUSVALQATDF6SBRGBY4ZFR2D3D3V6EBNL3MBY", "0");
    const operation = contract.call("get_results");
    
    const tx = new TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Failed to call contract (read-only Error): ${simResult.error}`);
    }

    if (!simResult.result || !simResult.result.retval) {
       throw new Error("Empty return value context");
    }

    // Convert deeply nested Soroban ScVal trees back into Native JS structures Array(X, Y, Z) automatically
    const resultsRaw = scValToNative(simResult.result.retval);
    return Array.isArray(resultsRaw) ? resultsRaw : [];
  } catch (error) {
    console.error("getResults Error:", error);
    throw error;
  }
};
