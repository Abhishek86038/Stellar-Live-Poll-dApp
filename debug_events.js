const { rpc, Networks, Contract, scValToNative, xdr } = require("@stellar/stellar-sdk");

const POLL_ID = "CC6VHB7JGO6XWNWSDWPKNKNA6N63K5Z567RPGZQPBAHNZCWAVMNMSI7S";
const RPC_URL = "https://soroban-testnet.stellar.org";

async function debugEvents() {
    const server = new rpc.Server(RPC_URL);
    try {
        console.log(`Scanning events for contract: ${POLL_ID}...`);
        const events = await server.getEvents({
            startLedger: 2210000,
            filters: [
                {
                    type: "contract",
                    contractIds: [POLL_ID]
                }
            ],
            limit: 50
        });

        console.log(`\nFound ${events.events?.length || 0} events.`);
        
        events.events.forEach((e, i) => {
            console.log(`\n--- Event ${i+1} ---`);
            // Try to parse topics more robustly
            const parsedTopics = e.topic.map(t => {
                try {
                    return scValToNative(xdr.ScVal.fromXDR(t, "base64"));
                } catch (err) {
                    return "PARSE_ERROR";
                }
            });
            console.log(`Parsed Topics:`, JSON.stringify(parsedTopics));
            console.log(`Raw Topic[0] (base64):`, e.topic[0]);
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

debugEvents().catch(console.error);
