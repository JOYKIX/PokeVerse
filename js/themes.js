const POKEVERSE_THEME_STORAGE_KEY = 'pokeverse:active-theme:v1';
const POKEVERSE_DEFAULT_THEME_ID = 'light';

const PokeVerseThemes = [
  { id: 'light', name: 'Clair', price: 0, colors: { scheme: 'light' } },
  { id: 'dark', name: 'Sombre', price: 0, colors: { scheme: 'dark' } },
];

const getThemeById = (themeId) => PokeVerseThemes.find((theme) => theme.id === themeId) ?? PokeVerseThemes[0];

const applyPokeVerseTheme = (themeId = localStorage.getItem(POKEVERSE_THEME_STORAGE_KEY) || POKEVERSE_DEFAULT_THEME_ID) => {
  const theme = getThemeById(themeId);
  document.documentElement.dataset.theme = theme.id;
  document.body?.setAttribute('data-theme', theme.id);
  localStorage.setItem(POKEVERSE_THEME_STORAGE_KEY, theme.id);
  return theme;
};

window.PokeVerseThemes = { themes: PokeVerseThemes, defaultThemeId: POKEVERSE_DEFAULT_THEME_ID, getThemeById, applyTheme: applyPokeVerseTheme };

document.addEventListener('DOMContentLoaded', () => applyPokeVerseTheme());
