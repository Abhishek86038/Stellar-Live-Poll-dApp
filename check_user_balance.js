const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder } = require("@stellar/stellar-sdk");

const TOKEN_ID = "CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ";
const WALLET = "GD5WUAXGPDZ7YALI6JZAVJDTSPL4O4OJMYACR7YJSZQYVSDPMY5Z7NQS";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function checkBalance() {
    const server = new rpc.Server(RPC_URL);
    const dummy = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tokenContract = new Contract(TOKEN_ID);

    try {
        const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(tokenContract.call("balance_of", new (require("@stellar/stellar-sdk").Address)(WALLET).toScVal()))
            .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        if (sim.result && sim.result.retval) {
            const raw = scValToNative(sim.result.retval);
            const balance = Number(raw) / 10000000;
            console.log(`\nWALLET: ${WALLET}`);
            console.log(`XPOLL BALANCE: ${balance.toFixed(2)} XPOLL`);
        } else {
            console.log("Balance not found or simulation failed.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkBalance().catch(console.error);
