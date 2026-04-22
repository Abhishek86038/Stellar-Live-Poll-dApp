
const { rpc, TransactionBuilder, Contract, nativeToScVal, Keypair, Networks } = require("@stellar/stellar-sdk");
require('dotenv').config({ path: '.env.local' });

async function init() {
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  const contractId = "CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3";
  const creatorId = "GBXBZYRUXADVOOB5TIBNDHMCH7TAUEEUDJDV5WLOBWIZMUVFBXHXQ76N";
  
  // NOTE: You need the secret key for abhishek to sign this.
  // Since I don't have it, I'll recommend the user to use the CLI with a file.
  console.log("Please run the following command in your terminal to initialize the poll:");
  console.log(`soroban contract invoke --id ${contractId} --source abhishek --network testnet -- init_poll --creator ${creatorId} --created_at 1713759136 --end_time 1745295136 --question "What is your favorite Stellar feature?" --options "[\\"Fast Transactions\\", \\"Low Fees\\", \\"Soroban Smart Contracts\\", \\"Asset Issuance\\"]"`);
}

init();
