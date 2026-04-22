import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";
const RPC_URL = "https://soroban-testnet.stellar.org";

console.log("Stellar Service Loaded - Build Hash: ForceFinal_01");

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
    fee: "3500",
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

export const submitToTestnet = async (signedData) => {
  try {
    let xdr = "";
    // EXHAUSTIVE EXTRACTION
    if (typeof signedData === "string") {
      xdr = signedData;
    } else if (signedData && typeof signedData === "object") {
      xdr = signedData.signedTransaction || signedData.signedXdr || signedData.xdr || "";
    }

    if (!xdr) {
      throw new Error("Empty signature received from wallet.");
    }

    const tx = new StellarSdk.Transaction(xdr, TESTNET_PASSPHRASE);
    const response = await server.sendTransaction(tx);

    if (response.status === "ERROR") throw new Error("Transaction rejected by Soroban RPC");

    console.log("Transaction sent! Hash:", response.hash);

    for (let i = 0; i < 25; i++) {
        const txData = await server.getTransaction(response.hash);
        if (txData.status === "SUCCESS") return response.hash;
        if (txData.status === "FAILED") throw new Error("Contract execution failed on-chain");
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Status polling timed out (check history in wallet)");
  } catch (err) {
    throw err;
  }
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  const addr = typeof walletAddress === "string" ? walletAddress : (walletAddress?.address || walletAddress?.toString() || "");
  const voterScVal = new StellarSdk.Address(addr).toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(addr, contractAddress, "vote", [voterScVal, optionScVal]);
  
  // LOG for debugging in production console
  console.log("Signing transaction for network:", TESTNET_PASSPHRASE);
  
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
