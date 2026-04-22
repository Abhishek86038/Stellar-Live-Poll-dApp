import { useState, useEffect, useCallback } from 'react';

/**
 * useCache Hook
 * @param {string} cacheKey - Unique key for the cache
 * @param {function} fetchFunction - Async function to fetch data (should call service with caching)
 * @param {number} ttl - Refresh interval in milliseconds (NOT seconds)
 */
export const useCache = (cacheKey, fetchFunction, ttl = 5000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const result = await fetchFunction();
      // If the result is a wrapper from withCache { data, cached, lastUpdated }
      if (result && result.hasOwnProperty('data') && result.hasOwnProperty('cached')) {
        setData(result.data);
        return result.data;
      } else {
        setData(result);
        return result;
      }
    } catch (err) {
      console.error(`Error fetching cache for ${cacheKey}:`, err);
      setError(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [fetchFunction, cacheKey]);

  useEffect(() => {
    fetch();
    const interval = setInterval(() => fetch(true), ttl * 1000);
    return () => clearInterval(interval);
  }, [fetch, ttl]);

  return { data, loading, error, refresh: fetch };
};
