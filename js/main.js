const games = [
  {
    id: 'pokedle',
    title: 'Pokedle',
    href: 'games/pokedle/index.html',
    accent: 'red',
    available: true,
  },
  {
    id: 'type-rush',
    title: 'Type Rush',
    href: '#games',
    accent: 'black',
    available: false,
  },
  {
    id: 'sprite-blitz',
    title: 'Sprite Blitz',
    href: '#games',
    accent: 'white',
    available: false,
  },
  {
    id: 'badge-run',
    title: 'Badge Run',
    href: '#games',
    accent: 'red-dark',
    available: false,
  },
  {
    id: 'dex-grid',
    title: 'Dex Grid',
    href: '#games',
    accent: 'mono',
    available: false,
  },
];

const isExternalLink = (link) => {
  const url = new URL(link.href, window.location.href);
  return url.origin !== window.location.origin;
};

const normalizeGameHref = (href) => {
  const isNestedPage = window.location.pathname.includes('/games/');
  if (!isNestedPage || href.startsWith('#') || href.startsWith('http')) return href;
  return href.startsWith('games/') ? `../../${href}` : href;
};

const createGameCard = (game, compact = false) => {
  const article = document.createElement('article');
  article.className = `game-card accent-${game.accent}${compact ? ' compact' : ''}`;
  article.innerHTML = `
    <h3>${game.title}</h3>
    <div class="card-footer">
      <a href="${normalizeGameHref(game.href)}" data-nav-link>${game.available ? 'Ouvrir' : 'Indisponible'}</a>
    </div>
  `;
  return article;
};

const renderGames = () => {
  const carousel = document.querySelector('[data-game-carousel]');
  const grid = document.querySelector('[data-games-grid]');

  if (carousel) games.forEach((game) => carousel.appendChild(createGameCard(game)));
  if (grid) games.forEach((game) => grid.appendChild(createGameCard(game, true)));
};

const setupCarousel = () => {
  const carousel = document.querySelector('[data-game-carousel]');
  if (!carousel) return;

  const scrollByCard = (direction) => {
    const card = carousel.querySelector('.game-card');
    const distance = card ? card.offsetWidth + 18 : 340;
    carousel.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  document.querySelector('[data-carousel-prev]')?.addEventListener('click', () => scrollByCard(-1));
  document.querySelector('[data-carousel-next]')?.addEventListener('click', () => scrollByCard(1));
};

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
    const isSamePageAnchor = destination.pathname === current.pathname && destination.hash;

    if (isSamePageAnchor) {
      nav?.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
      return;
    }

    event.preventDefault();
    document.body.classList.add('is-leaving');
    window.setTimeout(() => {
      window.location.href = destination.href;
    }, 180);
  });
};

window.addEventListener('DOMContentLoaded', () => {
  renderGames();
  setupCarousel();
  setupNavigation();
  setupPokedle();
  document.body.classList.add('is-loaded');
});

const POKEDLE_API = 'https://pokeapi.co/api/v2';
const POKEDLE_CACHE_KEY = 'pokedle:pokemon:v1';
const POKEDLE_BATCH_SIZE = 24;

const generationLabels = {
  'generation-i': 'Generation I',
  'generation-ii': 'Generation II',
  'generation-iii': 'Generation III',
  'generation-iv': 'Generation IV',
  'generation-v': 'Generation V',
  'generation-vi': 'Generation VI',
  'generation-vii': 'Generation VII',
  'generation-viii': 'Generation VIII',
  'generation-ix': 'Generation IX',
};

const formatPokemonName = (name) => name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const formatDecimal = (value) => Number((value / 10).toFixed(1)).toString();

const readPokedleCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(POKEDLE_CACHE_KEY));
    return Array.isArray(cached?.pokemon) && cached.pokemon.length ? cached.pokemon : null;
  } catch {
    return null;
  }
};

const writePokedleCache = (pokemon) => {
  try {
    localStorage.setItem(POKEDLE_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), pokemon }));
  } catch {
    localStorage.removeItem(POKEDLE_CACHE_KEY);
  }
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('PokeAPI');
  return response.json();
};

const runInBatches = async (items, worker, batchSize = POKEDLE_BATCH_SIZE) => {
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

const getGenerationOrder = (generationName) => {
  const order = Object.keys(generationLabels).indexOf(generationName);
  return order + 1;
};

const fetchPokedlePokemon = async () => {
  const cached = readPokedleCache();
  if (cached) return cached;

  const list = await fetchJson(`${POKEDLE_API}/pokemon?limit=100000&offset=0`);
  const pokemon = await runInBatches(list.results, async ({ name, url }) => {
    const detail = await fetchJson(url);
    const species = await fetchJson(detail.species.url);
    const generationName = species.generation.name;
    if (!generationLabels[generationName]) return null;

    return {
      id: detail.id,
      key: detail.name,
      name: formatPokemonName(detail.name),
      primaryType: detail.types[0]?.type.name ?? 'none',
      secondaryType: detail.types[1]?.type.name ?? null,
      height: detail.height,
      weight: detail.weight,
      generation: generationName,
      generationOrder: getGenerationOrder(generationName),
    };
  });

  const sorted = pokemon.sort((first, second) => first.id - second.id);
  writePokedleCache(sorted);
  return sorted;
};

const createPokedleCell = ({ value, state, marker = '' }) => {
  const cell = document.createElement('td');
  cell.className = `pokedle-cell ${state === 'correct' ? 'is-correct' : 'is-wrong'}`;

  const content = document.createElement('span');
  content.className = 'pokedle-cell-value';
  content.textContent = value;
  cell.appendChild(content);

  if (marker) {
    const markerElement = document.createElement('span');
    markerElement.className = 'pokedle-marker';
    markerElement.textContent = marker;
    cell.appendChild(markerElement);
  }

  return cell;
};

const compareText = (guessValue, secretValue, formatter = (value) => value) => ({
  value: formatter(guessValue),
  state: guessValue === secretValue ? 'correct' : 'wrong',
});

const compareNumber = (guessValue, secretValue, formatter) => ({
  value: formatter(guessValue),
  state: guessValue === secretValue ? 'correct' : 'wrong',
  marker: guessValue === secretValue ? '🟩' : guessValue < secretValue ? '▲' : '▼',
});

const setupPokedle = async () => {
  if (document.body.dataset.page !== 'pokedle') return;

  const form = document.querySelector('[data-pokedle-form]');
  const input = document.querySelector('[data-pokedle-input]');
  const list = document.querySelector('[data-pokedle-list]');
  const submit = document.querySelector('[data-pokedle-submit]');
  const status = document.querySelector('[data-pokedle-status]');
  const attemptsBody = document.querySelector('[data-pokedle-attempts]');
  const win = document.querySelector('[data-pokedle-win]');
  const attemptCount = document.querySelector('[data-pokedle-attempt-count]');
  const found = document.querySelector('[data-pokedle-found]');
  const newGame = document.querySelector('[data-pokedle-new]');

  let pokemon = [];
  let secret = null;
  let attempts = [];

  const setPlayable = (isPlayable) => {
    input.disabled = !isPlayable;
    submit.disabled = !isPlayable;
  };

  const startGame = () => {
    secret = pokemon[Math.floor(Math.random() * pokemon.length)];
    attempts = [];
    attemptsBody.innerHTML = '';
    input.value = '';
    win.hidden = true;
    status.textContent = '';
    setPlayable(true);
  };

  const renderSuggestions = () => {
    const attempted = new Set(attempts.map((attempt) => attempt.key));
    list.innerHTML = '';
    pokemon
      .filter((entry) => !attempted.has(entry.key))
      .forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.name;
        list.appendChild(option);
      });
  };

  const addAttemptRow = (guess) => {
    const row = document.createElement('tr');
    const secondaryGuess = guess.secondaryType ?? 'None';
    const secondarySecret = secret.secondaryType ?? 'None';
    const cells = [
      compareText(guess.key, secret.key, () => guess.name),
      compareText(guess.primaryType, secret.primaryType, formatPokemonName),
      compareText(secondaryGuess, secondarySecret, (value) => value === 'None' ? 'None' : formatPokemonName(value)),
      compareNumber(guess.height, secret.height, formatDecimal),
      compareNumber(guess.weight, secret.weight, formatDecimal),
      compareNumber(guess.generationOrder, secret.generationOrder, () => generationLabels[guess.generation]),
    ];

    cells.forEach((cell) => row.appendChild(createPokedleCell(cell)));
    attemptsBody.prepend(row);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim().toLowerCase();
    const guess = pokemon.find((entry) => entry.name.toLowerCase() === value || entry.key === value);

    if (!guess) {
      status.textContent = 'Pokémon invalide';
      return;
    }

    if (attempts.some((attempt) => attempt.key === guess.key)) {
      status.textContent = 'Déjà tenté';
      return;
    }

    attempts.push(guess);
    addAttemptRow(guess);
    renderSuggestions();
    input.value = '';
    status.textContent = '';

    if (guess.key === secret.key) {
      setPlayable(false);
      attemptCount.textContent = `${attempts.length} tentative${attempts.length > 1 ? 's' : ''}`;
      found.textContent = guess.name;
      win.hidden = false;
    }
  });

  newGame.addEventListener('click', () => {
    startGame();
    renderSuggestions();
  });

  try {
    pokemon = await fetchPokedlePokemon();
    renderSuggestions();
    startGame();
  } catch {
    status.textContent = 'Erreur PokeAPI';
  }
};
