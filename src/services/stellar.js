import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Fetches the XLM balance for a given public key.
 */
export const getAccountBalance = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === "native");
    return nativeBalance ? nativeBalance.balance : "0";
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw error;
  }
};

/**
 * Builds a payment transaction XDR string.
 */
export const buildPaymentTransaction = async (senderPublicKey, recipientPublicKey, amount) => {
  try {
    const account = await server.loadAccount(senderPublicKey);
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: recipientPublicKey,
          asset: StellarSdk.Asset.native(),
          amount: amount.toString(),
        })
      )
      .setTimeout(StellarSdk.TimeoutInfinite)
      .build();

    return transaction.toXDR();
  } catch (error) {
    console.error("Error building transaction:", error);
    throw error;
  }
};

/**
 * Submits a signed transaction XDR to the network.
 */
export const submitTransaction = async (signedXDR) => {
  try {
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      StellarSdk.Networks.TESTNET
    );
    const result = await server.submitTransaction(transaction);
    return result;
  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
};

/**
 * Generates a SEP-0007 payment URI.
 */
export const generatePaymentURI = (destination, amount, memo) => {
  const baseUrl = "web+stellar:pay";
  const params = new URLSearchParams({
    destination,
    amount,
  });

  if (memo) {
    params.append("memo", memo);
    params.append("memo_type", "MEMO_TEXT");
  }

  return `${baseUrl}?${params.toString()}`;
};

export { server };
