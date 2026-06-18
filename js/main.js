const games = [
  {
    id: 'pokedle',
    title: 'Pokedle',
    description: 'Trouver le Pokémon secret avec les indices.',
    href: 'games/pokedle/index.html',
    accent: 'red',
    available: true,
  },
  {
    id: 'quel-est-ce-pokemon',
    title: 'Quel est ce Pokémon ?',
    description: 'Identifier le Pokémon à partir de sa silhouette.',
    href: 'games/quel-est-ce-pokemon/index.html',
    accent: 'red',
    available: true,
  },
  {
    id: 'pokedex-rush',
    title: 'Pokédex Rush',
    description: 'Compléter un Pokédex le plus rapidement possible.',
    href: 'games/pokedex-rush/index.html',
    accent: 'red',
    available: true,
  },
  {
    id: 'pokecry',
    title: 'PokeCry',
    description: 'Deviner le cri du Pokémon.',
    href: 'games/pokecry/index.html',
    accent: 'red',
    available: true,
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
  const action = game.available
    ? `<a href="${normalizeGameHref(game.href)}" data-nav-link>Jouer</a>`
    : '<span>Indisponible</span>';

  article.innerHTML = `
    <h3>${game.title}</h3>
    <p>${game.description}</p>
    <div class="card-footer">
      ${action}
    </div>
  `;
  return article;
};

const renderGames = () => {
  const grid = document.querySelector('[data-games-grid]');

  if (grid) games.forEach((game) => grid.appendChild(createGameCard(game, true)));
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
  setupNavigation();
  updateHeaderProfile();
  setupProfilePage();
  setupMedalsPage();
  document.body.classList.add('is-loaded');
});
