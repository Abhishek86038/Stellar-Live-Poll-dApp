class CacheService {
  constructor() {
    this.storage = new Map();
  }

  set(key, value, ttl = 30000) {
    const expiresAt = Date.now() + ttl;
    const item = {
      data: value,
      expiresAt: expiresAt,
      lastUpdated: Date.now()
    };
    this.storage.set(key, item);
  }

  get(key) {
    const item = this.storage.get(key);
    if (!item) {
      return { data: null, isValid: false, lastUpdated: null };
    }
    const isValid = Date.now() < item.expiresAt;
    if (!isValid) {
      this.storage.delete(key);
      return { data: null, isValid: false, lastUpdated: item.lastUpdated };
    }
    return { data: item.data, isValid: true, lastUpdated: item.lastUpdated };
  }

  clear(key) {
    this.storage.delete(key);
  }

  clearAll() {
    this.storage.clear();
  }

  has(key) {
    const item = this.storage.get(key);
    return item ? Date.now() < item.expiresAt : false;
  }

  getLastUpdatedTime(key) {
    const item = this.storage.get(key);
    return item ? item.lastUpdated : null;
  }
}

const cacheInstance = new CacheService();
export default cacheInstance;
