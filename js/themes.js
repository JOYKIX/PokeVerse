const POKEVERSE_THEME_STORAGE_KEY = 'pokeverse:active-theme:v2';
const POKEVERSE_DEFAULT_THEME_ID = 'pokeball-light';

const createTheme = ({ id, name, price, primary, accent, dark, surfaceTint = primary }) => ({
  id,
  name,
  price,
  colors: dark
    ? {
      primary, accent, primary600: primary, primary700: '#050816', black: '#050816', ink: '#f5f7ff', ink2: '#dbe2f4', muted: '#9ca8c1', line: 'rgba(255,255,255,.12)', paper: '#090d18', white: '#111827', bodyGlow: `${surfaceTint}33`, bodyStart: '#050816', bodyEnd: '#0d1324', headerEnd: `${primary}33`, grid: 'rgba(255,255,255,.055)', panel: 'rgba(13,19,36,.78)', softSurface: 'rgba(255,255,255,.06)', inputBorder: 'rgba(255,255,255,.16)', scrollbarTrack: '#0d1324', scrollbarThumb: primary,
    }
    : {
      primary, accent, primary600: primary, primary700: '#172033', black: '#101522', ink: '#111827', ink2: '#293247', muted: '#667085', line: 'rgba(16,21,34,.11)', paper: '#f4f7fb', white: '#ffffff', bodyGlow: `${surfaceTint}26`, bodyStart: '#fbfcff', bodyEnd: '#e9eef8', headerEnd: `${primary}26`, grid: 'rgba(16,21,34,.04)', panel: 'rgba(255,255,255,.82)', softSurface: 'rgba(16,21,34,.045)', inputBorder: 'rgba(16,21,34,.16)', scrollbarTrack: '#e9eef8', scrollbarThumb: primary,
    },
});

const PokeVerseThemes = [
  createTheme({ id: 'pokeball-light', name: 'Poké Ball Light', price: 0, primary: '#e43d4f', accent: '#151a28', surfaceTint: '#e43d4f' }),
  createTheme({ id: 'pokeball-dark', name: 'Poké Ball Dark', price: 0, primary: '#ff5165', accent: '#f8fafc', dark: true, surfaceTint: '#ff5165' }),
  createTheme({ id: 'superball-light', name: 'Super Ball Light', price: 450, primary: '#2f80ed', accent: '#ef476f', surfaceTint: '#2f80ed' }),
  createTheme({ id: 'superball-dark', name: 'Super Ball Dark', price: 450, primary: '#56a3ff', accent: '#ff6b8a', dark: true, surfaceTint: '#2f80ed' }),
  createTheme({ id: 'hyperball-light', name: 'Hyper Ball Light', price: 700, primary: '#f1b82d', accent: '#171a21', surfaceTint: '#f1b82d' }),
  createTheme({ id: 'hyperball-dark', name: 'Hyper Ball Dark', price: 700, primary: '#ffd166', accent: '#f8fafc', dark: true, surfaceTint: '#f1b82d' }),
  createTheme({ id: 'masterball-light', name: 'Master Ball Light', price: 1200, primary: '#8b5cf6', accent: '#ec4899', surfaceTint: '#8b5cf6' }),
  createTheme({ id: 'masterball-dark', name: 'Master Ball Dark', price: 1200, primary: '#a78bfa', accent: '#f472b6', dark: true, surfaceTint: '#8b5cf6' }),
];

const LEGACY_THEME_MAP = { pokeball: 'pokeball-light', superball: 'superball-light', hyperball: 'hyperball-light', masterball: 'masterball-light' };
const getThemeById = (themeId) => PokeVerseThemes.find((theme) => theme.id === (LEGACY_THEME_MAP[themeId] ?? themeId)) ?? PokeVerseThemes[0];

const applyPokeVerseTheme = (themeId = localStorage.getItem(POKEVERSE_THEME_STORAGE_KEY) || localStorage.getItem('pokeverse:active-theme:v1') || POKEVERSE_DEFAULT_THEME_ID) => {
  const theme = getThemeById(themeId);
  const root = document.documentElement;
  const cssVars = {
    primary: '--primary', accent: '--accent', primary600: '--primary-600', primary700: '--primary-700', black: '--black', ink: '--ink', ink2: '--ink-2', muted: '--muted', line: '--line', paper: '--paper', white: '--white', bodyGlow: '--body-glow', bodyStart: '--body-start', bodyEnd: '--body-end', headerEnd: '--header-end', grid: '--grid-line', panel: '--panel-bg', softSurface: '--soft-surface', inputBorder: '--input-border', scrollbarTrack: '--scrollbar-track', scrollbarThumb: '--scrollbar-thumb',
  };
  Object.entries(cssVars).forEach(([key, variable]) => root.style.setProperty(variable, theme.colors[key]));
  root.style.setProperty('--red', theme.colors.primary);
  root.style.setProperty('--red-600', theme.colors.primary600);
  root.style.setProperty('--red-700', theme.colors.primary700);
  document.body?.setAttribute('data-theme', theme.id);
  localStorage.setItem(POKEVERSE_THEME_STORAGE_KEY, theme.id);
  return theme;
};

window.PokeVerseThemes = { themes: PokeVerseThemes, defaultThemeId: POKEVERSE_DEFAULT_THEME_ID, getThemeById, applyTheme: applyPokeVerseTheme };
document.addEventListener('DOMContentLoaded', () => applyPokeVerseTheme());
