const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder } = require("@stellar/stellar-sdk");

const POOL_ID = "CBUKW4W6FNO6J6E2672OZ6EXERWH3H7CBYUZXMMTNK7PFXK3WQRAVKNV";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function checkReserves() {
    const server = new rpc.Server(RPC_URL);
    const dummy = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const poolContract = new Contract(POOL_ID);

    try {
        const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(poolContract.call("get_reserves"))
            .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        if (sim.result && sim.result.retval) {
            const res = scValToNative(sim.result.retval);
            const xpoll = Number(res[0]) / 10000000;
            const native = Number(res[1]) / 10000000;
            
            console.log(`\nPOOL RESERVES:`);
            console.log(`XPOLL: ${xpoll.toFixed(2)}`);
            console.log(`NATIVE (XLM): ${native.toFixed(2)}`);
            
            // Calculate 1 XLM swap
            // dy = (y * dx) / (x + dx)
            const dx = 1;
            const dy = (xpoll * dx) / (native + dx);
            console.log(`\nIf you swap 1 XLM, you will get: ${dy.toFixed(4)} XPOLL`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkReserves().catch(console.error);
