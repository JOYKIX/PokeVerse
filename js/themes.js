const POKEVERSE_THEME_STORAGE_KEY = 'pokeverse:active-theme:v1';
const POKEVERSE_DEFAULT_THEME_ID = 'pokeball';

const PokeVerseThemes = [
  {
    id: 'pokeball',
    name: 'Pokéball',
    price: 0,
    colors: { red: '#e31937', accent: '#e31937', red600: '#c9102c', red700: '#8f0018', black: '#08090d', ink: '#171923', ink2: '#2a2d38', muted: '#717480', line: '#e5e5e8', paper: '#f7f7f9', white: '#ffffff', bodyGlow: 'rgba(227,25,55,.15)', bodyStart: '#ffffff', bodyEnd: '#eceef4', headerEnd: '#2b0008', grid: 'rgba(8,9,13,.035)', panel: 'rgba(255,255,255,.94)', softSurface: '#f8f8fa', inputBorder: '#d7d9df', scrollbarTrack: '#eceef4', scrollbarThumb: '#b9bdc9' },
  },
  {
    id: 'superball',
    name: 'Superball',
    price: 450,
    colors: { red: '#2b8bd8', accent: '#eb4f58', red600: '#1667a8', red700: '#0d3f6d', black: '#101826', ink: '#111827', ink2: '#243044', muted: '#687386', line: '#d8e7f4', paper: '#f4f9ff', white: '#ffffff', bodyGlow: 'rgba(235,79,88,.16)', bodyStart: '#ffffff', bodyEnd: '#dcefff', headerEnd: '#7f1f2d', grid: 'rgba(16,24,38,.035)', panel: 'rgba(255,255,255,.94)', softSurface: '#f6fbff', inputBorder: '#c9dceb', scrollbarTrack: '#e8f3fd', scrollbarThumb: '#98b8d2' },
  },
  {
    id: 'hyperball',
    name: 'Hyperball',
    price: 700,
    colors: { red: '#f2c438', accent: '#f2c438', red600: '#d6a91b', red700: '#9a7610', black: '#08090d', ink: '#171923', ink2: '#282b35', muted: '#706f76', line: '#e7dfc3', paper: '#fafafa', white: '#ffffff', bodyGlow: 'rgba(242,196,56,.18)', bodyStart: '#ffffff', bodyEnd: '#ececec', headerEnd: '#4c3a08', grid: 'rgba(8,9,13,.04)', panel: 'rgba(255,255,255,.94)', softSurface: '#f8f8f6', inputBorder: '#d9d2b6', scrollbarTrack: '#eeeeec', scrollbarThumb: '#cbb86a' },
  },
  {
    id: 'masterball',
    name: 'Masterball',
    price: 1200,
    colors: { red: '#8d4dff', accent: '#f2ecff', red600: '#6e32d4', red700: '#4b2096', black: '#130a22', ink: '#1c1528', ink2: '#332849', muted: '#786f88', line: '#e3d8f6', paper: '#f4efff', white: '#ffffff', bodyGlow: 'rgba(141,77,255,.20)', bodyStart: '#ffffff', bodyEnd: '#eadfff', headerEnd: '#351061', grid: 'rgba(19,10,34,.035)', panel: 'rgba(255,255,255,.94)', softSurface: '#f8f3ff', inputBorder: '#d9c9f4', scrollbarTrack: '#eee6ff', scrollbarThumb: '#b99be8' },
  },
];

const getThemeById = (themeId) => PokeVerseThemes.find((theme) => theme.id === themeId) ?? PokeVerseThemes[0];

const applyPokeVerseTheme = (themeId = localStorage.getItem(POKEVERSE_THEME_STORAGE_KEY) || POKEVERSE_DEFAULT_THEME_ID) => {
  const theme = getThemeById(themeId);
  const root = document.documentElement;
  const cssVars = {
    red: '--red', red600: '--red-600', red700: '--red-700', black: '--black', ink: '--ink', ink2: '--ink-2', muted: '--muted', line: '--line', paper: '--paper', white: '--white', bodyGlow: '--body-glow', bodyStart: '--body-start', bodyEnd: '--body-end', headerEnd: '--header-end', grid: '--grid-line', panel: '--panel-bg', softSurface: '--soft-surface', inputBorder: '--input-border', scrollbarTrack: '--scrollbar-track', scrollbarThumb: '--scrollbar-thumb',
  };
  Object.entries(cssVars).forEach(([key, variable]) => root.style.setProperty(variable, theme.colors[key]));
  document.body?.setAttribute('data-theme', theme.id);
  localStorage.setItem(POKEVERSE_THEME_STORAGE_KEY, theme.id);
  return theme;
};

window.PokeVerseThemes = { themes: PokeVerseThemes, defaultThemeId: POKEVERSE_DEFAULT_THEME_ID, getThemeById, applyTheme: applyPokeVerseTheme };

document.addEventListener('DOMContentLoaded', () => applyPokeVerseTheme());
