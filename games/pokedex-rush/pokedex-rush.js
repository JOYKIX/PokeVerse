const RUSH_API = 'https://pokeapi.co/api/v2';
const RUSH_CACHE_KEY = 'pokedex-rush:pokedex:v2';
const RUSH_STATS_KEY = 'pokedex-rush:stats:v1';
const RUSH_BATCH_SIZE = 32;
const RUSH_BASE_EXP = 5;
const RUSH_MEDAL_PREFIX = 'pokedex-rush:';
const RUSH_MASTER_MEDAL_PREFIX = `${RUSH_MEDAL_PREFIX}master:`;
const RUSH_ALL_MEDAL = `${RUSH_MEDAL_PREFIX}all-generations`;

const pokedexOptions = [
  { key: 'kanto', label: 'Kanto', range: [1, 151], medal: 'Maitre de Kanto' },
  { key: 'johto', label: 'Johto', range: [152, 251], medal: 'Maitre de Johto' },
  { key: 'hoenn', label: 'Hoenn', range: [252, 386], medal: 'Maitre de Hoenn' },
  { key: 'sinnoh', label: 'Sinnoh', range: [387, 493], medal: 'Maitre de Sinnoh' },
  { key: 'unys', label: 'Unys', range: [494, 649], medal: 'Maitre de Unys' },
  { key: 'kalos', label: 'Kalos', range: [650, 721], medal: 'Maitre de Kalos' },
  { key: 'alola', label: 'Alola', range: [722, 809], medal: 'Maitre de Alola' },
  { key: 'galar', label: 'Galar', range: [810, 905], medal: 'Maitre de Galar' },
  { key: 'paldea', label: 'Paldea', range: [906, 1025], medal: 'Maitre de Paldea' },
];

const pokedexRushMedals = {
  completion: Object.fromEntries(pokedexOptions.map(({ key, medal }) => [key, medal])),
  allGenerations: 'Le meilleur dresseur',
};

let state = {
  selectedDex: null,
  pokemon: [],
  found: new Set(),
  startedAt: 0,
  timer: null,
  expEarned: 0,
};

const normalizeName = (value) => value
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '-');

const formatPokemonName = (name) => name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const formatDexNumber = (id) => `#${id.toString().padStart(3, '0')}`;

const getFrenchResourceName = (resource, fallback) => (
  resource.names?.find((entry) => entry.language.name === 'fr')?.name ?? fallback
);

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('PokeAPI');
  return response.json();
};

const runInBatches = async (items, worker, batchSize = RUSH_BATCH_SIZE) => {
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

const readCache = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(RUSH_CACHE_KEY));
    return cache && typeof cache === 'object' ? cache : {};
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  try {
    localStorage.setItem(RUSH_CACHE_KEY, JSON.stringify(cache));
  } catch {
    localStorage.removeItem(RUSH_CACHE_KEY);
  }
};

const getPokemonFromSpecies = async (id) => {
  const species = await fetchJson(`${RUSH_API}/pokemon-species/${id}`);
  const frenchName = getFrenchResourceName(species, formatPokemonName(species.name));
  return {
    id: species.id,
    number: formatDexNumber(species.id),
    key: species.name,
    name: frenchName,
    aliases: [species.name, frenchName].map(normalizeName),
  };
};

const getPokedexPokemon = async (option) => {
  const cache = readCache();
  if (Array.isArray(cache[option.key]) && cache[option.key].length) return cache[option.key];

  const [start, end] = option.range;
  const ids = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const sorted = (await runInBatches(ids, getPokemonFromSpecies)).sort((first, second) => first.id - second.id);
  cache[option.key] = sorted;
  writeCache(cache);
  return sorted;
};

const getDefaultStats = () => ({
  gamesPlayed: 0,
  gamesFinished: 0,
  totalPokemonFound: 0,
  expEarned: 0,
  pokedexes: Object.fromEntries(pokedexOptions.map(({ key }) => [key, {
    bestTime: null,
    completions: 0,
    bestRunFound: [],
    expEarned: 0,
  }])),
  medals: pokedexRushMedals,
});

const getStats = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(RUSH_STATS_KEY));
    return { ...getDefaultStats(), ...saved, pokedexes: { ...getDefaultStats().pokedexes, ...saved?.pokedexes } };
  } catch {
    return getDefaultStats();
  }
};

const saveStats = (stats) => localStorage.setItem(RUSH_STATS_KEY, JSON.stringify(stats));

const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const awardRushExp = () => {
  const exp = Math.round(RUSH_BASE_EXP * calculateMedalBonus());
  addExperience(exp, 'pokedexRush');
  state.expEarned += exp;
  return exp;
};

const awardCompletionMedals = () => {
  const profile = getPlayerProfile();
  const medalKey = `${RUSH_MASTER_MEDAL_PREFIX}${state.selectedDex.key}`;
  if (!profile.medals.includes(medalKey)) profile.medals.push(medalKey);

  const hasAllGenerations = pokedexOptions.every((option) => (
    profile.medals.includes(`${RUSH_MASTER_MEDAL_PREFIX}${option.key}`)
  ));
  if (hasAllGenerations && !profile.medals.includes(RUSH_ALL_MEDAL)) profile.medals.push(RUSH_ALL_MEDAL);

  savePlayerProfile(profile);
  updateHeaderProfile();
};

const renderOptions = () => {
  const root = document.querySelector('[data-rush-options]');
  root.innerHTML = '<legend>Pokédex</legend>';
  pokedexOptions.forEach((option, index) => {
    const label = document.createElement('label');
    label.className = 'pokedex-rush-option';
    label.innerHTML = `<input type="radio" name="pokedex" value="${option.key}"${index === 0 ? ' checked' : ''}> <span>${option.label}</span>`;
    root.appendChild(label);
  });
};

const updateGame = () => {
  const completed = state.found.size;
  const total = state.pokemon.length;
  const percent = total ? (completed / total) * 100 : 0;
  document.querySelector('[data-rush-progress]').textContent = `${completed} / ${total} complétés`;
  document.querySelector('[data-rush-bar]').style.width = `${percent}%`;
  document.querySelector('[data-rush-remaining]').textContent = total - completed;
  document.querySelector('[data-rush-found]').innerHTML = state.pokemon
    .map((pokemon) => `
      <tr class="${state.found.has(pokemon.key) ? 'is-found' : ''}">
        <td>${pokemon.number}</td>
        <td>${state.found.has(pokemon.key) ? pokemon.name : ''}</td>
      </tr>
    `)
    .join('');
};

const stopTimer = () => {
  window.clearInterval(state.timer);
  state.timer = null;
};

const startTimer = () => {
  stopTimer();
  state.startedAt = Date.now();
  state.timer = window.setInterval(() => {
    document.querySelector('[data-rush-time]').textContent = formatTime(Date.now() - state.startedAt);
  }, 500);
};

const finishGame = () => {
  stopTimer();
  const elapsed = Date.now() - state.startedAt;
  const stats = getStats();
  const dexStats = stats.pokedexes[state.selectedDex.key];
  stats.gamesFinished += 1;
  dexStats.completions += 1;
  dexStats.expEarned += state.expEarned;
  dexStats.bestRunFound = state.pokemon.map((pokemon) => pokemon.key);
  if (dexStats.bestTime === null || elapsed < dexStats.bestTime) dexStats.bestTime = elapsed;
  saveStats(stats);
  awardCompletionMedals();

  document.querySelector('[data-rush-game]').hidden = true;
  document.querySelector('[data-rush-results-section]').hidden = true;
  document.querySelector('[data-rush-win]').hidden = false;
  document.querySelector('[data-rush-win-dex]').textContent = state.selectedDex.label;
  document.querySelector('[data-rush-win-time]').textContent = formatTime(elapsed);
  document.querySelector('[data-rush-win-found]').textContent = state.found.size;
  document.querySelector('[data-rush-win-exp]').textContent = state.expEarned;
};

const matchesPokemonInput = (pokemon, value) => (
  pokemon.aliases.includes(value)
  || (value === 'nidoran' && ['nidoran-f', 'nidoran-m'].includes(pokemon.key))
);

const submitPokemon = (event) => {
  event.preventDefault();
  const input = document.querySelector('[data-rush-input]');
  const error = document.querySelector('[data-rush-error]');
  const value = normalizeName(input.value);
  const matchesInDex = state.pokemon.filter((pokemon) => matchesPokemonInput(pokemon, value));
  const newMatches = matchesInDex.filter((pokemon) => !state.found.has(pokemon.key));
  error.textContent = '';

  if (matchesInDex.length && !newMatches.length) {
    error.textContent = 'Déjà trouvé.';
    return;
  }

  if (!matchesInDex.length) {
    const cache = readCache();
    const exists = Object.values(cache).flat().some((pokemon) => matchesPokemonInput(pokemon, value));
    if (exists) {
      error.textContent = 'Hors Pokédex.';
    } else {
      fetchJson(`${RUSH_API}/pokemon-species/${value}`)
        .then(() => { error.textContent = 'Hors Pokédex.'; })
        .catch(() => { error.textContent = 'Introuvable.'; });
      error.textContent = 'Introuvable.';
    }
    return;
  }

  const stats = getStats();
  newMatches.forEach((pokemon) => {
    state.found.add(pokemon.key);
    const gained = awardRushExp();
    stats.totalPokemonFound += 1;
    stats.expEarned += gained;
  });
  saveStats(stats);
  input.value = '';
  updateGame();
  if (state.found.size === state.pokemon.length) finishGame();
};

const startGame = async () => {
  const startButton = document.querySelector('[data-rush-start]');
  const error = document.querySelector('[data-rush-start-error]');
  const selectedKey = document.querySelector('input[name="pokedex"]:checked')?.value;
  state.selectedDex = pokedexOptions.find((option) => option.key === selectedKey);
  error.textContent = '';
  startButton.disabled = true;
  startButton.textContent = 'Chargement';

  try {
    state.pokemon = await getPokedexPokemon(state.selectedDex);
    state.found = new Set();
    state.expEarned = 0;
    const stats = getStats();
    stats.gamesPlayed += 1;
    saveStats(stats);

    document.querySelector('[data-rush-title]').textContent = `Pokédex ${state.selectedDex.label}`;
    document.querySelector('[data-rush-start-panel]').hidden = true;
    document.querySelector('[data-rush-game]').hidden = false;
    document.querySelector('[data-rush-results-section]').hidden = false;
    document.querySelector('[data-rush-input]').focus();
    document.querySelector('[data-rush-time]').textContent = '00:00';
    updateGame();
    startTimer();
  } catch {
    error.textContent = 'Chargement impossible.';
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Commencer';
  }
};

const resetGame = () => {
  stopTimer();
  state = { selectedDex: null, pokemon: [], found: new Set(), startedAt: 0, timer: null, expEarned: 0 };
  document.querySelector('[data-rush-start-panel]').hidden = false;
  document.querySelector('[data-rush-game]').hidden = true;
  document.querySelector('[data-rush-results-section]').hidden = true;
  document.querySelector('[data-rush-win]').hidden = true;
};

const isExternalLink = (link) => new URL(link.href, window.location.href).origin !== window.location.origin;

const setupNavigation = () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.primary-nav');
  toggle?.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    nav?.classList.toggle('is-open', !isOpen);
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || isExternalLink(link) || link.target === '_blank' || link.hasAttribute('download')) return;
    const destination = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);
    if (destination.pathname === current.pathname && destination.hash) return;
    event.preventDefault();
    document.body.classList.add('is-leaving');
    window.setTimeout(() => { window.location.href = destination.href; }, 180);
  });
};

window.addEventListener('DOMContentLoaded', () => {
  renderOptions();
  document.querySelector('[data-rush-start]').addEventListener('click', startGame);
  document.querySelector('[data-rush-form]').addEventListener('submit', submitPokemon);
  document.querySelector('[data-rush-restart]').addEventListener('click', resetGame);
  setupNavigation();
  updateHeaderProfile();
  document.body.classList.add('is-loaded');
});
