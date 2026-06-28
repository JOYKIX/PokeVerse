const { fetchJson, runInBatches, pokemonIds } = window.PokeVersePokeApi;
const POKECHAIN_CACHE_KEY = 'pokechain:pokemon:v1';
const MIN_NEXT_MATCHES = 6;
const EVOLUTION_METHOD_LABELS = {
  base: 'sans évolution préalable',
  'level-up': 'niveau',
  trade: 'échange',
  'use-item': 'objet',
  shed: 'mue',
  spin: 'rotation',
  tower: 'tour',
  'three-critical-hits': 'coups critiques',
  'take-damage': 'dégâts',
  other: 'méthode spéciale',
  agile: 'style rapide',
  strong: 'style puissant',
  recoil: 'recul',
};

const normalizeValue = (value) => value
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

const getFrenchResourceName = (resource, fallback) => (
  resource.names?.find((entry) => entry.language.name === 'fr')?.name ?? fallback
);

const readCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(POKECHAIN_CACHE_KEY));
    return Array.isArray(cached?.pokemon) && cached.pokemon.length ? cached.pokemon : null;
  } catch {
    return null;
  }
};

const writeCache = (pokemon) => {
  try {
    localStorage.setItem(POKECHAIN_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), pokemon }));
  } catch {
    localStorage.removeItem(POKECHAIN_CACHE_KEY);
  }
};

const getEvolutionMethod = async (species) => {
  if (!species.evolution_chain?.url || !species.evolves_from_species) return 'base';
  const chain = await fetchJson(species.evolution_chain.url);
  const stack = [chain.chain];
  while (stack.length) {
    const node = stack.shift();
    if (node.species.name === species.name) return node.evolution_details?.[0]?.trigger?.name ?? 'base';
    stack.push(...node.evolves_to);
  }
  return 'base';
};

const fetchPokeChainPokemon = async () => {
  const cached = readCache();
  if (cached) return cached;

  const labelCache = new Map();
  const label = async (resource, key) => {
    const cacheKey = `${resource}:${key}`;
    if (!labelCache.has(cacheKey)) labelCache.set(cacheKey, getFrenchResourceName(await fetchJson(`/${resource}/${key}`), key));
    return labelCache.get(cacheKey);
  };

  const pokemon = await runInBatches(pokemonIds(), async (id) => {
    const detail = await fetchJson(`/pokemon/${id}`);
    if (!detail.is_default) return null;

    const species = await fetchJson(detail.species.url);
    const name = getFrenchResourceName(species, formatPokemonName(detail.name));
    const types = await Promise.all(detail.types
      .sort((first, second) => first.slot - second.slot)
      .map((entry) => label('type', entry.type.name)));
    const generation = await label('generation', species.generation.name);
    const color = await label('pokemon-color', species.color.name);
    const evolutionMethod = await getEvolutionMethod(species);

    return {
      id: species.id,
      key: detail.name,
      name,
      aliases: [detail.name, name].map(normalizeValue),
      types,
      generation,
      color,
      height: detail.height,
      weight: detail.weight,
      evolutionMethod,
      isLegendary: species.is_legendary,
    };
  });

  const sorted = pokemon.sort((first, second) => first.id - second.id);
  writeCache(sorted);
  return sorted;
};

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const state = {
  pokemon: [],
  constraints: [],
  usedKeys: new Set(),
  run: 0,
};

const constraintBuilders = [
  (pokemon) => pokemon.types.map((type) => ({ key: `type:${type}`, text: `Donne un Pokémon de type ${type}`, match: (entry) => entry.types.includes(type) })),
  (pokemon) => [{ key: `generation:${pokemon.generation}`, text: `Donne un Pokémon de ${pokemon.generation}`, match: (entry) => entry.generation === pokemon.generation }],
  (pokemon) => [{ key: `color:${pokemon.color}`, text: `Donne un Pokémon ${pokemon.color}`, match: (entry) => entry.color === pokemon.color }],
  (pokemon) => [{ key: `legendary:${pokemon.isLegendary}`, text: pokemon.isLegendary ? 'Donne un Pokémon légendaire' : 'Donne un Pokémon non légendaire', match: (entry) => entry.isLegendary === pokemon.isLegendary }],
  (pokemon) => [{ key: `height:${Math.floor(pokemon.height / 10)}`, text: `Donne un Pokémon de ${Math.floor(pokemon.height / 10) + 1} m ou moins`, match: (entry) => entry.height <= (Math.floor(pokemon.height / 10) + 1) * 10 }],
  (pokemon) => [{ key: `weight:${Math.floor(pokemon.weight / 250)}`, text: `Donne un Pokémon de ${Math.floor(pokemon.weight / 250) * 25 + 25} kg ou moins`, match: (entry) => entry.weight <= (Math.floor(pokemon.weight / 250) + 1) * 250 }],
  (pokemon) => [{ key: `evolution:${pokemon.evolutionMethod}`, text: pokemon.evolutionMethod === 'base' ? 'Donne un Pokémon sans évolution préalable' : `Donne un Pokémon évolué par ${EVOLUTION_METHOD_LABELS[pokemon.evolutionMethod] ?? EVOLUTION_METHOD_LABELS.other}`, match: (entry) => entry.evolutionMethod === pokemon.evolutionMethod }],
];

const currentCandidates = (extraConstraint = null) => state.pokemon.filter((pokemon) => (
  !state.usedKeys.has(pokemon.key)
  && state.constraints.every((constraint) => constraint.match(pokemon))
  && (!extraConstraint || extraConstraint.match(pokemon))
));

const buildNextConstraint = () => {
  const baseCandidates = currentCandidates();
  const options = baseCandidates.flatMap((pokemon) => constraintBuilders.flatMap((build) => build(pokemon)))
    .filter((constraint, index, constraints) => constraints.findIndex((entry) => entry.key === constraint.key) === index)
    .filter((constraint) => !state.constraints.some((entry) => entry.key === constraint.key))
    .map((constraint) => ({ constraint, count: currentCandidates(constraint).length }))
    .filter((entry) => entry.count >= Math.min(MIN_NEXT_MATCHES, Math.max(1, baseCandidates.length - 1)) && entry.count < baseCandidates.length);

  return pickRandom(options)?.constraint ?? null;
};

const renderConstraints = () => {
  const list = document.querySelector('[data-pokechain-constraints]');
  list.innerHTML = '';
  state.constraints.forEach((constraint) => {
    const item = document.createElement('p');
    item.textContent = constraint.text;
    list.appendChild(item);
  });
};

const renderSuggestions = () => {
  const list = document.querySelector('[data-pokechain-list]');
  list.innerHTML = '';
  currentCandidates().forEach((pokemon) => {
    const option = document.createElement('option');
    option.value = pokemon.name;
    list.appendChild(option);
  });
};

const endGame = () => {
  document.querySelector('[data-pokechain-game]').hidden = true;
  document.querySelector('[data-pokechain-result]').hidden = false;
  document.querySelector('[data-pokechain-answer]').textContent = state.run;
};

const nextRound = () => {
  const nextConstraint = buildNextConstraint();
  if (!nextConstraint) {
    endGame();
    return;
  }
  state.constraints.push(nextConstraint);
  document.querySelector('[data-pokechain-run]').textContent = state.run;
  document.querySelector('[data-pokechain-status]').textContent = '';
  document.querySelector('[data-pokechain-input]').value = '';
  renderConstraints();
  renderSuggestions();
  document.querySelector('[data-pokechain-input]').focus();
};

const submitAnswer = (event) => {
  event.preventDefault();
  const value = normalizeValue(document.querySelector('[data-pokechain-input]').value);
  const match = currentCandidates().find((pokemon) => pokemon.aliases.includes(value));

  if (!match) {
    endGame();
    return;
  }

  state.usedKeys.add(match.key);
  state.run += 1;
  nextRound();
};

const startGame = async () => {
  const startButton = document.querySelector('[data-pokechain-start]');
  const error = document.querySelector('[data-pokechain-error]');
  error.textContent = '';
  startButton.disabled = true;
  startButton.textContent = 'Chargement';

  try {
    state.pokemon = await fetchPokeChainPokemon();
    state.constraints = [];
    state.usedKeys = new Set();
    state.run = 0;
    document.querySelector('[data-pokechain-start-panel]').hidden = true;
    document.querySelector('[data-pokechain-result]').hidden = true;
    document.querySelector('[data-pokechain-game]').hidden = false;
    nextRound();
  } catch {
    error.textContent = 'Chargement impossible.';
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Commencer';
  }
};

const resetGame = () => {
  document.querySelector('[data-pokechain-start-panel]').hidden = false;
  document.querySelector('[data-pokechain-game]').hidden = true;
  document.querySelector('[data-pokechain-result]').hidden = true;
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

const setupPokeChain = () => {
  document.querySelector('[data-pokechain-start]')?.addEventListener('click', startGame);
  document.querySelector('[data-pokechain-form]')?.addEventListener('submit', submitAnswer);
  document.querySelector('[data-pokechain-new]')?.addEventListener('click', resetGame);
};

window.PokeVerseGames = window.PokeVerseGames || {};
window.PokeVerseGames.setupPokeChain = setupPokeChain;

if (!window.PokeVerseSpa) {
  window.addEventListener('DOMContentLoaded', () => {
    setupPokeChain();
    setupNavigation();
    updateHeaderProfile();
    document.body.classList.add('is-loaded');
  });
}
