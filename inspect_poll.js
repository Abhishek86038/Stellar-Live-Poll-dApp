const { rpc, Networks, Contract, scValToNative, Account, TransactionBuilder, nativeToScVal } = require("@stellar/stellar-sdk");

const POLL_ID = "CC6VHB7JGO6XWNWSDWPKNKNA6N63K5Z567RPGZQPBAHNZCWAVMNMSI7S";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function inspectPoll(id) {
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
            console.log(`POLL ID ${id} DETAILS:`);
            console.log(JSON.stringify(data, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2
            ));
            console.log(`\nNumber of options: ${data.options.length}`);
            console.log(`Number of vote slots: ${data.votes.length}`);
        } else {
            console.log("Poll not found or simulation failed.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

inspectPoll(1);
