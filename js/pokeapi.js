(() => {
  const API_BASE = 'https://pokeapi.co/api/v2';
  const CACHE_PREFIX = 'pokeverse:pokeapi:';
  const CACHE_VERSION = 'v1';
  const DEFAULT_BATCH_SIZE = 64;
  const MAX_POKEMON_ID = 1025;
  const memory = new Map();

  const cacheKey = (url) => `${CACHE_PREFIX}${CACHE_VERSION}:${url}`;

  const readCache = (url) => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey(url)));
      return cached?.data ?? null;
    } catch {
      return null;
    }
  };

  const writeCache = (url, data) => {
    try {
      localStorage.setItem(cacheKey(url), JSON.stringify({ cachedAt: Date.now(), data }));
    } catch {
      try {
        localStorage.removeItem(cacheKey(url));
      } catch {
        // localStorage can be unavailable.
      }
    }
  };

  const toUrl = (resource) => resource.startsWith('http') ? resource : `${API_BASE}${resource}`;

  const fetchJson = async (resource) => {
    const url = toUrl(resource);
    const cached = readCache(url);
    if (cached) return cached;

    if (!memory.has(url)) {
      memory.set(url, fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('PokeAPI');
          return response.json();
        })
        .then((data) => {
          writeCache(url, data);
          return data;
        })
        .catch((error) => {
          memory.delete(url);
          throw error;
        }));
    }

    return memory.get(url);
  };

  const runInBatches = async (items, worker, batchSize = DEFAULT_BATCH_SIZE) => {
    const results = [];
    for (let index = 0; index < items.length; index += batchSize) {
      const batch = items.slice(index, index + batchSize);
      const settled = await Promise.allSettled(batch.map(worker));
      settled.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) results.push(result.value);
      });
    }
    return results;
  };

  const pokemonIds = (max = MAX_POKEMON_ID) => Array.from({ length: max }, (_, index) => index + 1);

  window.PokeVersePokeApi = {
    API_BASE,
    DEFAULT_BATCH_SIZE,
    MAX_POKEMON_ID,
    fetchJson,
    runInBatches,
    pokemonIds,
  };
})();
