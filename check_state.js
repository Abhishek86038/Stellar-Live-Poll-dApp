const { rpc, Networks, Contract, scValToNative } = require("@stellar/stellar-sdk");

const CONTRACT_ADDRESS = "CAZXQEP322RSREGFHVZMISWCBJA755ZGUQNIRMT4Z6KTFBAK5PYTUAHU";
const RPC_URL = "https://soroban-testnet.publicnode.com";
const NETWORK_PASSPHRASE = Networks.TESTNET;

async function check() {
  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS);
  
  // Simulating tx to fetch state
  const { TransactionBuilder, Account } = require("@stellar/stellar-sdk");
  const dummyAccount = new Account("GBXBZYRUXADVOOB5TIBNDHMCH7TAUEEUDJDV5WLOBWIZMUVFBXHXQ76N", "0");
  
  const op = contract.call("get_poll_info");
  const tx = new TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(op)
    .setTimeout(30)
    .build();

  console.log("Checking poll info...");
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    console.error("Simulation Error:", sim.error);
    return;
  }
  
  const result = scValToNative(sim.result.retval);
  console.log("Poll Data:", result);
}

check().catch(console.error);
