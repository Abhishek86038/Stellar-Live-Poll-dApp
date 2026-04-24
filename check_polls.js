const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder, nativeToScVal } = require("@stellar/stellar-sdk");

const POLL_ID = "CCIKQ7UIWMTBEOLT734B6FMQI5JSXK7HBJPAPSDPLMWP2UHJELV2ZTOX";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function checkPollData(id) {
    const server = new rpc.Server(RPC_URL);
    const dummy = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    const pollContract = new Contract(POLL_ID);

    try {
        const tx = new TransactionBuilder(dummy, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(pollContract.call("get_poll_info", nativeToScVal(id, { type: "u32" })))
            .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        if (sim.result && sim.result.retval) {
            const data = scValToNative(sim.result.retval);
            
            // Fix BigInt for printing
            const cleanData = JSON.parse(JSON.stringify(data, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            console.log("\n--- Full Blockchain Data for Poll ID " + id + " ---");
            console.log(cleanData);
        } else {
            console.log("Poll not found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

const id = process.argv[2] || 5;
checkPollData(Number(id)).catch(console.error);
