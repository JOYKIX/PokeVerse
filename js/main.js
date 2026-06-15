const games = [
  {
    id: 'pokedle',
    title: 'Pokedle',
    href: 'games/pokedle/index.html',
    accent: 'red',
    available: true,
  },
  {
    id: 'pokedex',
    title: 'Pokedex',
    href: '#games',
    accent: 'black',
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
  document.body.classList.add('is-loaded');
});
