const { fetchJson, runInBatches, pokemonIds } = window.PokeVersePokeApi;
const POKECRY_CACHE_KEY = 'pokecry:pokemon:v1';
const POKECRY_BATCH_SIZE = 64;
const POKECRY_WRITTEN_MODE = 'written';
const POKECRY_MULTIPLE_CHOICE_MODE = 'multiple-choice';

const pokecryGenerationLabels = {
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

const pokecryGenerationOptions = Object.entries(pokecryGenerationLabels).map(([value, label]) => ({ value, label }));

const normalizePokemonName = (value) => value
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '-');

const getFrenchResourceName = (resource, fallback) => (
  resource.names?.find((entry) => entry.language.name === 'fr')?.name ?? fallback
);

const formatPokemonName = (name) => name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const readPokemonCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(POKECRY_CACHE_KEY));
    return Array.isArray(cached?.pokemon) && cached.pokemon.length ? cached.pokemon : null;
  } catch {
    return null;
  }
};

const writePokemonCache = (pokemon) => {
  try {
    localStorage.setItem(POKECRY_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), pokemon }));
  } catch {
    localStorage.removeItem(POKECRY_CACHE_KEY);
  }
};

const fetchPokeCryPokemon = async () => {
  const cached = readPokemonCache();
  if (cached) return cached;

  const pokemon = await runInBatches(pokemonIds(), async (id) => {
    const detail = await fetchJson(`/pokemon/${id}`);
    const name = detail.name;
    if (!detail.is_default || !detail.cries?.latest) return null;

    const species = await fetchJson(detail.species.url);
    const generation = species.generation.name;
    if (!pokecryGenerationLabels[generation]) return null;

    const frenchName = getFrenchResourceName(species, formatPokemonName(name));
    return {
      id: species.id,
      key: detail.name,
      name: frenchName,
      aliases: [detail.name, frenchName].map(normalizePokemonName),
      generation,
      cry: detail.cries.latest,
    };
  });

  const sorted = pokemon.sort((first, second) => first.id - second.id);
  writePokemonCache(sorted);
  return sorted;
};

const shuffle = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const createRunExp = (run) => {
  if (run <= 0) return 0;
  return Math.round(24 * run + 6 * (run ** 1.55));
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

const setupPokeCryGame = async () => {
  const startPanel = document.querySelector('[data-pokecry-start-panel]');
  const generations = document.querySelector('[data-pokecry-generations]');
  const expStatus = document.querySelector('[data-pokecry-exp]');
  const start = document.querySelector('[data-pokecry-start]');
  const error = document.querySelector('[data-pokecry-error]');
  const game = document.querySelector('[data-pokecry-game]');
  const audio = document.querySelector('[data-pokecry-audio]');
  const play = document.querySelector('[data-pokecry-play]');
  const runOutput = document.querySelector('[data-pokecry-run]');
  const form = document.querySelector('[data-pokecry-form]');
  const input = document.querySelector('[data-pokecry-input]');
  const list = document.querySelector('[data-pokecry-list]');
  const submit = document.querySelector('[data-pokecry-submit]');
  const choices = document.querySelector('[data-pokecry-choices]');
  const status = document.querySelector('[data-pokecry-status]');
  const result = document.querySelector('[data-pokecry-result]');
  const finalRun = document.querySelector('[data-pokecry-final-run]');
  const answer = document.querySelector('[data-pokecry-answer]');
  const expGain = document.querySelector('[data-pokecry-exp-gain]');
  const newGame = document.querySelector('[data-pokecry-new]');

  let pokemon = [];
  let playablePokemon = [];
  let currentSelection = [];
  let currentMode = POKECRY_WRITTEN_MODE;
  let secret = null;
  let run = 0;
  let previousKeys = [];

  const getSelectedGenerations = () => Array.from(generations.querySelectorAll('input:checked')).map((checkbox) => checkbox.value);
  const getSelectedMode = () => document.querySelector('[data-pokecry-mode]:checked')?.value ?? POKECRY_WRITTEN_MODE;

  const updateExpStatus = () => {
    const selected = getSelectedGenerations();
    const selectedCount = pokemon.filter((entry) => selected.includes(entry.generation)).length;
    const totalCount = pokemon.length;
    const generationMultiplier = totalCount ? selectedCount / totalCount : 0;
    const modeMultiplier = getSelectedMode() === POKECRY_WRITTEN_MODE ? 1 : 0.35;
    expStatus.textContent = totalCount
      ? `Pool : ${selectedCount} / ${totalCount} Pokémon · x${generationMultiplier.toFixed(3)} · Mode x${modeMultiplier.toFixed(2)}`
      : '';
  };

  const renderGenerationSelection = () => {
    pokecryGenerationOptions.forEach(({ value, label }) => {
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
    document.querySelectorAll('[data-pokecry-mode]').forEach((mode) => mode.addEventListener('change', updateExpStatus));
    updateExpStatus();
  };

  const setWrittenPlayable = (isPlayable) => {
    input.disabled = !isPlayable;
    submit.disabled = !isPlayable;
  };

  const renderSuggestions = () => {
    list.innerHTML = '';
    playablePokemon.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.name;
      list.appendChild(option);
    });
  };

  const renderChoices = () => {
    choices.innerHTML = '';
    const wrongAnswers = shuffle(playablePokemon.filter((entry) => entry.key !== secret.key)).slice(0, 3);
    shuffle([secret, ...wrongAnswers]).forEach((entry) => {
      const button = document.createElement('button');
      button.className = 'btn btn-ghost';
      button.type = 'button';
      button.textContent = entry.name;
      button.addEventListener('click', () => submitAnswer(entry));
      choices.appendChild(button);
    });
  };

  const playCry = () => {
    audio.currentTime = 0;
    audio.play().catch(() => { status.textContent = 'Lecture impossible'; });
  };

  const nextPokemon = () => {
    const available = playablePokemon.filter((entry) => !previousKeys.includes(entry.key));
    if (!available.length) {
      endRun(true);
      return;
    }

    secret = pickRandom(available);
    previousKeys.push(secret.key);
    audio.src = secret.cry;
    runOutput.textContent = run;
    input.value = '';
    status.textContent = '';

    if (currentMode === POKECRY_WRITTEN_MODE) {
      form.hidden = false;
      choices.hidden = true;
      setWrittenPlayable(true);
      input.focus();
    } else {
      form.hidden = true;
      choices.hidden = false;
      renderChoices();
    }
  };

  const endRun = (isCompleted = false) => {
    setWrittenPlayable(false);
    choices.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    const generationMultiplier = pokemon.length ? playablePokemon.length / pokemon.length : 0;
    const modeMultiplier = currentMode === POKECRY_WRITTEN_MODE ? 1 : 0.35;
    const runExp = createRunExp(run);
    const medalBonusMultiplier = calculateMedalBonus();
    const exp = Math.round(runExp * generationMultiplier * modeMultiplier * medalBonusMultiplier);
    const progressResult = addExperience(exp, 'pokecry');
    recordPokeCryGame({ mode: currentMode, run, exp: 0 });

    game.hidden = true;
    finalRun.textContent = run;
    answer.textContent = isCompleted ? '' : `Pokémon : ${secret.name}`;
    expGain.innerHTML = `
      <span>Générations : ${currentSelection.map((generation) => pokecryGenerationLabels[generation]).join(', ')}</span>
      <span>Pool : ${playablePokemon.length} Pokémon</span>
      <span>EXP de run : ${runExp}</span>
      <span>Multiplicateur génération : x${generationMultiplier.toFixed(3)}</span>
      <span>Multiplicateur mode : x${modeMultiplier.toFixed(2)}</span>
      <span>Bonus médailles : x${medalBonusMultiplier.toFixed(2)}</span>
      <span>EXP gagnée : ${progressResult.gained}</span>
    `;
    result.hidden = false;
  };

  function submitAnswer(guess) {
    if (!guess || guess.key !== secret.key) {
      endRun();
      return;
    }

    run += 1;
    runOutput.textContent = run;
    if (run >= playablePokemon.length) {
      endRun(true);
      return;
    }
    nextPokemon();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = normalizePokemonName(input.value);
    const guess = playablePokemon.find((entry) => entry.aliases.includes(value));
    if (!guess) {
      status.textContent = 'Pokémon invalide';
      return;
    }
    submitAnswer(guess);
  });

  play.addEventListener('click', playCry);

  start.addEventListener('click', () => {
    const selected = getSelectedGenerations();
    if (!selected.length) {
      error.textContent = 'Sélectionnez au moins une génération.';
      return;
    }

    currentSelection = selected;
    currentMode = getSelectedMode();
    playablePokemon = pokemon.filter((entry) => selected.includes(entry.generation));
    if (currentMode === POKECRY_MULTIPLE_CHOICE_MODE && playablePokemon.length < 4) {
      error.textContent = 'Le mode QCM nécessite au moins 4 Pokémon.';
      return;
    }

    run = 0;
    previousKeys = [];
    error.textContent = '';
    startPanel.hidden = true;
    result.hidden = true;
    game.hidden = false;
    renderSuggestions();
    nextPokemon();
  });

  newGame.addEventListener('click', () => {
    result.hidden = true;
    startPanel.hidden = false;
    status.textContent = '';
  });

  renderGenerationSelection();
  start.disabled = true;
  setWrittenPlayable(false);

  try {
    pokemon = await fetchPokeCryPokemon();
    status.textContent = '';
    updateExpStatus();
    start.disabled = false;
  } catch {
    status.textContent = 'Erreur PokeAPI';
  }
};

window.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  updateHeaderProfile();
  setupPokeCryGame();
  document.body.classList.add('is-loaded');
});
