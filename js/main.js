window.PokeVerseSpa = true;

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
  {
    id: 'poketype',
    title: 'PokeType',
    description: 'Trouver un type ou un Pokémon.',
    href: 'games/poketype/index.html',
    accent: 'red',
    available: true,
  },
  {
    id: 'pokechain',
    title: 'PokéChain',
    description: 'Répondre aux contraintes cumulées.',
    href: 'games/pokechain/index.html',
    accent: 'red',
    available: true,
  },
  {
    id: 'pokeakinator',
    title: 'Pokinator',
    description: 'Deviner le Pokémon pensé avec des questions.',
    href: 'games/pokeakinator/index.html',
    accent: 'red',
    available: true,
  },
];

const loadedScripts = new Set(Array.from(document.scripts).map((script) => new URL(script.src || window.location.href, window.location.href).href));
const basePath = `${window.location.origin}${window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/') + 1)}`;

const routeInitializers = {
  home: () => renderGames(),
  profile: () => setupProfilePage(),
  medals: () => setupMedalsPage(),
  pokedex: () => window.PokeVersePokedex?.setupPokedex?.(),
  pokedle: () => window.PokeVerseGames?.setupPokedle?.(),
  'quel-est-ce-pokemon': () => window.PokeVerseGames?.setupSilhouetteGame?.(),
  'pokedex-rush': () => window.PokeVerseGames?.setupPokedexRush?.(),
  pokecry: () => window.PokeVerseGames?.setupPokeCryGame?.(),
  poketype: () => window.PokeVerseGames?.setupPokeType?.(),
  pokeakinator: () => window.PokeVerseGames?.setupPokeAkinator?.(),
  pokechain: () => window.PokeVerseGames?.setupPokeChain?.(),
};

const isExternalLink = (link) => {
  const url = new URL(link.href, window.location.href);
  return url.origin !== window.location.origin;
};

const normalizeGameHref = (href) => href;

const toAppUrl = (href) => new URL(href, basePath);

const pageKeyFromPath = (pathname) => {
  if (pathname.endsWith('/profile.html')) return 'profile';
  if (pathname.endsWith('/medals.html')) return 'medals';
  if (pathname.endsWith('/pokedex/') || pathname.endsWith('/pokedex/index.html')) return 'pokedex';
  const game = games.find((entry) => toAppUrl(entry.href).pathname === pathname);
  return game?.id ?? 'home';
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

const filterGames = (query) => {
  const normalizedQuery = query.trim().toLowerCase();
  document.querySelectorAll('[data-game-card]').forEach((card) => {
    const title = card.dataset.gameTitle ?? '';
    card.hidden = normalizedQuery && !title.includes(normalizedQuery);
  });
};

const renderGames = () => {
  const grid = document.querySelector('[data-games-grid]');
  if (!grid) return;
  if (grid.dataset.rendered !== 'true') {
    games.forEach((game) => {
      const card = createGameCard(game, true);
      card.dataset.gameCard = '';
      card.dataset.gameTitle = game.title.toLowerCase();
      grid.appendChild(card);
    });
    grid.dataset.rendered = 'true';
  }
  const search = document.querySelector('[data-games-search]');
  if (search && search.dataset.bound !== 'true') {
    search.addEventListener('input', () => filterGames(search.value));
    search.dataset.bound = 'true';
  }
  if (search) filterGames(search.value);
};

const loadScript = (src) => new Promise((resolve, reject) => {
  const url = new URL(src, window.location.href).href;
  if (loadedScripts.has(url)) {
    resolve();
    return;
  }

  const script = document.createElement('script');
  script.src = url;
  if (!url.endsWith('/js/pokeapi.js')) script.type = 'module';
  script.defer = true;
  script.onload = () => {
    loadedScripts.add(url);
    resolve();
  };
  script.onerror = reject;
  document.body.appendChild(script);
});

const updateNavState = (pageKey) => {
  document.body.dataset.page = pageKey;
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const url = new URL(link.href, basePath);
    const target = pageKeyFromPath(url.pathname);
    const matchesHash = window.location.hash ? url.hash === window.location.hash : !url.hash;
    link.toggleAttribute('aria-current', target === pageKey && matchesHash);
  });
};

const runRouteInitializer = () => {
  const pageKey = document.body.dataset.page || 'home';
  routeInitializers[pageKey]?.();
  updateHeaderProfile();
};

const loadPage = async (url, push = true) => {
  document.body.classList.add('is-loading-route');
  const response = await fetch(url.href, { headers: { 'X-PokeVerse-Navigation': 'spa' } });
  if (!response.ok) throw new Error('Navigation');

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nextMain = doc.querySelector('main');
  if (!nextMain) throw new Error('Navigation');

  document.title = doc.title;
  document.querySelector('main')?.replaceWith(nextMain);
  document.querySelector('meta[name="description"]')?.setAttribute('content', doc.querySelector('meta[name="description"]')?.content ?? '');

  const pageKey = doc.body.dataset.page || pageKeyFromPath(url.pathname);
  updateNavState(pageKey);

  const scriptSources = Array.from(doc.querySelectorAll('script[src]'))
    .map((script) => new URL(script.getAttribute('src'), url).href)
    .filter((src) => !src.endsWith('/js/main.js') && !src.endsWith('/js/playerProgress.js') && !src.endsWith('/js/themes.js'));
  for (const src of scriptSources) await loadScript(src);

  runRouteInitializer();
  if (push) window.history.pushState({}, '', url.href);
  if (url.hash) document.querySelector(url.hash)?.scrollIntoView();
  else window.scrollTo({ top: 0 });
  document.body.classList.remove('is-loading-route');
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

    const destination = new URL(link.getAttribute('href'), basePath);
    const current = new URL(window.location.href);
    const isSamePageAnchor = destination.pathname === current.pathname && destination.hash;

    nav?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');

    if (isSamePageAnchor) return;
    event.preventDefault();
    loadPage(destination).catch(() => { window.location.href = destination.href; });
  });

  window.addEventListener('popstate', () => {
    loadPage(new URL(window.location.href), false).catch(() => window.location.reload());
  });
};

window.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  updateNavState(document.body.dataset.page || pageKeyFromPath(window.location.pathname));
  runRouteInitializer();
  document.body.classList.add('is-loaded');
});
