const POKEVERSE_THEME_STORAGE_KEY = 'pokeverse:active-theme:v1';
const POKEVERSE_DEFAULT_THEME_ID = 'base-light';

const PokeVerseThemes = [
  {
    id: 'base-light',
    name: 'Clair',
    price: 0,
    colors: {
      red: '#d90429', red600: '#b80020', red700: '#8f0018', black: '#08090d', ink: '#171923', ink2: '#2a2d38', muted: '#717480', line: '#e2e4ea', paper: '#f4f5f8', white: '#ffffff', bodyGlow: 'rgba(217, 4, 41, .12)', bodyStart: '#ffffff', bodyEnd: '#e9ebf1', headerEnd: '#250009', grid: 'rgba(8, 9, 13, .035)', panel: 'rgba(255,255,255,.92)', softSurface: '#f7f8fb', inputBorder: '#d5d8e1', scrollbarTrack: '#eceef4', scrollbarThumb: '#b9bdc9',
    },
  },
  {
    id: 'base-dark',
    name: 'Sombre',
    price: 0,
    colors: {
      red: '#ff3b55', red600: '#d90429', red700: '#a3001c', black: '#050609', ink: '#f4f6fb', ink2: '#d8dce7', muted: '#aeb5c4', line: '#293040', paper: '#121722', white: '#1b2230', bodyGlow: 'rgba(255, 59, 85, .16)', bodyStart: '#090c13', bodyEnd: '#161c28', headerEnd: '#33000b', grid: 'rgba(255,255,255,.045)', panel: 'rgba(22,28,40,.94)', softSurface: '#202838', inputBorder: '#3a4356', scrollbarTrack: '#151b26', scrollbarThumb: '#475166',
    },
  },
  {
    id: 'pokeball',
    name: 'Pokéball',
    price: 250,
    colors: { red: '#e31937', red600: '#c9102c', red700: '#8f0018', black: '#08090d', ink: '#171923', ink2: '#2a2d38', muted: '#717480', line: '#e5e5e8', paper: '#f7f7f9', white: '#ffffff', bodyGlow: 'rgba(227,25,55,.15)', bodyStart: '#ffffff', bodyEnd: '#eceef4', headerEnd: '#2b0008', grid: 'rgba(8,9,13,.035)', panel: 'rgba(255,255,255,.94)', softSurface: '#f8f8fa', inputBorder: '#d7d9df', scrollbarTrack: '#eceef4', scrollbarThumb: '#b9bdc9' },
  },
  {
    id: 'superball',
    name: 'Superball',
    price: 450,
    colors: { red: '#2f6dff', red600: '#1e52d8', red700: '#173b99', black: '#081027', ink: '#111827', ink2: '#243044', muted: '#687386', line: '#dbe4f7', paper: '#edf4ff', white: '#ffffff', bodyGlow: 'rgba(47,109,255,.18)', bodyStart: '#ffffff', bodyEnd: '#dfeaff', headerEnd: '#0d2c75', grid: 'rgba(8,16,39,.035)', panel: 'rgba(255,255,255,.94)', softSurface: '#f2f7ff', inputBorder: '#ccdaf5', scrollbarTrack: '#e7efff', scrollbarThumb: '#9fb4e4' },
  },
  {
    id: 'hyperball',
    name: 'Hyperball',
    price: 700,
    colors: { red: '#f4c430', red600: '#d9a90f', red700: '#9a7400', black: '#08090d', ink: '#171923', ink2: '#282b35', muted: '#706f76', line: '#eee4c1', paper: '#fbf5df', white: '#ffffff', bodyGlow: 'rgba(244,196,48,.22)', bodyStart: '#ffffff', bodyEnd: '#f3ead0', headerEnd: '#3a2a00', grid: 'rgba(8,9,13,.04)', panel: 'rgba(255,255,255,.94)', softSurface: '#fff9e8', inputBorder: '#e2d6ab', scrollbarTrack: '#f4ecd5', scrollbarThumb: '#ccb873' },
  },
  {
    id: 'masterball',
    name: 'Masterball',
    price: 1200,
    colors: { red: '#8d4dff', red600: '#6e32d4', red700: '#4b2096', black: '#130a22', ink: '#1c1528', ink2: '#332849', muted: '#786f88', line: '#e3d8f6', paper: '#f4efff', white: '#ffffff', bodyGlow: 'rgba(141,77,255,.20)', bodyStart: '#ffffff', bodyEnd: '#eadfff', headerEnd: '#351061', grid: 'rgba(19,10,34,.035)', panel: 'rgba(255,255,255,.94)', softSurface: '#f8f3ff', inputBorder: '#d9c9f4', scrollbarTrack: '#eee6ff', scrollbarThumb: '#b99be8' },
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
