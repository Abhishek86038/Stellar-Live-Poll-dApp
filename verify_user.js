const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder, Address } = require("@stellar/stellar-sdk");

const TOKEN_ID = "CAOAPSP35AQ6KRWVKBDVJLNYO3TOSUF7AI2Q6YIQY2DMI2B7YD4TS4LL";
const USER_ADDR = "GD5WUAXGPDZ7YALI6JZAVJDTSPL4O4OJMYACR7YJSZQYVSDPMY5Z7NQS";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function verify() {
    const server = new rpc.Server(RPC_URL);
    const dummy = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");

    try {
        const tokenContract = new Contract(TOKEN_ID);
        const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(tokenContract.call("balance_of", new Address(USER_ADDR).toScVal()))
            .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        const bal = scValToNative(sim.result.retval);
        console.log(`REAL ON-CHAIN BALANCE FOR ${USER_ADDR}: ${bal}`);
    } catch (e) {
        console.log("❌ ERROR:", e.message);
    }
}

verify().catch(console.error);
