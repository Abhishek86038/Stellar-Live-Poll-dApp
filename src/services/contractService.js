import * as StellarSdk from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const server = new StellarSdk.rpc.Server(RPC_URL);

export const submitTransaction = async (walletAddress, transaction) => {
  try {
    const sim = await server.simulateTransaction(transaction);
    if (StellarSdk.rpc.Api.isSimulationError(sim)) {
      throw new Error("Simulation failed");
    }

    const assembled = StellarSdk.rpc.assembleTransaction(transaction, sim);
    
    // Safety check for toXDR
    let xdr;
    if (assembled && typeof assembled.toXDR === 'function') {
        xdr = assembled.toXDR();
    } else if (assembled && assembled.transaction && typeof assembled.transaction.toXDR === 'function') {
        xdr = assembled.transaction.toXDR();
    } else {
        xdr = StellarSdk.xdr.TransactionEnvelope.encode(assembled.toEnvelope()).toString("base64");
    }

    const { signedTxXdr } = await window.freighterApi.signTransaction(xdr, {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE
    });

    const signedTx = new StellarSdk.Transaction(signedTxXdr, NETWORK_PASSPHRASE);
    return await server.sendTransaction(signedTx);
  } catch (error) {
    console.error("Contract Service Error:", error);
    throw error;
  }
};
