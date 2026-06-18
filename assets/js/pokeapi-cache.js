(() => {
  const API_BASE_URL = 'https://pokeapi.co/api/v2';
  const CACHE_PREFIX = 'pokeverse_';
  const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
  const inFlightRequests = new Map();
  const memoryCache = new Map();

  const getNow = () => Date.now();
  const isValidEntry = (entry) => entry
    && typeof entry === 'object'
    && typeof entry.timestamp === 'number'
    && Object.prototype.hasOwnProperty.call(entry, 'data')
    && getNow() - entry.timestamp < CACHE_DURATION;

  const getCachedData = (key) => {
    const memoryEntry = memoryCache.get(key);
    if (isValidEntry(memoryEntry)) return memoryEntry.data;
    if (memoryEntry) memoryCache.delete(key);

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (!isValidEntry(entry)) {
        localStorage.removeItem(key);
        return null;
      }
      memoryCache.set(key, entry);
      return entry.data;
    } catch {
      localStorage.removeItem(key);
      memoryCache.delete(key);
      return null;
    }
  };

  const setCachedData = (key, data) => {
    const entry = { timestamp: getNow(), data };
    memoryCache.set(key, entry);
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      localStorage.removeItem(key);
    }
    return data;
  };

  const clearExpiredCache = () => {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CACHE_PREFIX)) continue;
      try {
        const entry = JSON.parse(localStorage.getItem(key));
        if (!isValidEntry(entry)) {
          localStorage.removeItem(key);
          memoryCache.delete(key);
        }
      } catch {
        localStorage.removeItem(key);
        memoryCache.delete(key);
      }
    }
  };

  const normalizeEndpoint = (endpoint) => endpoint
    .toString()
    .replace(API_BASE_URL, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  const fetchCachedEndpoint = async (cacheKey, endpoint) => {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    if (inFlightRequests.has(cacheKey)) return inFlightRequests.get(cacheKey);

    const request = fetch(`${API_BASE_URL}/${normalizeEndpoint(endpoint)}`)
      .then((response) => {
        if (!response.ok) throw new Error('PokeAPI');
        return response.json();
      })
      .then((data) => setCachedData(cacheKey, data))
      .finally(() => inFlightRequests.delete(cacheKey));

    inFlightRequests.set(cacheKey, request);
    return request;
  };

  const extractIdFromUrl = (url) => Number(url?.match(/\/(\d+)\/?$/)?.[1]);

  const getPokemonList = () => fetchCachedEndpoint(`${CACHE_PREFIX}pokemon_list`, 'pokemon?limit=100000&offset=0');
  const getPokemon = (id) => fetchCachedEndpoint(`${CACHE_PREFIX}pokemon_${id}`, `pokemon/${id}`);
  const getPokemonSpecies = (id) => fetchCachedEndpoint(`${CACHE_PREFIX}species_${id}`, `pokemon-species/${id}`);
  const getPokemonType = (type) => fetchCachedEndpoint(`${CACHE_PREFIX}type_${type}`, `type/${type}`);
  const getEvolutionChain = (id) => fetchCachedEndpoint(`${CACHE_PREFIX}evolution_${id}`, `evolution-chain/${id}`);
  const getGeneration = (generation) => fetchCachedEndpoint(`${CACHE_PREFIX}generation_${generation}`, `generation/${generation}`);

  const getPokemonWithSpecies = async (idOrName) => {
    const pokemon = await getPokemon(idOrName);
    const speciesId = extractIdFromUrl(pokemon.species?.url) || pokemon.id;
    const species = await getPokemonSpecies(speciesId);
    return { pokemon, species };
  };

  const getEvolutionChainFromSpecies = (species) => {
    const evolutionId = extractIdFromUrl(species.evolution_chain?.url);
    return evolutionId ? getEvolutionChain(evolutionId) : null;
  };

  const preloadCoreData = () => Promise.allSettled([
    getPokemonList(),
    Promise.all(Array.from({ length: 9 }, (_, index) => getGeneration(index + 1))),
    Promise.all(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'].map(getPokemonType)),
  ]);

  clearExpiredCache();
  window.PokeApiCache = {
    getCachedData,
    setCachedData,
    clearExpiredCache,
    preloadCoreData,
    getPokemonList,
    getPokemon,
    getPokemonSpecies,
    getPokemonType,
    getEvolutionChain,
    getGeneration,
    getPokemonWithSpecies,
    getEvolutionChainFromSpecies,
  };
  window.setTimeout(() => preloadCoreData(), 0);
})();
