// Show the Letterboxd official lists that include the film on a film page.
(() => {
  // Run only on the main film page, not on sub-pages such as /reviews/.
  const slug = location.pathname.match(/^\/film\/([^/]+)\/?$/)?.[1];
  if (!slug || document.querySelector('.lbol-panel')) return;

  const OWNER = 'official';
  const CACHE_PREFIX = 'lists:';
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const MAX_PAGES = 10;
  // Hide lists whose title contains one of these phrases. Matches start at a word boundary and ignore case.
  const BLOCKED_PHRASES = ['pronoun', 'as of', 'most fans'];
  const blockedPattern = new RegExp(
    `\\b(${BLOCKED_PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'i',
  );
  const cacheKey = CACHE_PREFIX + slug;
  const listsUrl = `/${OWNER}/film/${slug}/lists/by/popular/`;

  function el(tag, props = {}, children = []) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children.filter(Boolean));
    return node;
  }

  function parseLists(doc) {
    // The URL already filters by owner. Check data-person again in case Letterboxd changes the page.
    const articles = doc.querySelectorAll(`article.list-summary[data-person="${OWNER}"]`);
    return [...articles].flatMap((article) => {
      const link = article.querySelector('h2.name a');
      const href = link?.getAttribute('href') ?? '';
      // Accept only site-relative paths. This blocks other hosts and "javascript:" links.
      if (!/^\/(?!\/)/.test(href)) return [];
      return [{ title: link.textContent.trim(), href }];
    });
  }

  async function fetchOfficialLists() {
    const lists = [];
    let url = listsUrl;
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      lists.push(...parseLists(doc));
      url = doc.querySelector('.pagination a.next')?.getAttribute('href');
    }
    return lists;
  }

  async function saveToCache(lists) {
    // Remove expired entries so that storage does not grow without limit.
    const now = Date.now();
    const all = await chrome.storage.local.get(null);
    const expired = Object.keys(all).filter(
      (key) => key.startsWith(CACHE_PREFIX) && now - all[key].time >= CACHE_TTL_MS,
    );
    if (expired.length) await chrome.storage.local.remove(expired);
    await chrome.storage.local.set({ [cacheKey]: { time: now, lists } });
  }

  async function getLists() {
    const { [cacheKey]: cached } = await chrome.storage.local.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.lists;
    const lists = await fetchOfficialLists();
    // A cache failure must not hide lists that loaded correctly.
    saveToCache(lists).catch((err) => console.warn('[Letterboxd Official Lists] cache', err));
    return lists;
  }

  function renderLists(lists) {
    if (lists.length === 0) {
      return el('p', { className: 'lbol-empty', textContent: 'Not in any official lists.' });
    }
    const items = lists.map(({ title, href }) =>
      el('li', {}, [el('a', { href, textContent: title })]),
    );
    return el('ul', { className: 'lbol-list' }, items);
  }

  // Reuse the "Where to watch" panel classes so that both panels look the same.
  const body = el('div', { className: 'lbol-body', textContent: 'Loading…' });
  const panel = el('section', { className: 'watch-panel lbol-panel' }, [
    el('div', { className: 'header' }, [
      el('h3', { className: 'title' }, [el('a', { href: listsUrl, textContent: 'Official lists' })]),
    ]),
    body,
  ]);

  // Letterboxd replaces the availability container after load. Put the panel after the
  // container, not in it, so that the replacement does not remove the panel.
  const anchor = document.querySelector('#js-poster-col .csi[data-src*="/availability/"], .watch-panel');
  const column = document.querySelector('#js-poster-col, aside.sidebar');
  if (anchor) anchor.after(panel);
  else if (column) column.append(panel);
  else return;

  getLists()
    // Filter after the cache, so that a change to BLOCKED_PHRASES applies at once.
    .then((lists) => body.replaceChildren(renderLists(lists.filter((l) => !blockedPattern.test(l.title)))))
    .catch((err) => {
      console.warn('[Letterboxd Official Lists]', err);
      body.replaceChildren(
        el('p', { className: 'lbol-empty' }, [
          'Could not load. ',
          el('a', { href: listsUrl, textContent: 'Open the lists page' }),
        ]),
      );
    });
})();
