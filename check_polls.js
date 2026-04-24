const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder, nativeToScVal } = require("@stellar/stellar-sdk");

const POLL_ID = "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function checkTotal() {
    const server = new rpc.Server(RPC_URL);
    const dummy = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const pollContract = new Contract(POLL_ID);

    let total = 0;
    console.log("Checking blockchain for created polls...");

    for (let i = 1; i <= 20; i++) {
        try {
            const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
                .addOperation(pollContract.call("get_poll_info", nativeToScVal(i, { type: "u32" })))
                .setTimeout(30).build();
            const sim = await server.simulateTransaction(tx);
            if (sim.result && sim.result.retval) {
                const data = scValToNative(sim.result.retval);
                console.log(`✅ Poll ID ${i} exists: "${data.question}"`);
                total = i;
            } else {
                break;
            }
        } catch (e) {
            break;
        }
    }
    console.log(`\nTOTAL POLLS CREATED ON-CHAIN: ${total}`);
}

checkTotal().catch(console.error);
