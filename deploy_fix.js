const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK = "testnet";
const SOURCE = "abhishek"; // Updated with your identity name
const ENV_PATH = path.join(__dirname, '.env.local');

async function deploy() {
    console.log("🚀 Starting Deployment of Fixed Contract...");

    try {
        // 1. Build
        console.log("📦 Building WASM...");
        execSync('stellar contract build', { cwd: path.join(__dirname, 'smart-contract'), stdio: 'inherit' });

        // 2. Deploy
        console.log("🌍 Deploying to Testnet...");
        const RPC = "https://soroban-testnet.stellar.org";
        const PASS = "Test SDF Network ; September 2015";
        const wasmPath = "smart-contract/target/wasm32v1-none/release/advanced_poll.wasm";
        
        const deployCmd = `stellar contract deploy --wasm ${wasmPath} --source ${SOURCE} --rpc-url ${RPC} --network-passphrase "${PASS}"`;
        const contractId = execSync(deployCmd).toString().trim();
        console.log(`✅ New Contract ID: ${contractId}`);

        // 3. Initialize (Linking Token Contract)
        const TOKEN_ID = "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";
        console.log("⚙️ Initializing Contract...");
        const initCmd = `stellar contract invoke --id ${contractId} --source ${SOURCE} --rpc-url ${RPC} --network-passphrase "${PASS}" -- init --token_addr ${TOKEN_ID}`;
        execSync(initCmd, { stdio: 'inherit' });

        // 4. Update .env.local
        if (fs.existsSync(ENV_PATH)) {
            let envContent = fs.readFileSync(ENV_PATH, 'utf8');
            const regex = /REACT_APP_ADVANCED_POLL_CONTRACT_ID=.*/;
            if (envContent.match(regex)) {
                envContent = envContent.replace(regex, `REACT_APP_ADVANCED_POLL_CONTRACT_ID=${contractId}`);
            } else {
                envContent += `\nREACT_APP_ADVANCED_POLL_CONTRACT_ID=${contractId}`;
            }
            fs.writeFileSync(ENV_PATH, envContent);
            console.log("📝 .env.local updated successfully!");
        }

        console.log("\n✨ ALL DONE! Please restart your 'npm start' to use the new contract.");
        console.log("New ID to check:", contractId);

    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        console.log("\nTIP: Make sure you have 'stellar-cli' installed and a 'default' identity configured.");
    }
}

deploy();
