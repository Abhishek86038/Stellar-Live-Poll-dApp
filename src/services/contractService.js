import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// Ultimate Fallbacks for Version Compatibility
const getRpcServer = (url) => {
  if (StellarSdk.rpc && StellarSdk.rpc.Server) return new StellarSdk.rpc.Server(url);
  if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) return new StellarSdk.SorobanRpc.Server(url);
  return new StellarSdk.rpc.Server(url);
};

export const server = getRpcServer("https://soroban-testnet.stellar.org");
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const CONTRACT_ID = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";

export const buildTransaction = async (walletAddress, contractAddress, method, args) => {
  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new StellarSdk.Contract(contractAddress || CONTRACT_ID);
  
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: "1000", // Standard baseline fee
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  
  if ((StellarSdk.rpc && StellarSdk.rpc.Api.isSimulationError(simResult)) || 
      (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Api.isSimulationError(simResult))) {
      throw new Error("Already voted or Contract error");
  }

  // Final assembly based on available namespace
  const assemble = StellarSdk.rpc ? StellarSdk.rpc.assembleTransaction : StellarSdk.SorobanRpc.assembleTransaction;
  return assemble(tx, simResult).build();
};

export const submitToTestnet = async (signedXdr) => {
  // Ensure we have a string XDR from Freighter
  let xdrStr = signedXdr;
  if (typeof signedXdr === 'object') {
    xdrStr = signedXdr.signedTransaction || signedXdr.xdr || signedXdr.toString();
  }

  if (typeof xdrStr !== 'string') throw new Error("Invalid XDR from wallet");

  const tx = StellarSdk.TransactionBuilder.fromXDR(xdrStr, NETWORK_PASSPHRASE);
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") throw new Error("Rejected");

  for (let i = 0; i < 15; i++) {
    const status = await server.getTransaction(response.hash);
    if (status.status === "SUCCESS") return response.hash;
    if (status.status === "FAILED") throw new Error("Execution failed");
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Timeout");
};

export const castVote = async (walletAddress, contractAddress, optionIndex) => {
  // EXPLICIT ADDRESS CONVERSION (Fixes 'must be of type String' crash)
  const voterAddressObj = new StellarSdk.Address(walletAddress);
  const voterScVal = voterAddressObj.toScVal();
  const optionScVal = StellarSdk.nativeToScVal(Number(optionIndex), { type: "u32" });

  const transaction = await buildTransaction(walletAddress, contractAddress, "vote", [voterScVal, optionScVal]);
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
