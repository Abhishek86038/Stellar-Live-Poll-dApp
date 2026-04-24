const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder, nativeToScVal, Address } = require("@stellar/stellar-sdk");

const TOKEN_ID = "CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function checkBalance(wallet) {
    const server = new rpc.Server(RPC_URL);
    const dummy = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const tokenContract = new Contract(TOKEN_ID);

    try {
        const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(tokenContract.call("balance", new Address(wallet).toScVal()))
            .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        if (sim.result && sim.result.retval) {
            const bal = scValToNative(sim.result.retval);
            console.log(`\nWallet: ${wallet}`);
            console.log(`Balance: ${Number(bal) / 10000000} XPOLL`);
        } else {
            console.log("Balance fetch failed.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

const wallet = process.argv[2] || "GCO527YCC6DNDK3K6FN654WXAINDGNB35FUFAN3LURDENIIBD7ZFAJN6";
checkBalance(wallet).catch(console.error);
