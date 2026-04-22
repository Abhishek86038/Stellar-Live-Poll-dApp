const { rpc, TransactionBuilder, Networks, Keypair, Operation, Asset, xdr, scValToNative, Address } = require("@stellar/stellar-sdk");
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SECRET_KEY = process.env.SECRET_KEY || "SARA576LORQY7YBI5QX3NUIJDWTQA2EIXVJO2CWIUG24ALEF4TBHGU3K";
const WASM_PATH = "smart-contract/target/wasm32v1-none/release/live_poll_contract.wasm";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

async function deploy() {
  const server = new rpc.Server(RPC_URL);
  const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
  
  console.log(`Starting deployment for ${sourceKeypair.publicKey()}...`);

  // Step 1: Upload WASM
  const wasm = fs.readFileSync(WASM_PATH);
  
  const uploadOperation = Operation.uploadContractWasm({
      wasm: wasm
  });

  const uploadTx = new TransactionBuilder(sourceAccount, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE
  })
      .addOperation(uploadOperation)
      .setTimeout(30)
      .build();

  const simUploadRes = await server.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(simUploadRes)) {
      throw new Error(`Upload Simulation failed: ${simUploadRes.error}`);
  }

  const asmUploadTx = rpc.assembleTransaction(uploadTx, simUploadRes).build();
  asmUploadTx.sign(sourceKeypair);

  console.log("Submitting WASM upload transaction...");
  const uploadResp = await server.sendTransaction(asmUploadTx);
  
  if (uploadResp.status === "ERROR") {
      throw new Error("Wasm upload rejected");
  }

  // Poll for WASM upload success
  let wasmId = null;
  for (let i = 0; i < 20; i++) {
        const statusResponse = await server.getTransaction(uploadResp.hash);
        if (statusResponse.status === "SUCCESS") {
            // Find Wasm ID from meta
            const resultMetaXdr = statusResponse.resultMetaXdr;
            wasmId = simUploadRes.result.retval.value().toString('hex');
            break;
        } else if (statusResponse.status === "FAILED") {
            throw new Error("WASM Upload failed on-chain.");
        }
        await new Promise(r => setTimeout(r, 2000));
  }

  if (!wasmId) throw new Error("Timed out waiting for WASM upload");
  console.log("✅ WASM Uploaded Successfully! Wasm ID:", wasmId);

  // Reload account for new sequence
  const sourceAccountForCreate = await server.getAccount(sourceKeypair.publicKey());

  // Step 2: Create Contract
  const createOperation = Operation.createCustomContract({
      address: new Address(sourceKeypair.publicKey()),
      wasmHash: Buffer.from(wasmId, 'hex')
  });

  const createTx = new TransactionBuilder(sourceAccountForCreate, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE
  })
      .addOperation(createOperation)
      .setTimeout(30)
      .build();

  const simCreateRes = await server.simulateTransaction(createTx);
  if (rpc.Api.isSimulationError(simCreateRes)) {
      throw new Error(`Create Simulation failed: ${simCreateRes.error}`);
  }

  const asmCreateTx = rpc.assembleTransaction(createTx, simCreateRes).build();
  asmCreateTx.sign(sourceKeypair);

  console.log("Submitting Create Contract transaction...");
  const createResp = await server.sendTransaction(asmCreateTx);
  
  let contractId = null;
  for (let i = 0; i < 20; i++) {
        const statusResponse = await server.getTransaction(createResp.hash);
        if (statusResponse.status === "SUCCESS") {
            contractId = simCreateRes.result.retval.value().toString('hex'); // wait, Address format
            
            // Actually retval is a scVal of type ScAddress
            const scAddress = simCreateRes.result.retval;
            break;
        } else if (statusResponse.status === "FAILED") {
            throw new Error("Contract Creation failed on-chain.");
        }
        await new Promise(r => setTimeout(r, 2000));
  }

  console.log("✅ Deployment Successful!");
  console.log("➡️ Replace REACT_APP_CONTRACT_ADDRESS in .env.local with this Hash/Address:");
  console.log(simCreateRes.result.retval ? scValToNative(simCreateRes.result.retval) : "Could not parse address");
  
}

deploy().catch(console.error);
