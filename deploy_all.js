const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const contracts = [
  { name: 'xpoll_token', relativePath: 'contracts/token' },
  { name: 'liquidity_pool', relativePath: 'contracts/pool' },
  { name: 'advanced_poll', relativePath: 'contracts/poll' }
];

async function deploy() {
  const rootDir = __dirname;
  const smartContractDir = path.join(rootDir, 'smart-contract');
  
  console.log("🚀 Starting Optimized Level 4 Deployment...");

  const envPath = path.join(rootDir, '.env.local');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  // 1. Build all contracts from the workspace root
  console.log("\n🛠️ Building all contracts...");
  process.chdir(smartContractDir);
  execSync('stellar contract build', { stdio: 'inherit' });

  // 2. Deploy each contract
  for (const contract of contracts) {
    try {
      console.log(`\n📦 Deploying ${contract.name}...`);
      
      const wasmPath = path.join(smartContractDir, 'target/wasm32v1-none/release', `${contract.name}.wasm`);
      
      const deployCmd = `stellar contract deploy --wasm "${wasmPath}" --network testnet --source abhishek`;
      const contractId = execSync(deployCmd).toString().trim();
      
      console.log(`✅ ${contract.name} Deployed! ID: ${contractId}`);

      const envKey = `REACT_APP_${contract.name.toUpperCase()}_CONTRACT_ID`;
      const regex = new RegExp(`${envKey}=.*`, 'g');
      
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${envKey}=${contractId}`);
      } else {
        envContent += `\n${envKey}=${contractId}`;
      }
    } catch (error) {
      console.error(`❌ Error deploying ${contract.name}:`, error.message);
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log("\n✨ Deployment Complete! .env.local has been updated.");
  console.log("🔄 Please restart your 'npm start' server to apply changes.");
}

deploy();
