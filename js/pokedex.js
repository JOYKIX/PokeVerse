const { fetchJson, runInBatches, pokemonIds } = window.PokeVersePokeApi;
const POKEDEX_CACHE_KEY = 'pokeverse:pokedex:list:v1';
const POKEDEX_BATCH_SIZE = 64;

const pokedexStatLabels = {
  hp: 'PV',
  attack: 'Attaque',
  defense: 'Défense',
  'special-attack': 'Attaque Spéciale',
  'special-defense': 'Défense Spéciale',
  speed: 'Vitesse',
};

const normalizePokedexName = (value) => value
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '-');

const formatPokedexName = (name) => name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const getFrenchResourceName = (resource, fallback) => (
  resource.names?.find((entry) => entry.language.name === 'fr')?.name ?? fallback
);

const readPokedexListCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(POKEDEX_CACHE_KEY));
    return Array.isArray(cached?.pokemon) && cached.pokemon.length ? cached.pokemon : null;
  } catch {
    return null;
  }
};

const writePokedexListCache = (pokemon) => {
  try {
    localStorage.setItem(POKEDEX_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), pokemon }));
  } catch {
    localStorage.removeItem(POKEDEX_CACHE_KEY);
  }
};

const fetchPokedexList = async () => {
  const cached = readPokedexListCache();
  if (cached) return cached;

  const pokemon = await runInBatches(pokemonIds(), async (id) => {
    const detail = await fetchJson(`/pokemon/${id}`);
    if (!detail.is_default) return null;

    const species = await fetchJson(detail.species.url);
    const name = getFrenchResourceName(species, formatPokedexName(detail.name));
    return {
      id: detail.id,
      key: detail.name,
      name,
      aliases: [detail.name, name].map(normalizePokedexName),
    };
  }, POKEDEX_BATCH_SIZE);

  const sorted = pokemon.sort((first, second) => first.id - second.id);
  writePokedexListCache(sorted);
  return sorted;
};

const findPokemon = (pokemon, value) => {
  const query = normalizePokedexName(value);
  return pokemon.find((entry) => entry.aliases.includes(query) || String(entry.id) === query);
};

const renderStats = (container, stats) => {
  container.innerHTML = '';
  stats.forEach((stat) => {
    const item = document.createElement('div');
    item.className = 'pokedex-stat';
    const label = document.createElement('span');
    label.textContent = pokedexStatLabels[stat.stat.name] ?? stat.stat.name;
    const value = document.createElement('strong');
    value.textContent = stat.base_stat;
    const bar = document.createElement('span');
    bar.className = 'pokedex-stat-bar';
    const fill = document.createElement('span');
    fill.style.width = `${Math.min(100, (stat.base_stat / 255) * 100)}%`;
    bar.appendChild(fill);
    item.append(label, value, bar);
    container.appendChild(item);
  });
};

const setupPokedex = async () => {
  const form = document.querySelector('[data-pokedex-form]');
  if (!form || form.dataset.ready === 'true') return;
  form.dataset.ready = 'true';

  const input = document.querySelector('[data-pokedex-input]');
  const list = document.querySelector('[data-pokedex-list]');
  const status = document.querySelector('[data-pokedex-status]');
  const details = document.querySelector('[data-pokedex-details]');
  const image = document.querySelector('[data-pokedex-image]');
  const number = document.querySelector('[data-pokedex-number]');
  const name = document.querySelector('[data-pokedex-name]');
  const types = document.querySelector('[data-pokedex-types]');
  const cry = document.querySelector('[data-pokedex-cry]');
  const audio = document.querySelector('[data-pokedex-audio]');
  const stats = document.querySelector('[data-pokedex-stats]');

  let pokemon = [];

  const showPokemon = async (entry) => {
    status.textContent = 'Chargement';
    const detail = await fetchJson(`/pokemon/${entry.id}`);
    const typeResources = await Promise.all(detail.types.map((slot) => fetchJson(slot.type.url)));

    image.src = detail.sprites.other?.['official-artwork']?.front_default ?? detail.sprites.front_default ?? '';
    image.alt = entry.name;
    number.textContent = `N° ${String(entry.id).padStart(4, '0')}`;
    name.textContent = entry.name;
    types.innerHTML = '';
    typeResources.forEach((typeResource, index) => {
      const type = document.createElement('span');
      type.textContent = getFrenchResourceName(typeResource, detail.types[index].type.name);
      types.appendChild(type);
    });
    renderStats(stats, detail.stats);

    audio.src = detail.cries?.latest ?? detail.cries?.legacy ?? '';
    cry.disabled = !audio.src;
    details.hidden = false;
    status.textContent = '';
  };

  pokemon = await fetchPokedexList();
  list.innerHTML = '';
  pokemon.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.name;
    list.appendChild(option);
  });
  status.textContent = '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const entry = findPokemon(pokemon, input.value);
    if (!entry) {
      status.textContent = 'Introuvable';
      return;
    }
    showPokemon(entry).catch(() => { status.textContent = 'Erreur'; });
  });

  cry.addEventListener('click', () => {
    audio.currentTime = 0;
    audio.play().catch(() => { status.textContent = 'Lecture impossible'; });
  });

  showPokemon(pokemon[0]).catch(() => { status.textContent = 'Erreur'; });
};

window.PokeVersePokedex = { setupPokedex };

if (!window.PokeVerseSpa) {
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
    setupNavigation();
    setupPokedex();
    document.body.classList.add('is-loaded');
  });
}
