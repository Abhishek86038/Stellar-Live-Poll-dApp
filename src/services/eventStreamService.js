class EventStreamService {
  constructor(contractIds = []) {
    this.contractIds = contractIds;
    this.listeners = [];
    this.isConnected = false;
    this.mockInterval = null;
  }

  connect() {
    this.isConnected = true;
    this.notifyListeners({ type: 'CONNECTED', message: 'Real-time Event Stream Active' });
    
    // Simulate real-time events for demonstration until real RPC event streaming is configured
    this.mockInterval = setInterval(() => {
      const mockEvents = [
        { type: 'PollCreated', message: 'New poll created: "Future of Stellar?"', timestamp: Date.now() },
        { type: 'VoteCast', message: 'User ...JN6 cast 100 XPOLL vote', timestamp: Date.now() },
        { type: 'SwapExecuted', message: 'Swap: 50 XLM -> 200 XPOLL', timestamp: Date.now() },
      ];
      const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      this.notifyListeners(randomEvent);
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
    if (this.mockInterval) clearInterval(this.mockInterval);
    this.notifyListeners({ type: 'DISCONNECTED', message: 'Stream Disconnected' });
  }
}

export default new EventStreamService();
