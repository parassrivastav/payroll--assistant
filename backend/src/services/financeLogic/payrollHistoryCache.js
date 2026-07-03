const CACHE_TTL_MS = 30 * 1000;
const cache = new Map();

function getCachedHistory(key) {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedHistory(key, value) {
  cache.set(key, {
    createdAt: Date.now(),
    value
  });
}

function clearHistoryCache() {
  cache.clear();
}

module.exports = {
  getCachedHistory,
  setCachedHistory,
  clearHistoryCache
};
