const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const TOKEN_ID = process.env.REACT_APP_XPOLL_TOKEN_CONTRACT_ID;
const POOL_ID = process.env.REACT_APP_LIQUIDITY_POOL_CONTRACT_ID;
const POLL_ID = process.env.REACT_APP_ADVANCED_POLL_CONTRACT_ID;
const NATIVE_XLM_ID = "CDLZFC3SYJYDZT7K67VZ75YJBMKBAV2AYZ677T6XF5SPSQ43THV3QOUI"; // Testnet Native Asset ID

async function init() {
  console.log("🛠️ Initializing contracts on Testnet...");

  try {
    const adminAddress = execSync('stellar keys address abhishek').toString().trim();
    console.log(`👤 Admin Address: ${adminAddress}`);

    // 1. Init Token
    try {
      console.log("🪙 Initializing XPOLL Token...");
      execSync(`stellar contract invoke --id ${TOKEN_ID} --network testnet --source abhishek -- init --admin ${adminAddress}`, { stdio: 'inherit' });
    } catch (e) {
      console.log("ℹ️ Token already initialized or skipped.");
    }

    // 2. Init Pool
    try {
      console.log("🌊 Initializing Liquidity Pool...");
      execSync(`stellar contract invoke --id ${POOL_ID} --network testnet --source abhishek -- init --xpoll=${TOKEN_ID} --native=${NATIVE_XLM_ID}`, { stdio: 'inherit' });
    } catch (e) {
      console.log("ℹ️ Pool already initialized or skipped.");
    }

    // 3. Init Poll
    try {
      console.log("🗳️ Initializing Poll System...");
      execSync(`stellar contract invoke --id ${POLL_ID} --network testnet --source abhishek -- init --token_addr ${TOKEN_ID}`, { stdio: 'inherit' });
    } catch (e) {
      console.log("ℹ️ Poll already initialized or skipped.");
    }

    console.log("\n✨ All contracts initialized and ready for production!");
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
  }
}

init();
