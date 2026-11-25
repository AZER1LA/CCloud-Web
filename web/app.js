(() => {
  'use strict';

  // This public client uses the same catalog API as the Android app.
  // API_HOST is configurable if an authorized proxy is later deployed.
  const API_BASE = 'https://server-hi-speed-iran.info/api';
  const API_KEY = '4F5A9C3D9A86FA54EACEDDD635185';
  const PAGE_SIZE = 20;
  const state = { view: 'home', kind: 'all', genre: 0, sort: 'created', page: 0, items: [], genres: [], query: '', loading: false, favorites: new Set(readFavorites()) };
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#title-grid');
  const status = $('#status');
  const loadMore = $('#load-more');

  function readFavorites() {
    try { return JSON.parse(localStorage.getItem('ccloud-favorites') || '[]'); } catch { return []; }
  }
  function saveFavorites() { localStorage.setItem('ccloud-favorites', JSON.stringify([...state.favorites])); }
  function safeText(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function imageUrl(item) { return item.image || item.cover || ''; }
  function apiError(error) {
    console.error('CCloud catalog request failed:', error);
    status.innerHTML = `<div class="empty-state"><strong>We couldn’t load the catalog.</strong><span>Chrome could not complete the API request. This is usually a CORS or network issue.</span><br><button class="load-more" id="retry-button">Try again</button></div>`;
    $('#retry-button')?.addEventListener('click', () => loadCatalog(true));
  }
  async function request(url) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('API request failed:', url, error);
      throw error;
    }
  }
  function getKind(item) { return String(item.type || '').toLowerCase().includes('serie') ? 'serie' : 'movie'; }
  function currentCollection() {
    const q = state.query.trim().toLowerCase();
    return state.items.filter((item) => {
      if (state.kind !== 'all' && getKind(item) !== state.kind) return false;
      if (state.view === 'movies' && getKind(item) !== 'movie') return false;
      if (state.view === 'series' && getKind(item) !== 'serie') return false;
      if (state.view === 'favorites' && !state.favorites.has(`${getKind(item)}:${item.id}`)) return false;
      if (state.genre && !(item.genres || []).some((genre) => Number(genre.id) === Number(state.genre))) return false;
      if (q && !`${item.title} ${(item.genres || []).map((genre) => genre.title).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function renderCards() {
    const items = currentCollection();
    grid.innerHTML = '';
    if (!items.length && !state.loading) {
      const message = state.view === 'favorites' ? 'Your list is waiting.' : state.query ? 'No titles match your search.' : 'No titles found.';
      grid.innerHTML = `<div class="empty-state"><strong>${message}</strong>${state.view === 'favorites' ? 'Tap the heart on a title to save it here.' : 'Try a different filter or search.'}</div>`;
    }
    items.forEach((item, index) => {
      const kind = getKind(item), key = `${kind}:${item.id}`, image = imageUrl(item);
      const card = document.createElement('article');
      card.className = 'movie-card';
      card.style.animationDelay = `${Math.min(index, 12) * 28}ms`;
      card.innerHTML = `<div class="poster-wrap">${image ? `<img class="poster-image" src="${safeText(image)}" alt="${safeText(item.title)} poster" loading="lazy">` : `<div class="poster-placeholder">${safeText(item.title)}</div>`}<span class="poster-tag">${kind === 'serie' ? 'Series' : 'Movie'}</span><span class="rating">★ ${Number(item.imdb || 0).toFixed(1)}</span><button class="favorite-button ${state.favorites.has(key) ? 'saved' : ''}" aria-label="${state.favorites.has(key) ? 'Remove from' : 'Add to'} favorites" title="My list">♥</button></div><div class="card-details"><h3 class="card-title">${safeText(item.title || 'Untitled')}</h3><div class="card-meta"><span>${safeText(item.year || '—')}</span><span class="dot"></span><span>${safeText((item.genres || [])[0]?.title || (kind === 'serie' ? 'Series' : 'Movie'))}</span></div></div>`;
      card.querySelector('.poster-image')?.addEventListener('error', (event) => { event.currentTarget.replaceWith(Object.assign(document.createElement('div'), { className: 'poster-placeholder', textContent: item.title || 'CCloud' })); });
      card.querySelector('.favorite-button').addEventListener('click', (event) => { event.stopPropagation(); toggleFavorite(item); });
      card.addEventListener('click', () => openDetails(item));
      grid.append(card);
    });
    loadMore.hidden = state.view === 'favorites' || Boolean(state.query) || items.length === 0 || state.items.length < (state.page + 1) * PAGE_SIZE;
  }
  function renderGenres() {
    const list = $('#genre-list');
    list.innerHTML = '';
    if (!state.genres.length) return;
    const all = document.createElement('button'); all.className = `genre-chip ${state.genre === 0 ? 'active' : ''}`; all.textContent = 'All genres'; all.addEventListener('click', () => { state.genre = 0; renderGenres(); renderCards(); }); list.append(all);
    state.genres.forEach((genre) => { const button = document.createElement('button'); button.className = `genre-chip ${Number(state.genre) === Number(genre.id) ? 'active' : ''}`; button.textContent = genre.title; button.addEventListener('click', () => { state.genre = Number(genre.id); renderGenres(); renderCards(); }); list.append(button); });
  }
  function updateHeading() {
    const headings = { home: ['A WORLD OF STORIES', 'Popular right now'], movies: ['THE BIG SCREEN', 'Movies'], series: ['YOUR NEXT OBSESSION', 'Series'], favorites: ['SAVED FOR LATER', 'My list'] };
    const [kicker, title] = headings[state.view];
    $('#section-kicker').textContent = state.query ? 'SEARCH RESULTS' : kicker;
    $('#section-title').textContent = state.query ? `Results for “${state.query}”` : title;
    document.querySelectorAll('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === state.view));
  }
  async function loadCatalog(reset = false) {
    if (state.loading) return;
    if (reset) { state.page = 0; state.items = []; grid.innerHTML = ''; }
    state.loading = true; status.textContent = state.items.length ? 'Loading more titles…' : 'Finding something good…'; loadMore.disabled = true;
    try {
      const sort = state.sort === 'created' ? 'created' : state.sort;
      const url = `${API_BASE}/${state.kind === 'serie' ? 'serie' : 'movie'}/by/filtres/${state.genre}/${sort}/${state.page}/${API_KEY}/`;
      const pageItems = await request(url);
      if (!Array.isArray(pageItems)) throw new Error('Unexpected catalog response');
      const seen = new Set(state.items.map((item) => `${item.type}:${item.id}`));
      state.items.push(...pageItems.filter((item) => !seen.has(`${item.type}:${item.id}`)));
      state.page += 1;
      status.textContent = '';
      renderCards();
    } catch (error) { apiError(error); }
    finally { state.loading = false; loadMore.disabled = false; }
  }
  async function loadGenres() {
    try { const result = await request(`${API_BASE}/genre/all/${API_KEY}/`); state.genres = Array.isArray(result) ? result : []; renderGenres(); } catch (error) { console.warn('Genres unavailable:', error); }
  }
  async function searchTitles(query) {
    const normalized = query.trim();
    state.query = normalized;
    updateHeading();
    if (!normalized) { state.page = 0; state.items = []; await loadCatalog(true); return; }
    state.loading = true; status.textContent = 'Searching…'; grid.innerHTML = '';
    try {
      const result = await request(`${API_BASE}/search/${encodeURIComponent(normalized).replace(/%20/g, '%20')}/${API_KEY}/`);
      const posters = Array.isArray(result?.posters) ? result.posters : [];
      state.items = posters; state.page = 0; status.textContent = ''; renderCards(); loadMore.hidden = true;
    } catch (error) { apiError(error); }
    finally { state.loading = false; }
  }
  function toggleFavorite(item) {
    const key = `${getKind(item)}:${item.id}`;
    if (state.favorites.has(key)) state.favorites.delete(key); else state.favorites.add(key);
    saveFavorites(); renderCards();
  }
  function openDetails(item) {
    const dialog = $('#detail-dialog'), kind = getKind(item), backdrop = item.cover || imageUrl(item);
    $('#detail-content').innerHTML = `<div class="detail-backdrop" style="background-image:url('${safeText(backdrop)}')"></div><div class="detail-body"><p class="eyebrow">${kind === 'serie' ? 'SERIES' : 'FEATURED FILM'} · ${safeText(item.type || '')}</p><h2>${safeText(item.title || 'Untitled')}</h2><div class="detail-meta"><span>${safeText(item.year || '—')}</span><span>·</span><span class="gold">★ ${Number(item.imdb || 0).toFixed(1)} IMDb</span>${item.duration ? `<span>·</span><span>${safeText(item.duration)}</span>` : ''}</div><p class="detail-description">${safeText(item.description || 'No description available.')}</p><div class="detail-genres">${(item.genres || []).map((genre) => `<span>${safeText(genre.title)}</span>`).join('')}</div><div class="detail-actions">${kind === 'movie' ? '<button id="play-title" class="button button-primary">▶ &nbsp; Watch now</button>' : ''}<button id="detail-favorite" class="button button-quiet">♥ &nbsp; ${state.favorites.has(`${kind}:${item.id}`) ? 'In my list' : 'Add to my list'}</button></div><div id="season-list" class="seasons"></div></div>`;
    $('#detail-favorite').addEventListener('click', () => { toggleFavorite(item); $('#detail-favorite').textContent = state.favorites.has(`${kind}:${item.id}`) ? '♥  In my list' : '♥  Add to my list'; });
    $('#play-title')?.addEventListener('click', () => openPlayer(item.title, item.sources || []));
    dialog.showModal();
    if (kind === 'serie') loadSeasons(item.id);
  }
  async function loadSeasons(seriesId) {
    const container = $('#season-list'); container.innerHTML = '<p class="status">Loading episodes…</p>';
    try {
      const seasons = await request(`${API_BASE}/season/by/serie/${seriesId}/${API_KEY}/`);
      container.innerHTML = '';
      if (!Array.isArray(seasons) || !seasons.length) { container.innerHTML = '<p class="status">No episodes are available.</p>'; return; }
      seasons.forEach((season, index) => {
        const details = document.createElement('details'); details.className = 'season'; details.open = index === 0;
        details.innerHTML = `<summary>${safeText(season.title || `Season ${index + 1}`)} <span class="card-meta"> · ${(season.episodes || []).length} episodes</span></summary>${(season.episodes || []).map((episode, episodeIndex) => `<div class="episode"><img class="episode-image" src="${safeText(episode.image || '')}" alt="" loading="lazy"><div class="episode-copy"><strong>${safeText(episode.title || `Episode ${episodeIndex + 1}`)}</strong><p>${safeText(episode.duration || '')}</p></div><button data-episode="${episodeIndex}" data-season="${index}">▶ Play</button></div>`).join('')}`;
        details.querySelectorAll('[data-episode]').forEach((button) => button.addEventListener('click', () => { const episode = season.episodes[Number(button.dataset.episode)]; openPlayer(`${season.title} · ${episode.title}`, episode.sources || []); }));
        container.append(details);
      });
    } catch (error) { console.error(error); container.innerHTML = '<p class="status">Episodes could not be loaded. Please try again later.</p>'; }
  }
  function openPlayer(title, sources) {
    const dialog = $('#player-dialog'), video = $('#video-player'), list = $('#source-list');
    $('#player-title').textContent = title || 'Now playing';
    list.innerHTML = '';
    video.pause(); video.removeAttribute('src'); video.load(); $('#player-placeholder').classList.remove('hidden');
    const validSources = (sources || []).filter((source) => source.url && /^https?:\/\//i.test(source.url));
    if (!validSources.length) list.innerHTML = '<span class="card-meta">No playable sources are listed for this title.</span>';
    validSources.forEach((source, index) => {
      const button = document.createElement('button'); button.className = `source-button ${index === 0 ? 'active' : ''}`; button.textContent = source.quality || source.type || `Source ${index + 1}`;
      button.addEventListener('click', () => {
        list.querySelectorAll('.source-button').forEach((item) => item.classList.remove('active')); button.classList.add('active');
        video.src = source.url; video.load(); $('#player-placeholder').classList.add('hidden');
        video.play().catch(() => { $('#player-placeholder').classList.remove('hidden'); });
      });
      list.append(button);
    });
    if (!$('#detail-dialog').open) dialog.showModal(); else { $('#detail-dialog').close(); dialog.showModal(); }
  }

  document.querySelectorAll('.nav-link').forEach((button) => button.addEventListener('click', () => {
    state.view = button.dataset.view; state.query = ''; $('#search-input').value = ''; state.kind = state.view === 'series' ? 'serie' : 'all'; state.genre = 0; updateHeading();
    if (state.view !== 'favorites' && state.items.length < PAGE_SIZE) loadCatalog(true); else renderCards();
    $('#catalog').scrollIntoView({ behavior: 'smooth' });
  }));
  document.querySelectorAll('.filter-chip').forEach((button) => button.addEventListener('click', () => {
    state.kind = button.dataset.kind; state.genre = 0; document.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('active', chip === button)); loadCatalog(true);
  }));
  $('#sort-select').addEventListener('change', (event) => { state.sort = event.target.value; loadCatalog(true); });
  loadMore.addEventListener('click', () => loadCatalog(false));
  $('#search-input').addEventListener('input', (event) => {
    clearTimeout(window.searchTimer); window.searchTimer = setTimeout(() => event.target.value.trim() ? searchTitles(event.target.value) : state.query && searchTitles(''), 350);
  });
  document.addEventListener('keydown', (event) => { if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search-input').focus(); } });
  $('#mobile-search').addEventListener('click', () => { $('#search-input').style.width = '200px'; $('#search-input').style.display = 'block'; $('#search-input').focus(); });
  $('#explore-button').addEventListener('click', () => $('#catalog').scrollIntoView({ behavior: 'smooth' }));
  $('#feature-explore').addEventListener('click', () => $('#catalog').scrollIntoView({ behavior: 'smooth' }));
  $('#hero-info').addEventListener('click', () => $('#notice-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  [$('#detail-dialog'), $('#player-dialog'), $('#notice-dialog')].forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
  $('#player-dialog').addEventListener('close', () => { const video = $('#video-player'); video.pause(); video.removeAttribute('src'); video.load(); });
  updateHeading(); renderCards(); loadGenres(); loadCatalog(true);
})();
