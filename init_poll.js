const { rpc, TransactionBuilder, Networks, Keypair, Operation, Asset, xdr, scValToNative, Address, nativeToScVal, Contract } = require("@stellar/stellar-sdk");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SECRET_KEY = "SARA576LORQY7YBI5QX3NUIJDWTQA2EIXVJO2CWIUG24ALEF4TBHGU3K";
const CONTRACT_ADDRESS = "CAZXQEP322RSREGFHVZMISWCBJA755ZGUQNIRMT4Z6KTFBAK5PYTUAHU";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

async function init() {
  const server = new rpc.Server(RPC_URL);
  const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
  
  console.log(`Initializing poll for ${CONTRACT_ADDRESS}...`);

  const question = "What is your favorite Stellar feature?";
  const options = ["Fast Transactions", "Low Fees", "Soroban Smart Contracts", "Asset Issuance"];
  
  const args = [
      nativeToScVal(sourceKeypair.publicKey(), { type: "address" }),
      nativeToScVal(BigInt(Date.now()), { type: "u64" }),
      nativeToScVal(BigInt(Date.now() + 86400000 * 7), { type: "u64" }), // 7 days
      nativeToScVal(question),
      nativeToScVal(options)
  ];

  const contract = new Contract(CONTRACT_ADDRESS);
  const operation = contract.call("init_poll", ...args);

  const tx = new TransactionBuilder(sourceAccount, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE
  })
      .addOperation(operation)
      .setTimeout(30)
      .build();

  const simRes = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simRes)) {
      throw new Error(`Simulation failed: ${simRes.error}`);
  }

  const asmTx = rpc.assembleTransaction(tx, simRes).build();
  asmTx.sign(sourceKeypair);

  console.log("Submitting init_poll transaction...");
  const resp = await server.sendTransaction(asmTx);
  
  for (let i = 0; i < 20; i++) {
        const statusResponse = await server.getTransaction(resp.hash);
        if (statusResponse.status === "SUCCESS") {
            console.log("✅ Poll Initialized Successfully!");
            return;
        } else if (statusResponse.status === "FAILED") {
            throw new Error("Init Poll failed on-chain.");
        }
        await new Promise(r => setTimeout(r, 2000));
  }
}

init().catch(console.error);
