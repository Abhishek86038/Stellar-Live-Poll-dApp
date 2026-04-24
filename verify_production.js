const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder } = require("@stellar/stellar-sdk");

const TOKEN_ID = "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";
const POOL_ID = "CCJLAH3Y7ZYJEZH44PENQFV3XZ75452DZG2SPZNTRFAQC3MT5KGGERQV";
const POLL_ID = "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function verify() {
    const server = new rpc.Server(RPC_URL);
    const dummy = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");

    console.log("--- PROD VERIFICATION ---");
    
    // 1. Check Pool Reserves
    try {
        const poolContract = new Contract(POOL_ID);
        const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(poolContract.call("get_reserves"))
            .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        const [rx, rn] = scValToNative(sim.result.retval);
        console.log(`✅ POOL RESERVES: XPOLL=${rx}, XLM=${rn}`);
        if (Number(rx) === 0) {
            console.log("⚠️ WARNING: Pool is EMPTY of XPOLL. Swaps will return 0 tokens.");
        }
    } catch (e) {
        console.log("❌ POOL ERROR:", e.message);
    }

    // 2. Check Token Supply
    try {
        const tokenContract = new Contract(TOKEN_ID);
        const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(tokenContract.call("balance_of", new Contract(POOL_ID).address().toScVal()))
            .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        const bal = scValToNative(sim.result.retval);
        console.log(`✅ TOKEN IN POOL: ${bal}`);
    } catch (e) {
        console.log("❌ TOKEN ERROR:", e.message);
    }

    console.log("--------------------------");
}

verify().catch(console.error);
