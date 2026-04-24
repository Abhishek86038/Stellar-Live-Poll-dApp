import * as StellarSdk from '@stellar/stellar-sdk';

const RPC_URL = "https://soroban-testnet.stellar.org";
const server = new StellarSdk.rpc.Server(RPC_URL);

class EventStreamService {
  constructor() {
    this.listeners = [];
    this.isConnected = false;
    this.pollInterval = null;
    this.lastLedger = 0;
  }

  async connect(contractIds = []) {
    this.isConnected = true;
    this.notifyListeners({ type: 'CONNECTED', message: 'Real-time Ledger Connection Active' });
    
    // Fetch initial last ledger to start from
    try {
      const info = await server.getLatestLedger();
      this.lastLedger = info.sequence;
    } catch (e) {
      this.lastLedger = 0;
    }

    // Start polling the RPC for real events
    this.pollInterval = setInterval(async () => {
      try {
        const events = await server.getEvents({
          startLedger: this.lastLedger,
          filters: contractIds.length > 0 ? [{ contractIds }] : []
        });

        if (events.events && events.events.length > 0) {
          events.events.forEach(event => {
            this.notifyListeners({
              type: 'ON_CHAIN_EVENT',
              message: `Contract Event: ${event.type}`,
              timestamp: Date.now(),
              raw: event
            });
          });
          this.lastLedger = events.latestLedger + 1;
        }
      } catch (err) {
        console.error("RPC Event Error:", err);
      }
    }, 10000);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(callback => callback(data));
  }

  disconnect() {
    this.isConnected = false;
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.notifyListeners({ type: 'DISCONNECTED', message: 'Stream Disconnected' });
  }
}

export default new EventStreamService();
