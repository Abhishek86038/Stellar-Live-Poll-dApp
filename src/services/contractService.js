import { 
  rpc, 
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
// In v15+, we use rpc.Server
export const server = new rpc.Server("https://soroban-testnet.stellar.org");
export const NETWORK_PASSPHRASE = Networks.TESTNET;

// Fallback ID for robustness
const CONTRACT_ADDRESS = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  try {
    const sourceAccount = await server.getAccount(walletAddress);
    const contract = new Contract(contractAddress || CONTRACT_ADDRESS);
    const operation = contract.call(method, ...args);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100", 
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    
    if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`);
    }

    return rpc.assembleTransaction(tx, simResult).build();
  } catch (error) {
    console.error("buildTransaction Error:", error);
    throw error;
  }
};

export const submitToTestnet = async (signedXdr) => {
  try {
    const sendResponse = await server.sendTransaction(
      xdr.TransactionEnvelope.fromXDR(signedXdr, "base64")
    );

    if (sendResponse.status === "ERROR") {
      throw new Error(`Transaction rejected`);
    }

    let statusResponse;
    for (let i = 0; i < 15; i++) {
        statusResponse = await server.getTransaction(sendResponse.hash);
        if (statusResponse.status !== "NOT_FOUND") {
            if (statusResponse.status === "SUCCESS") return sendResponse.hash;
            if (statusResponse.status === "FAILED") throw new Error("Contract call failed");
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
  try {
    const args = [
      nativeToScVal(walletAddress, { type: "address" }),
      nativeToScVal(optionIndex, { type: "u32" })
    ];

    const transaction = await buildTransaction(walletAddress, contractAddress, "vote", args);
    const signedXdr = await signTransaction(transaction.toXDR(), { network: "TESTNET" });
    return await submitToTestnet(signedXdr);
  } catch (error) {
    throw error;
  }
};

export const getResults = async (contractAddress) => {
  try {
    const contract = new Contract(contractAddress || CONTRACT_ADDRESS);
    const dummyAccount = new Account("GCO527YCC6DNDK3K6FN654WXAINDGNB35FUFAN3LURDENIIBD7ZFAJN6", "0");
    const operation = contract.call("get_results");
    
    const tx = new TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (!simResult.result || !simResult.result.retval) return [];
    return scValToNative(simResult.result.retval);
  } catch (error) {
    console.error("getResults Error:", error);
    return [];
  }
};
