import * as StellarSdk from "@stellar/stellar-sdk";

export const getTransactionXDR = (transaction) => {
  if (!transaction) return null;
  try {
    if (typeof transaction.toXDR === 'function') {
        return transaction.toXDR();
    }
    // Fallback
    return StellarSdk.xdr.TransactionEnvelope.encode(transaction.toEnvelope()).toString("base64");
  } catch (e) {
    console.error("XDR Generation Error:", e);
    return null;
  }
};

export const signWithFreighter = async (xdr) => {
  try {
    const { signedTxXdr } = await window.freighterApi.signTransaction(xdr, {
      network: 'TESTNET'
    });
    return signedTxXdr;
  } catch (e) {
    throw e;
  }
};
