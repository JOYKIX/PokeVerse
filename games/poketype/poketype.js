const { fetchJson, runInBatches, pokemonIds } = window.PokeVersePokeApi;
const POKETYPE_CACHE_KEY = 'poketype:pokemon:v1';
const POKETYPE_MODE_POKEMON_TO_TYPE = 'pokemon-to-type';
const POKETYPE_MODE_TYPE_TO_POKEMON = 'type-to-pokemon';

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
    const cached = JSON.parse(localStorage.getItem(POKETYPE_CACHE_KEY));
    return Array.isArray(cached?.pokemon) && cached.pokemon.length ? cached.pokemon : null;
  } catch {
    return null;
  }
};

const writeCache = (pokemon) => {
  try {
    localStorage.setItem(POKETYPE_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), pokemon }));
  } catch {
    localStorage.removeItem(POKETYPE_CACHE_KEY);
  }
};

const fetchTypeLabel = async (typeName) => {
  const type = await fetchJson(`/type/${typeName}`);
  return getFrenchResourceName(type, typeName);
};

const fetchPokeTypePokemon = async () => {
  const cached = readCache();
  if (cached) return cached;

  const typeLabels = new Map();
  const pokemon = await runInBatches(pokemonIds(), async (id) => {
    const detail = await fetchJson(`/pokemon/${id}`);
    if (!detail.is_default) return null;

    const species = await fetchJson(detail.species.url);
    const name = getFrenchResourceName(species, formatPokemonName(detail.name));
    const typeNames = detail.types
      .sort((first, second) => first.slot - second.slot)
      .map((entry) => entry.type.name);

    for (const typeName of typeNames) {
      if (!typeLabels.has(typeName)) typeLabels.set(typeName, await fetchTypeLabel(typeName));
    }

    const types = typeNames.map((typeName) => ({ key: typeName, label: typeLabels.get(typeName) }));

    return {
      id: species.id,
      key: detail.name,
      name,
      aliases: [detail.name, name].map(normalizeValue),
      types,
      typeAliases: [
        types.map((type) => type.key).join('-'),
        types.map((type) => type.label).join('-'),
      ].map(normalizeValue),
      typeLabel: types.map((type) => type.label).join(' / '),
    };
  });

  const sorted = pokemon.sort((first, second) => first.id - second.id);
  writeCache(sorted);
  return sorted;
};

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const state = {
  pokemon: [],
  mode: POKETYPE_MODE_POKEMON_TO_TYPE,
  secret: null,
  run: 0,
};

const renderSuggestions = () => {
  const input = document.querySelector('[data-poketype-input]');
  const list = document.querySelector('[data-poketype-list]');
  if (state.mode === POKETYPE_MODE_POKEMON_TO_TYPE) {
    input.removeAttribute('list');
  } else {
    input.setAttribute('list', 'poketype-list');
  }
  list.innerHTML = '';
  if (state.mode !== POKETYPE_MODE_TYPE_TO_POKEMON) return;
  state.pokemon.forEach((pokemon) => {
    const option = document.createElement('option');
    option.value = pokemon.name;
    list.appendChild(option);
  });
};

const nextQuestion = () => {
  state.secret = pickRandom(state.pokemon);
  document.querySelector('[data-poketype-run]').textContent = state.run;
  document.querySelector('[data-poketype-status]').textContent = '';
  document.querySelector('[data-poketype-input]').value = '';

  if (state.mode === POKETYPE_MODE_POKEMON_TO_TYPE) {
    document.querySelector('[data-poketype-prompt]').textContent = state.secret.name;
    document.querySelector('[data-poketype-input]').placeholder = 'Type';
  } else {
    const matches = state.pokemon.filter((pokemon) => pokemon.typeLabel === state.secret.typeLabel);
    state.secret = pickRandom(matches);
    document.querySelector('[data-poketype-prompt]').textContent = state.secret.typeLabel;
    document.querySelector('[data-poketype-input]').placeholder = 'Pokémon';
  }
  document.querySelector('[data-poketype-input]').focus();
};

const endGame = () => {
  document.querySelector('[data-poketype-game]').hidden = true;
  document.querySelector('[data-poketype-result]').hidden = false;
  document.querySelector('[data-poketype-result-title]').textContent = 'Résultat';
  document.querySelector('[data-poketype-answer]').textContent = state.mode === POKETYPE_MODE_POKEMON_TO_TYPE
    ? state.secret.typeLabel
    : state.secret.name;
};

const submitAnswer = (event) => {
  event.preventDefault();
  const value = normalizeValue(document.querySelector('[data-poketype-input]').value);
  const isCorrect = state.mode === POKETYPE_MODE_POKEMON_TO_TYPE
    ? state.secret.typeAliases.includes(value)
    : state.secret.aliases.includes(value);

  if (!isCorrect) {
    endGame();
    return;
  }

  state.run += 1;
  nextQuestion();
};

const startGame = async () => {
  const startButton = document.querySelector('[data-poketype-start]');
  const error = document.querySelector('[data-poketype-error]');
  error.textContent = '';
  startButton.disabled = true;
  startButton.textContent = 'Chargement';

  try {
    state.pokemon = await fetchPokeTypePokemon();
    state.mode = document.querySelector('input[name="poketype-mode"]:checked')?.value ?? POKETYPE_MODE_POKEMON_TO_TYPE;
    state.run = 0;
    renderSuggestions();
    document.querySelector('[data-poketype-start-panel]').hidden = true;
    document.querySelector('[data-poketype-result]').hidden = true;
    document.querySelector('[data-poketype-game]').hidden = false;
    nextQuestion();
  } catch {
    error.textContent = 'Chargement impossible.';
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Commencer';
  }
};

const resetGame = () => {
  document.querySelector('[data-poketype-start-panel]').hidden = false;
  document.querySelector('[data-poketype-game]').hidden = true;
  document.querySelector('[data-poketype-result]').hidden = true;
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

const setupPokeType = () => {
  document.querySelector('[data-poketype-start]')?.addEventListener('click', startGame);
  document.querySelector('[data-poketype-form]')?.addEventListener('submit', submitAnswer);
  document.querySelector('[data-poketype-new]')?.addEventListener('click', resetGame);
};

window.PokeVerseGames = window.PokeVerseGames || {};
window.PokeVerseGames.setupPokeType = setupPokeType;

if (!window.PokeVerseSpa) {
  window.addEventListener('DOMContentLoaded', () => {
    setupPokeType();
    setupNavigation();
    updateHeaderProfile();
    document.body.classList.add('is-loaded');
  });
}
