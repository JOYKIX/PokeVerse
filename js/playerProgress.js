const POKEVERSE_PROFILE_KEY = 'pokeverse:player-profile:v1';
const BASE_POKEDLE_EXP = 90;
const SILHOUETTE_MEDAL_PREFIX = 'silhouette:';

const createDefaultPlayerProfile = () => ({
  pseudo: 'Trainer',
  level: 1,
  exp: 0,
  expNeeded: getExpNeededForLevel(1),
  totalExp: 0,
  pokedollars: 0,
  medals: [],
  ownedThemes: ['base-light', 'base-dark'],
  activeTheme: 'base-light',
  expBonus: 1,
  pokedleStats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalAttempts: 0,
    bestAttemptScore: null,
    expEarned: 0,
  },
  silhouetteStats: {
    gamesPlayed: 0,
    bestRun: 0,
    totalCorrectAnswers: 0,
    expEarned: 0,
    writtenGamesPlayed: 0,
    multipleChoiceGamesPlayed: 0,
  },
  pokedexRushStats: {
    expEarned: 0,
  },
  pokecryStats: {
    gamesPlayed: 0,
    bestRun: 0,
    totalCorrectAnswers: 0,
    expEarned: 0,
    writtenGamesPlayed: 0,
    multipleChoiceGamesPlayed: 0,
  },
});

const normalizePlayerProfile = (profile) => {
  const defaults = createDefaultPlayerProfile();
  const medals = Array.isArray(profile?.medals) ? profile.medals : defaults.medals;
  const level = Number.isFinite(profile?.level) && profile.level > 0 ? Math.floor(profile.level) : defaults.level;

  return {
    pseudo: typeof profile?.pseudo === 'string' && profile.pseudo.trim() ? profile.pseudo.trim() : defaults.pseudo,
    level,
    exp: Number.isFinite(profile?.exp) && profile.exp >= 0 ? Math.floor(profile.exp) : defaults.exp,
    expNeeded: getExpNeededForLevel(level),
    totalExp: Number.isFinite(profile?.totalExp) && profile.totalExp >= 0 ? Math.floor(profile.totalExp) : defaults.totalExp,
    pokedollars: Number.isFinite(profile?.pokedollars) && profile.pokedollars >= 0 ? Math.floor(profile.pokedollars) : defaults.pokedollars,
    medals,
    ownedThemes: normalizeOwnedThemes(profile?.ownedThemes),
    activeTheme: normalizeActiveTheme(profile?.activeTheme, profile?.ownedThemes),
    expBonus: calculateMedalBonus(medals),
    pokedleStats: {
      gamesPlayed: Number.isFinite(profile?.pokedleStats?.gamesPlayed) ? profile.pokedleStats.gamesPlayed : defaults.pokedleStats.gamesPlayed,
      gamesWon: Number.isFinite(profile?.pokedleStats?.gamesWon) ? profile.pokedleStats.gamesWon : defaults.pokedleStats.gamesWon,
      totalAttempts: Number.isFinite(profile?.pokedleStats?.totalAttempts) ? profile.pokedleStats.totalAttempts : defaults.pokedleStats.totalAttempts,
      bestAttemptScore: Number.isFinite(profile?.pokedleStats?.bestAttemptScore) ? profile.pokedleStats.bestAttemptScore : defaults.pokedleStats.bestAttemptScore,
      expEarned: Number.isFinite(profile?.pokedleStats?.expEarned) ? profile.pokedleStats.expEarned : defaults.pokedleStats.expEarned,
    },
    silhouetteStats: {
      gamesPlayed: Number.isFinite(profile?.silhouetteStats?.gamesPlayed) ? profile.silhouetteStats.gamesPlayed : defaults.silhouetteStats.gamesPlayed,
      bestRun: Number.isFinite(profile?.silhouetteStats?.bestRun) ? profile.silhouetteStats.bestRun : defaults.silhouetteStats.bestRun,
      totalCorrectAnswers: Number.isFinite(profile?.silhouetteStats?.totalCorrectAnswers) ? profile.silhouetteStats.totalCorrectAnswers : defaults.silhouetteStats.totalCorrectAnswers,
      expEarned: Number.isFinite(profile?.silhouetteStats?.expEarned) ? profile.silhouetteStats.expEarned : defaults.silhouetteStats.expEarned,
      writtenGamesPlayed: Number.isFinite(profile?.silhouetteStats?.writtenGamesPlayed) ? profile.silhouetteStats.writtenGamesPlayed : defaults.silhouetteStats.writtenGamesPlayed,
      multipleChoiceGamesPlayed: Number.isFinite(profile?.silhouetteStats?.multipleChoiceGamesPlayed) ? profile.silhouetteStats.multipleChoiceGamesPlayed : defaults.silhouetteStats.multipleChoiceGamesPlayed,
    },
    pokedexRushStats: {
      expEarned: Number.isFinite(profile?.pokedexRushStats?.expEarned) ? profile.pokedexRushStats.expEarned : defaults.pokedexRushStats.expEarned,
    },
    pokecryStats: {
      gamesPlayed: Number.isFinite(profile?.pokecryStats?.gamesPlayed) ? profile.pokecryStats.gamesPlayed : defaults.pokecryStats.gamesPlayed,
      bestRun: Number.isFinite(profile?.pokecryStats?.bestRun) ? profile.pokecryStats.bestRun : defaults.pokecryStats.bestRun,
      totalCorrectAnswers: Number.isFinite(profile?.pokecryStats?.totalCorrectAnswers) ? profile.pokecryStats.totalCorrectAnswers : defaults.pokecryStats.totalCorrectAnswers,
      expEarned: Number.isFinite(profile?.pokecryStats?.expEarned) ? profile.pokecryStats.expEarned : defaults.pokecryStats.expEarned,
      writtenGamesPlayed: Number.isFinite(profile?.pokecryStats?.writtenGamesPlayed) ? profile.pokecryStats.writtenGamesPlayed : defaults.pokecryStats.writtenGamesPlayed,
      multipleChoiceGamesPlayed: Number.isFinite(profile?.pokecryStats?.multipleChoiceGamesPlayed) ? profile.pokecryStats.multipleChoiceGamesPlayed : defaults.pokecryStats.multipleChoiceGamesPlayed,
    },
  };
};

function normalizeOwnedThemes(ownedThemes) {
  const availableThemes = window.PokeVerseThemes?.themes?.map((theme) => theme.id) ?? ['base-light', 'base-dark'];
  const owned = Array.isArray(ownedThemes) ? ownedThemes.filter((themeId) => availableThemes.includes(themeId)) : [];
  return Array.from(new Set(['base-light', 'base-dark', ...owned]));
}

function normalizeActiveTheme(activeTheme, ownedThemes) {
  const owned = normalizeOwnedThemes(ownedThemes);
  return owned.includes(activeTheme) ? activeTheme : 'base-light';
}

function getExpNeededForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(90 + (safeLevel ** 1.62) * 38);
}

function getPlayerProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(POKEVERSE_PROFILE_KEY));
    const profile = normalizePlayerProfile(saved);
    savePlayerProfile(profile);
    return profile;
  } catch {
    const profile = createDefaultPlayerProfile();
    savePlayerProfile(profile);
    return profile;
  }
}

function savePlayerProfile(profile) {
  const normalized = normalizePlayerProfile(profile);
  localStorage.setItem(POKEVERSE_PROFILE_KEY, JSON.stringify(normalized));
  return normalized;
}

function updatePlayerName(name) {
  const profile = getPlayerProfile();
  profile.pseudo = name.trim() || 'Trainer';
  const saved = savePlayerProfile(profile);
  updateHeaderProfile();
  updateProfilePage();
  return saved;
}

function calculateMedalBonus(medals = getPlayerProfile().medals) {
  return 1 + medals.length * 0.02;
}

function addPokedollars(amount) {
  const gained = Math.max(0, Math.round(amount));
  if (!gained) return { profile: getPlayerProfile(), gained };
  const profile = getPlayerProfile();
  profile.pokedollars += gained;
  const saved = savePlayerProfile(profile);
  updateHeaderProfile();
  updateProfilePage();
  return { profile: saved, gained };
}

function calculatePokedollarsFromExp(exp) {
  return Math.max(1, Math.round(exp * 0.35));
}

function addExperience(amount, source = '') {
  const gained = Math.max(0, Math.round(amount));
  const profile = getPlayerProfile();
  profile.exp += gained;
  profile.totalExp += gained;
  if (source) profile.pokedollars += calculatePokedollarsFromExp(gained);

  while (profile.exp >= getExpNeededForLevel(profile.level)) {
    profile.exp -= getExpNeededForLevel(profile.level);
    profile.level += 1;
  }

  profile.expNeeded = getExpNeededForLevel(profile.level);
  profile.expBonus = calculateMedalBonus(profile.medals);

  if (source === 'pokedle') profile.pokedleStats.expEarned += gained;
  if (source === 'silhouette') profile.silhouetteStats.expEarned += gained;
  if (source === 'pokedexRush') profile.pokedexRushStats.expEarned += gained;
  if (source === 'pokecry') profile.pokecryStats.expEarned += gained;

  const saved = savePlayerProfile(profile);
  updateHeaderProfile();
  updateProfilePage();
  return { profile: saved, gained };
}

function calculateAttemptMultiplier(attempts) {
  if (attempts === 1) return 2;
  if (attempts === 2) return 1.15;
  if (attempts === 3) return 1.10;
  if (attempts === 4) return 1.05;
  if (attempts === 5) return 1;
  return Math.max(0.25, 1 - ((attempts - 5) * 0.05));
}

function calculatePokedleExp(selectedPokemonCount, totalPokemonCount, attempts) {
  const generationMultiplier = totalPokemonCount > 0 ? selectedPokemonCount / totalPokemonCount : 0;
  const attemptMultiplier = calculateAttemptMultiplier(attempts);
  const medalBonusMultiplier = calculateMedalBonus();
  const exp = Math.round(BASE_POKEDLE_EXP * generationMultiplier * attemptMultiplier * medalBonusMultiplier);

  return { exp, generationMultiplier, attemptMultiplier, medalBonusMultiplier };
}

function calculateSilhouetteMedalBonus(medals = getPlayerProfile().medals) {
  return 1 + medals.filter((medal) => typeof medal === 'string' && medal.startsWith(SILHOUETTE_MEDAL_PREFIX)).length * 0.02;
}

function recordPokedleGame({ won, attempts, exp, countPlayed = true }) {
  const profile = getPlayerProfile();
  if (countPlayed) profile.pokedleStats.gamesPlayed += 1;
  if (won) {
    profile.pokedleStats.gamesWon += 1;
    profile.pokedleStats.totalAttempts += attempts;
    profile.pokedleStats.bestAttemptScore = profile.pokedleStats.bestAttemptScore === null
      ? attempts
      : Math.min(profile.pokedleStats.bestAttemptScore, attempts);
  }
  if (exp > 0) profile.pokedleStats.expEarned += exp;
  const saved = savePlayerProfile(profile);
  updateProfilePage();
  return saved;
}

function recordSilhouetteGame({ mode, run, exp }) {
  const profile = getPlayerProfile();
  profile.silhouetteStats.gamesPlayed += 1;
  profile.silhouetteStats.totalCorrectAnswers += run;
  profile.silhouetteStats.bestRun = Math.max(profile.silhouetteStats.bestRun, run);
  if (mode === 'written') profile.silhouetteStats.writtenGamesPlayed += 1;
  if (mode === 'multiple-choice') profile.silhouetteStats.multipleChoiceGamesPlayed += 1;
  if (exp > 0) profile.silhouetteStats.expEarned += exp;
  const saved = savePlayerProfile(profile);
  updateProfilePage();
  return saved;
}

function recordPokeCryGame({ mode, run, exp }) {
  const profile = getPlayerProfile();
  profile.pokecryStats.gamesPlayed += 1;
  profile.pokecryStats.totalCorrectAnswers += run;
  profile.pokecryStats.bestRun = Math.max(profile.pokecryStats.bestRun, run);
  if (mode === 'written') profile.pokecryStats.writtenGamesPlayed += 1;
  if (mode === 'multiple-choice') profile.pokecryStats.multipleChoiceGamesPlayed += 1;
  if (exp > 0) profile.pokecryStats.expEarned += exp;
  const saved = savePlayerProfile(profile);
  updateProfilePage();
  return saved;
}

function renderExpBar(current, needed, compact = false) {
  const percent = needed > 0 ? Math.min(100, (current / needed) * 100) : 0;
  return `
    <div class="exp-bar${compact ? ' exp-bar-mini' : ''}" aria-label="EXP">
      <span style="width: ${percent}%"></span>
    </div>
    <span class="exp-value">${current} / ${needed} EXP</span>
  `;
}

function updateHeaderProfile() {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;
  let box = header.querySelector('[data-header-profile]');
  if (!box) {
    box = document.createElement('a');
    box.href = header.querySelector('.brand')?.getAttribute('href')?.includes('../') ? '../../profile.html' : 'profile.html';
    box.className = 'header-profile';
    box.dataset.headerProfile = '';
    header.insertBefore(box, header.querySelector('.nav-toggle'));
  }
  const profile = getPlayerProfile();
  window.PokeVerseThemes?.applyTheme(profile.activeTheme);
  box.innerHTML = `<strong>${profile.pseudo}</strong><span>Niveau ${profile.level}</span><span>${profile.pokedollars} ₽</span>${renderExpBar(profile.exp, profile.expNeeded, true)}`;
}

function updateProfilePage() {
  const root = document.querySelector('[data-profile-page]');
  if (!root) return;
  const profile = getPlayerProfile();
  root.querySelector('[data-profile-name]').value = profile.pseudo;
  root.querySelector('[data-profile-level]').textContent = profile.level;
  root.querySelector('[data-profile-exp-bar]').innerHTML = renderExpBar(profile.exp, profile.expNeeded);
  root.querySelector('[data-profile-total-exp]').textContent = profile.totalExp;
  root.querySelector('[data-profile-pokedollars]').textContent = profile.pokedollars;
  root.querySelector('[data-profile-medals]').textContent = profile.medals.length;
  root.querySelector('[data-profile-bonus]').textContent = `x${profile.expBonus.toFixed(2)}`;
  root.querySelector('[data-pokedle-played]').textContent = profile.pokedleStats.gamesPlayed;
  root.querySelector('[data-pokedle-won]').textContent = profile.pokedleStats.gamesWon;
  root.querySelector('[data-pokedle-attempts]').textContent = profile.pokedleStats.totalAttempts;
  root.querySelector('[data-pokedle-best]').textContent = profile.pokedleStats.bestAttemptScore ?? '-';
  root.querySelector('[data-pokedle-exp]').textContent = profile.pokedleStats.expEarned;
  root.querySelector('[data-silhouette-played]').textContent = profile.silhouetteStats.gamesPlayed;
  root.querySelector('[data-silhouette-best]').textContent = profile.silhouetteStats.bestRun;
  root.querySelector('[data-silhouette-correct]').textContent = profile.silhouetteStats.totalCorrectAnswers;
  root.querySelector('[data-silhouette-exp]').textContent = profile.silhouetteStats.expEarned;
  root.querySelector('[data-silhouette-written]').textContent = profile.silhouetteStats.writtenGamesPlayed;
  root.querySelector('[data-silhouette-qcm]').textContent = profile.silhouetteStats.multipleChoiceGamesPlayed;
  root.querySelector('[data-pokecry-played]').textContent = profile.pokecryStats.gamesPlayed;
  root.querySelector('[data-pokecry-best]').textContent = profile.pokecryStats.bestRun;
  root.querySelector('[data-pokecry-correct]').textContent = profile.pokecryStats.totalCorrectAnswers;
  root.querySelector('[data-pokecry-exp]').textContent = profile.pokecryStats.expEarned;
  root.querySelector('[data-pokecry-written]').textContent = profile.pokecryStats.writtenGamesPlayed;
  root.querySelector('[data-pokecry-qcm]').textContent = profile.pokecryStats.multipleChoiceGamesPlayed;
  renderThemeBox(root, profile);
}

function buyTheme(themeId) {
  const theme = window.PokeVerseThemes?.getThemeById(themeId);
  if (!theme) return null;
  const profile = getPlayerProfile();
  if (!profile.ownedThemes.includes(theme.id)) {
    if (profile.pokedollars < theme.price) return null;
    profile.pokedollars -= theme.price;
    profile.ownedThemes.push(theme.id);
  }
  profile.activeTheme = theme.id;
  const saved = savePlayerProfile(profile);
  window.PokeVerseThemes?.applyTheme(saved.activeTheme);
  updateHeaderProfile();
  updateProfilePage();
  return saved;
}

function renderThemeBox(root, profile) {
  const list = root.querySelector('[data-theme-box]');
  if (!list || !window.PokeVerseThemes) return;
  list.innerHTML = '';
  window.PokeVerseThemes.themes.forEach((theme) => {
    const owned = profile.ownedThemes.includes(theme.id);
    const active = profile.activeTheme === theme.id;
    const item = document.createElement('article');
    item.className = 'theme-card';
    item.toggleAttribute('data-active', active);
    item.innerHTML = `
      <div class="theme-preview" style="--preview-primary: ${theme.colors.red}; --preview-secondary: ${theme.colors.black}; --preview-paper: ${theme.colors.paper};"></div>
      <div>
        <h3>${theme.name}</h3>
        <p>${theme.price ? `${theme.price} ₽` : '0 ₽'}</p>
      </div>
      <button class="btn ${active ? 'btn-ghost' : 'btn-primary'}" type="button" ${(!owned && profile.pokedollars < theme.price) || active ? 'disabled' : ''}>${active ? 'Actif' : owned ? 'Utiliser' : 'Acheter'}</button>
    `;
    item.querySelector('button').addEventListener('click', () => buyTheme(theme.id));
    list.appendChild(item);
  });
}


function setupProfilePage() {
  const root = document.querySelector('[data-profile-page]');
  if (!root) return;
  root.querySelector('[data-profile-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    updatePlayerName(root.querySelector('[data-profile-name]').value);
  });
  updateProfilePage();
  window.PokeVerseThemes?.applyTheme(getPlayerProfile().activeTheme);
}

const MEDAL_LABELS = {
  'pokedex-rush:master:kanto': 'Maitre de Kanto',
  'pokedex-rush:master:johto': 'Maitre de Johto',
  'pokedex-rush:master:hoenn': 'Maitre de Hoenn',
  'pokedex-rush:master:sinnoh': 'Maitre de Sinnoh',
  'pokedex-rush:master:unys': 'Maitre de Unys',
  'pokedex-rush:master:kalos': 'Maitre de Kalos',
  'pokedex-rush:master:alola': 'Maitre de Alola',
  'pokedex-rush:master:galar': 'Maitre de Galar',
  'pokedex-rush:master:paldea': 'Maitre de Paldea',
  'pokedex-rush:all-generations': 'Le meilleur dresseur',
};

function getMedalLabel(medal) {
  return MEDAL_LABELS[medal] ?? medal;
}

function setupMedalsPage() {
  const root = document.querySelector('[data-medals-page]');
  if (!root) return;
  const profile = getPlayerProfile();
  const list = root.querySelector('[data-medals-list]');
  list.innerHTML = profile.medals.map((medal) => `<li>${getMedalLabel(medal)}</li>`).join('');
}
