const isExternalLink = (link) => {
  const url = new URL(link.href, window.location.href);
  return url.origin !== window.location.origin;
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

const POKEDLE_API = 'https://pokeapi.co/api/v2';
const POKEDLE_CACHE_KEY = 'pokedle:pokemon:v4';
const POKEDLE_BATCH_SIZE = 24;

const generationLabels = {
  'generation-i': 'Génération I',
  'generation-ii': 'Génération II',
  'generation-iii': 'Génération III',
  'generation-iv': 'Génération IV',
  'generation-v': 'Génération V',
  'generation-vi': 'Génération VI',
  'generation-vii': 'Génération VII',
  'generation-viii': 'Génération VIII',
  'generation-ix': 'Génération IX',
};

const generationOptions = Object.entries(generationLabels).map(([value, label]) => ({ value, label }));

const typeLabels = {
  bug: 'Insecte',
  dark: 'Ténèbres',
  dragon: 'Dragon',
  electric: 'Électrik',
  fairy: 'Fée',
  fighting: 'Combat',
  fire: 'Feu',
  flying: 'Vol',
  ghost: 'Spectre',
  grass: 'Plante',
  ground: 'Sol',
  ice: 'Glace',
  normal: 'Normal',
  poison: 'Poison',
  psychic: 'Psy',
  rock: 'Roche',
  steel: 'Acier',
  water: 'Eau',
};

const getFrenchResourceName = (resource, fallback) => (
  resource.names?.find((entry) => entry.language.name === 'fr')?.name ?? fallback
);

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

const findEvolutionStage = (chain, speciesName, stage = 1) => {
  if (chain.species?.name === speciesName) return stage;

  for (const evolution of chain.evolves_to ?? []) {
    const evolutionStage = findEvolutionStage(evolution, speciesName, stage + 1);
    if (evolutionStage) return evolutionStage;
  }

  return null;
};

const formatEvolutionStage = (stage) => `Stade ${stage}`;

const fetchPokedlePokemon = async () => {
  const cached = readPokedleCache();
  if (cached) return cached;

  const evolutionChains = new Map();
  const getEvolutionChain = async (url) => {
    if (!evolutionChains.has(url)) evolutionChains.set(url, fetchJson(url));
    return evolutionChains.get(url);
  };

  const list = await fetchJson(`${POKEDLE_API}/pokemon?limit=100000&offset=0`);
  const pokemon = await runInBatches(list.results, async ({ name, url }) => {
    const detail = await fetchJson(url);
    if (!detail.is_default) return null;

    const species = await fetchJson(detail.species.url);
    const generationName = species.generation.name;
    if (!generationLabels[generationName]) return null;

    const evolutionChain = await getEvolutionChain(species.evolution_chain.url);

    return {
      id: species.id,
      key: detail.name,
      name: getFrenchResourceName(species, formatPokemonName(detail.name)),
      primaryType: detail.types[0]?.type.name ?? 'none',
      secondaryType: detail.types[1]?.type.name ?? null,
      height: detail.height,
      weight: detail.weight,
      generation: generationName,
      generationOrder: getGenerationOrder(generationName),
      evolutionStage: findEvolutionStage(evolutionChain.chain, species.name) ?? 1,
    };
  });

  const sorted = pokemon.sort((first, second) => first.id - second.id);
  writePokedleCache(sorted);
  return sorted;
};

const createPokedleCell = ({ value, state, marker = '' }) => {
  const cell = document.createElement('td');
  cell.className = `pokedle-cell is-${state}`;

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

const compareType = (guessValue, secretValue, otherSecretValue, formatter) => ({
  value: formatter(guessValue),
  state: guessValue === secretValue ? 'correct' : guessValue === otherSecretValue ? 'misplaced' : 'wrong',
});

const compareNumber = (guessValue, secretValue, formatter) => ({
  value: formatter(guessValue),
  state: guessValue === secretValue ? 'correct' : 'wrong',
  marker: guessValue === secretValue ? '🟩' : guessValue < secretValue ? '▲' : '▼',
});

const setupPokedle = async () => {
  const form = document.querySelector('[data-pokedle-form]');
  const input = document.querySelector('[data-pokedle-input]');
  const list = document.querySelector('[data-pokedle-list]');
  const submit = document.querySelector('[data-pokedle-submit]');
  const giveUp = document.querySelector('[data-pokedle-give-up]');
  const status = document.querySelector('[data-pokedle-status]');
  const attemptsBody = document.querySelector('[data-pokedle-attempts]');
  const win = document.querySelector('[data-pokedle-win]');
  const resultTitle = document.querySelector('[data-pokedle-result-title]');
  const attemptCount = document.querySelector('[data-pokedle-attempt-count]');
  const found = document.querySelector('[data-pokedle-found]');
  const expGain = document.querySelector('[data-pokedle-exp-gain]');
  const newGame = document.querySelector('[data-pokedle-new]');
  const startPanel = document.querySelector('[data-pokedle-start-panel]');
  const generations = document.querySelector('[data-pokedle-generations]');
  const expStatus = document.querySelector('[data-pokedle-exp]');
  const start = document.querySelector('[data-pokedle-start]');
  const error = document.querySelector('[data-pokedle-error]');

  let pokemon = [];
  let secret = null;
  let attempts = [];
  let playablePokemon = [];
  let currentSelection = [];

  const setPlayable = (isPlayable) => {
    input.disabled = !isPlayable;
    submit.disabled = !isPlayable;
    giveUp.disabled = !isPlayable;
  };

  const setStartable = (isStartable) => {
    start.disabled = !isStartable;
  };

  const getSelectedGenerations = () => Array.from(generations.querySelectorAll('input:checked'))
    .map((checkbox) => checkbox.value);

  const updateExpStatus = () => {
    const selected = getSelectedGenerations();
    const selectedCount = pokemon.filter((entry) => selected.includes(entry.generation)).length;
    const totalCount = pokemon.length;
    const multiplier = totalCount ? selectedCount / totalCount : 0;
    expStatus.textContent = totalCount
      ? `Pool : ${selectedCount} / ${totalCount} Pokémon · x${multiplier.toFixed(3)}`
      : '';
  };

  const renderGenerationSelection = () => {
    generationOptions.forEach(({ value, label }) => {
      const item = document.createElement('label');
      item.className = 'pokedle-generation';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = value;
      checkbox.checked = true;
      checkbox.addEventListener('change', updateExpStatus);

      const text = document.createElement('span');
      text.textContent = label;

      item.append(checkbox, text);
      generations.appendChild(item);
    });
    updateExpStatus();
  };

  const startGame = () => {
    secret = playablePokemon[Math.floor(Math.random() * playablePokemon.length)];
    attempts = [];
    attemptsBody.innerHTML = '';
    input.value = '';
    win.hidden = true;
    resultTitle.textContent = 'Victoire';
    expGain.textContent = '';
    status.textContent = '';
    error.textContent = '';
    startPanel.hidden = true;
    setPlayable(true);
    renderSuggestions();
    recordPokedleGame({ won: false, attempts: 0, exp: 0 });
  };

  const renderSuggestions = () => {
    const attempted = new Set(attempts.map((attempt) => attempt.key));
    list.innerHTML = '';
    playablePokemon
      .filter((entry) => !attempted.has(entry.key))
      .forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.name;
        list.appendChild(option);
      });
  };

  const addAttemptRow = (guess) => {
    const row = document.createElement('tr');
    const secondaryGuess = guess.secondaryType ?? 'none';
    const secondarySecret = secret.secondaryType ?? 'none';
    const cells = [
      compareText(guess.key, secret.key, () => guess.name),
      compareType(guess.primaryType, secret.primaryType, secondarySecret, (value) => typeLabels[value] ?? formatPokemonName(value)),
      compareType(secondaryGuess, secondarySecret, secret.primaryType, (value) => value === 'none' ? 'Aucun' : typeLabels[value] ?? formatPokemonName(value)),
      compareNumber(guess.height, secret.height, formatDecimal),
      compareNumber(guess.weight, secret.weight, formatDecimal),
      compareNumber(guess.generationOrder, secret.generationOrder, () => generationLabels[guess.generation]),
      compareNumber(guess.evolutionStage, secret.evolutionStage, formatEvolutionStage),
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
      const expResult = calculatePokedleExp(playablePokemon.length, pokemon.length, attempts.length);
      const progressResult = addExperience(expResult.exp, 'pokedle');
      recordPokedleGame({ won: true, attempts: attempts.length, exp: 0, countPlayed: false });
      resultTitle.textContent = 'Victoire';
      attemptCount.textContent = `Tentatives : ${attempts.length}`;
      found.textContent = `Pokémon trouvé : ${guess.name}`;
      expGain.innerHTML = `
        <span>Générations : ${currentSelection.map((generation) => generationLabels[generation]).join(', ')}</span>
        <span>Pool : ${playablePokemon.length} Pokémon</span>
        <span>Multiplicateur génération : x${expResult.generationMultiplier.toFixed(3)}</span>
        <span>Bonus tentatives : x${expResult.attemptMultiplier.toFixed(2)}</span>
        <span>Bonus médailles : x${expResult.medalBonusMultiplier.toFixed(2)}</span>
        <span>EXP gagnée : ${progressResult.gained}</span>
        <span>Niveau actuel : ${progressResult.profile.level}</span>
        <span>Progression : ${progressResult.profile.exp} / ${progressResult.profile.expNeeded} EXP</span>
      `;
      win.hidden = false;
    }
  });

  giveUp.addEventListener('click', () => {
    if (!secret) return;

    setPlayable(false);
    status.textContent = '';
    resultTitle.textContent = 'Réponse';
    attemptCount.textContent = `Tentatives : ${attempts.length}`;
    found.textContent = `Pokémon : ${secret.name}`;
    expGain.textContent = '';
    win.hidden = false;
  });

  start.addEventListener('click', () => {
    const selected = getSelectedGenerations();
    if (!selected.length) {
      error.textContent = 'Sélectionnez au moins une génération.';
      return;
    }

    currentSelection = selected;
    playablePokemon = pokemon.filter((entry) => selected.includes(entry.generation));
    updateExpStatus();
    startGame();
  });

  newGame.addEventListener('click', () => {
    setPlayable(false);
    startPanel.hidden = false;
    win.hidden = true;
    status.textContent = '';
  });

  renderGenerationSelection();
  setPlayable(false);
  setStartable(false);

  try {
    pokemon = await fetchPokedlePokemon();
    status.textContent = '';
    updateExpStatus();
    setStartable(true);
  } catch {
    status.textContent = 'Erreur PokeAPI';
  }
};

window.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  updateHeaderProfile();
  setupPokedle();
  document.body.classList.add('is-loaded');
});
