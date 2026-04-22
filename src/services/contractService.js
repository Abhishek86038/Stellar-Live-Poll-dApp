import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";
const RPC_URL = "https://soroban-testnet.stellar.org";

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
  const assemble = StellarSdk.rpc
    ? StellarSdk.rpc.assembleTransaction
    : StellarSdk.SorobanRpc.assembleTransaction;
    
  return assemble(tx, simResult).build();
};

export const submitToTestnet = async (signedResponse) => {
  console.log("FREIGHTER RESPONSE RECEIVED:", signedResponse);
  
  try {
    let xdr = "";
    
    // OMNI-EXTRACTION: Check every possible corner for the XDR signature
    if (typeof signedResponse === "string") {
      xdr = signedResponse;
    } else if (signedResponse && typeof signedResponse === "object") {
      xdr = signedResponse.signedTransaction || 
            signedResponse.signedXdr || 
            signedResponse.xdr || 
            signedResponse.result || 
            (signedResponse.envelope && signedResponse.envelope.xdr) ||
            "";
      
      // Some versions nest it deep
      if (!xdr && signedResponse.result && typeof signedResponse.result === 'object') {
        xdr = signedResponse.result.xdr || signedResponse.result.signedTransaction || "";
      }
    }

    if (!xdr) {
      console.error("FATAL: Could not find XDR in wallet response. Keys found:", Object.keys(signedResponse || {}));
      throw new Error("Unable to extract signature from wallet response.");
    }

    const tx = new StellarSdk.Transaction(xdr, TESTNET_PASSPHRASE);
    const response = await server.sendTransaction(tx);

    if (response.status === "ERROR") {
        console.error("RPC Submission Error:", response);
        throw new Error("Network rejected transaction. Please check if account has Testnet XLM.");
    }

    for (let i = 0; i < 30; i++) {
        const txData = await server.getTransaction(response.hash);
        if (txData.status === "SUCCESS") return response.hash;
        if (txData.status === "FAILED") throw new Error("On-chain execution failed (Already voted?)");
        await new Promise(r => setTimeout(r, 2000));
    }
    return response.hash; // Return hash anyway if polling takes too long
  } catch (err) {
    console.error("submitToTestnet caught error:", err);
    throw err;
  }
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  const addr = typeof walletAddress === "string" ? walletAddress : (walletAddress?.address || walletAddress?.toString() || "");
  const voterScVal = new StellarSdk.Address(addr).toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(addr, contractAddress, "vote", [voterScVal, optionScVal]);
  
  console.log("Requesting signature from Freighter...");
  
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
