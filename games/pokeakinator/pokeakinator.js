const { fetchJson, runInBatches, pokemonIds } = window.PokeVersePokeApi;

const POKEAKINATOR_CACHE_KEY = 'pokeakinator:pokemon:v2';
const MAX_QUESTIONS = 22;
const PREVIEW_LIMIT = 8;

const formatPokemonName = (name) => name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const getFrenchResourceName = (resource, fallback) => (
  resource.names?.find((entry) => entry.language.name === 'fr')?.name ?? fallback
);

const readCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(POKEAKINATOR_CACHE_KEY));
    return Array.isArray(cached?.pokemon) && cached.pokemon.length ? cached.pokemon : null;
  } catch {
    return null;
  }
};

const writeCache = (pokemon) => {
  try {
    localStorage.setItem(POKEAKINATOR_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), pokemon }));
  } catch {
    localStorage.removeItem(POKEAKINATOR_CACHE_KEY);
  }
};

const fetchLabel = async (resourcePath, fallback) => {
  const resource = await fetchJson(resourcePath);
  return getFrenchResourceName(resource, fallback);
};

const fetchPokeAkinatorPokemon = async () => {
  const cached = readCache();
  if (cached) return cached;

  const labels = new Map();
  const getLabel = async (resourcePath, fallback) => {
    if (!labels.has(resourcePath)) labels.set(resourcePath, await fetchLabel(resourcePath, fallback));
    return labels.get(resourcePath);
  };

  const pokemon = await runInBatches(pokemonIds(), async (id) => {
    const detail = await fetchJson(`/pokemon/${id}`);
    if (!detail.is_default) return null;

    const species = await fetchJson(detail.species.url);
    const generation = Number(species.generation.url.match(/generation\/(\d+)\//)?.[1] ?? 0);
    const evolutionChain = await fetchJson(species.evolution_chain.url);
    const evolvesFrom = Boolean(species.evolves_from_species);
    const evolvesTo = hasFinalEvolution(evolutionChain.chain, species.name);

    const typeLabels = await Promise.all(detail.types
      .sort((first, second) => first.slot - second.slot)
      .map((entry) => getLabel(entry.type.url, entry.type.name)));
    const color = await getLabel(species.color.url, species.color.name);
    const shape = species.shape ? await getLabel(species.shape.url, species.shape.name) : '';
    const habitat = species.habitat ? await getLabel(species.habitat.url, species.habitat.name) : '';

    return {
      id: species.id,
      name: getFrenchResourceName(species, formatPokemonName(detail.name)),
      generation,
      types: typeLabels,
      color,
      shape,
      habitat,
      sprite: detail.sprites.other?.['official-artwork']?.front_default ?? detail.sprites.front_default,
      height: detail.height,
      weight: detail.weight,
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      isBaby: species.is_baby,
      evolvesFrom,
      evolvesTo,
    };
  }, 32);

  const sorted = pokemon.sort((first, second) => first.id - second.id);
  writeCache(sorted);
  return sorted;
};

const hasFinalEvolution = (chain, name) => {
  const visit = (node) => {
    if (node.species.name === name) return node.evolves_to.length > 0;
    return node.evolves_to.some(visit);
  };
  return visit(chain);
};

const makeQuestion = (text, test, key) => ({ text, test, key });

const buildQuestions = (pokemon) => {
  const unique = (values) => [...new Set(values.filter(Boolean))];
  return [
    ...unique(pokemon.flatMap((entry) => entry.types)).map((type) => makeQuestion(`Est-il de type ${type} ?`, (entry) => entry.types.includes(type), `type:${type}`)),
    ...unique(pokemon.map((entry) => entry.generation)).map((generation) => makeQuestion(`Vient-il de la génération ${generation} ?`, (entry) => entry.generation === generation, `generation:${generation}`)),
    ...unique(pokemon.map((entry) => entry.color)).map((color) => makeQuestion(`Sa couleur dominante est-elle ${color} ?`, (entry) => entry.color === color, `color:${color}`)),
    ...unique(pokemon.map((entry) => entry.shape)).map((shape) => makeQuestion(`Sa forme est-elle ${shape} ?`, (entry) => entry.shape === shape, `shape:${shape}`)),
    ...unique(pokemon.map((entry) => entry.habitat)).map((habitat) => makeQuestion(`Vit-il dans l'habitat ${habitat} ?`, (entry) => entry.habitat === habitat, `habitat:${habitat}`)),
    makeQuestion('Mesure-t-il au moins 1 mètre ?', (entry) => entry.height >= 10, 'height:10'),
    makeQuestion('Pèse-t-il au moins 50 kg ?', (entry) => entry.weight >= 500, 'weight:500'),
    makeQuestion('Est-ce un Pokémon légendaire ?', (entry) => entry.isLegendary, 'legendary'),
    makeQuestion('Est-ce un Pokémon fabuleux ?', (entry) => entry.isMythical, 'mythical'),
    makeQuestion('Est-ce un bébé Pokémon ?', (entry) => entry.isBaby, 'baby'),
    makeQuestion('A-t-il une pré-évolution ?', (entry) => entry.evolvesFrom, 'evolvesFrom'),
    makeQuestion('Peut-il évoluer ?', (entry) => entry.evolvesTo, 'evolvesTo'),
  ];
};

const state = {
  pokemon: [],
  candidates: [],
  questions: [],
  asked: new Set(),
  currentQuestion: null,
  questionCount: 0,
  guessed: null,
};

const scoreQuestion = (question) => {
  const yesCount = state.candidates.filter(question.test).length;
  const noCount = state.candidates.length - yesCount;
  const balance = Math.abs(yesCount - noCount);
  const reusePenalty = state.asked.has(question.key) ? state.candidates.length : 0;
  return { question, score: balance + reusePenalty, yesCount, noCount };
};

const pickQuestion = () => state.questions
  .map(scoreQuestion)
  .filter((entry) => !state.asked.has(entry.question.key) && entry.yesCount > 0 && entry.noCount > 0)
  .sort((first, second) => first.score - second.score)[0]?.question ?? null;

const updateCandidatesPreview = () => {
  const preview = document.querySelector('[data-pokeakinator-candidates]');
  preview.replaceChildren(...state.candidates.slice(0, PREVIEW_LIMIT).map((pokemon) => {
    const chip = document.createElement('span');
    chip.textContent = pokemon.name;
    return chip;
  }));
};

const showGuess = (success = true) => {
  state.guessed = state.candidates[0] ?? null;
  const resultSprite = document.querySelector('[data-pokeakinator-result-sprite]');
  document.querySelector('[data-pokeakinator-game]').hidden = true;
  document.querySelector('[data-pokeakinator-result]').hidden = false;
  document.querySelector('[data-pokeakinator-result-title]').textContent = success ? 'Est-ce ce Pokémon ?' : 'Je ne sais pas.';
  document.querySelector('[data-pokeakinator-guess]').textContent = state.guessed?.name ?? '';
  resultSprite.src = state.guessed?.sprite ?? '';
  resultSprite.hidden = !state.guessed?.sprite;
  document.querySelector('[data-pokeakinator-correct]').hidden = !state.guessed;
  document.querySelector('[data-pokeakinator-wrong]').hidden = !state.guessed;
};

const askNext = () => {
  if (state.candidates.length <= 1 || state.questionCount >= MAX_QUESTIONS) {
    showGuess(Boolean(state.candidates.length));
    return;
  }

  const question = pickQuestion();
  if (!question) {
    showGuess(Boolean(state.candidates.length));
    return;
  }

  state.currentQuestion = question;
  state.asked.add(question.key);
  state.questionCount += 1;
  document.querySelector('[data-pokeakinator-step]').textContent = `${state.questionCount}/${MAX_QUESTIONS}`;
  document.querySelector('[data-pokeakinator-count]').textContent = `${state.candidates.length} Pokémon`;
  document.querySelector('[data-pokeakinator-progress]').style.width = `${Math.round((state.questionCount / MAX_QUESTIONS) * 100)}%`;
  document.querySelector('[data-pokeakinator-question]').textContent = question.text;
  updateCandidatesPreview();
};

const answerQuestion = (answer) => {
  if (!state.currentQuestion) return;
  if (answer === 'yes') state.candidates = state.candidates.filter(state.currentQuestion.test);
  if (answer === 'no') state.candidates = state.candidates.filter((pokemon) => !state.currentQuestion.test(pokemon));
  state.currentQuestion = null;
  askNext();
};

const startGame = async () => {
  const startButton = document.querySelector('[data-pokeakinator-start]');
  const error = document.querySelector('[data-pokeakinator-error]');
  error.textContent = '';
  startButton.disabled = true;
  startButton.textContent = 'Chargement';

  try {
    const megaAlakazam = await fetchJson('/pokemon/alakazam-mega');
    document.querySelector('[data-pokeakinator-sprite]').src = megaAlakazam.sprites.front_default;
    state.pokemon = await fetchPokeAkinatorPokemon();
    state.candidates = [...state.pokemon];
    state.questions = buildQuestions(state.pokemon);
    state.asked = new Set();
    state.currentQuestion = null;
    state.questionCount = 0;
    state.guessed = null;
    document.querySelector('[data-pokeakinator-progress]').style.width = '0%';
    updateCandidatesPreview();
    document.querySelector('[data-pokeakinator-start-panel]').hidden = true;
    document.querySelector('[data-pokeakinator-result]').hidden = true;
    document.querySelector('[data-pokeakinator-game]').hidden = false;
    askNext();
  } catch {
    error.textContent = 'Chargement impossible.';
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Commencer';
  }
};

const resetGame = () => {
  document.querySelector('[data-pokeakinator-start-panel]').hidden = false;
  document.querySelector('[data-pokeakinator-game]').hidden = true;
  document.querySelector('[data-pokeakinator-result]').hidden = true;
};

const markResult = (correct) => {
  document.querySelector('[data-pokeakinator-result-title]').textContent = correct ? 'Trouvé' : 'Raté';
  document.querySelector('[data-pokeakinator-correct]').hidden = true;
  document.querySelector('[data-pokeakinator-wrong]').hidden = true;
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

const setupPokeAkinator = () => {
  document.querySelector('[data-pokeakinator-start]')?.addEventListener('click', startGame);
  document.querySelectorAll('[data-pokeakinator-answer]').forEach((button) => {
    button.addEventListener('click', () => answerQuestion(button.dataset.pokeakinatorAnswer));
  });
  document.querySelector('[data-pokeakinator-correct]')?.addEventListener('click', () => markResult(true));
  document.querySelector('[data-pokeakinator-wrong]')?.addEventListener('click', () => markResult(false));
  document.querySelector('[data-pokeakinator-new]')?.addEventListener('click', resetGame);
};

window.PokeVerseGames = window.PokeVerseGames || {};
window.PokeVerseGames.setupPokeAkinator = setupPokeAkinator;

if (!window.PokeVerseSpa) {
  window.addEventListener('DOMContentLoaded', () => {
    setupPokeAkinator();
    setupNavigation();
    updateHeaderProfile();
    document.body.classList.add('is-loaded');
  });
}
