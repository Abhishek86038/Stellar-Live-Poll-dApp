const { execSync } = require('child_process');

const TOKEN_ID = "CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ";
const POOL_ID = "CBUKW4W6FNO6J6E2672OZ6EXERWH3H7CBYUZXMMTNK7PFXK3WQRAVKNV";
const SOURCE = "abhishek";
const RPC = "https://soroban-testnet.stellar.org";
const PASS = "Test SDF Network ; September 2015";
const ADMIN_ADDR = "GBXBZYRUXADVOOB5TIBNDHMCH7TAUEEUDJDV5WLOBWIZMUVFBXHXQ76N";

async function rebalance() {
    console.log("🚀 Starting Pool Rebalancing...");

    try {
        // 1. Mint 10,000 XPOLL (to ensure enough for liquidity)
        console.log("🪙 Minting 10,000 XPOLL to Admin...");
        const mintAmt = "100000000000"; // 10k * 10^7
        const mintCmd = `stellar contract invoke --id ${TOKEN_ID} --source ${SOURCE} --rpc-url ${RPC} --network-passphrase "${PASS}" -- mint --to ${ADMIN_ADDR} --amount ${mintAmt}`;
        execSync(mintCmd, { stdio: 'inherit' });
        console.log("✅ Minting Complete");

        // 2. Add Liquidity (2000 XLM : 8000 XPOLL) -> 1:4 Ratio
        console.log("💧 Adding Liquidity (2000 XLM : 8000 XPOLL)...");
        const xpollAmt = "80000000000"; // 8k * 10^7
        const nativeAmt = "20000000000"; // 2k * 10^7
        const addCmd = `stellar contract invoke --id ${POOL_ID} --source ${SOURCE} --rpc-url ${RPC} --network-passphrase "${PASS}" -- add_liquidity --provider ${ADMIN_ADDR} --xpoll_amount ${xpollAmt} --native_amount ${nativeAmt}`;
        execSync(addCmd, { stdio: 'inherit' });
        console.log("✅ Liquidity Added! Rate is now stable at 1:4.");

        console.log("\n✨ ALL DONE! Check the Swap page now.");

    } catch (e) {
        console.error("❌ Rebalancing failed:", e.message);
    }
}

rebalance();
