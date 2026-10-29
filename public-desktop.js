/* Desktop-only enhancements. Deliberately no-op below 1024px. */
(() => {
  'use strict';
  if (!window.matchMedia('(min-width: 1024px)').matches) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const overlay = $('#detailOverlay');
  const dialog = $('#detailDialog');
  let palette = null;
  let lastDeepLink = '';
  let tintRun = 0;

  function focusSearch() {
    const input = $('.search input, #search');
    if (input) { input.focus(); input.select?.(); }
  }

  function closePalette() {
    if (!palette) return;
    palette.remove();
    palette = null;
  }

  function openPalette() {
    if (palette) { $('.desktop-palette input', palette)?.focus(); return; }
    const backdrop = document.createElement('div');
    backdrop.className = 'desktop-palette-backdrop';
    backdrop.innerHTML = '<section class="desktop-palette" role="dialog" aria-modal="true" aria-label="Command palette"><input type="search" aria-label="Search commands" placeholder="Search songs or run a command…" autocomplete="off"><div class="desktop-palette-list" role="listbox"></div><div class="desktop-palette-hint">↑ ↓ to navigate · Enter to open · Esc to close</div></section>';
    document.body.append(backdrop);
    palette = backdrop;
    const input = $('.desktop-palette input', backdrop);
    const list = $('.desktop-palette-list', backdrop);
    const commands = [
      { label: 'Search songs', detail: 'Focus the song search', icon: '⌕', run: focusSearch, keywords: 'search find songs library' },
      { label: 'Open admin', detail: 'Review submissions', icon: '⚙', run: () => { location.href = 'admin.html'; }, keywords: 'admin review queue' },
      { label: 'Toggle theme', detail: 'Switch light or dark mode', icon: '◐', run: () => $('#themeBtn')?.click(), keywords: 'theme dark light appearance' }
    ];
    let active = 0;
    function renderCommands() {
      const q = input.value.trim().toLocaleLowerCase();
      const filtered = commands.filter(c => (c.label + ' ' + c.detail + ' ' + c.keywords).toLocaleLowerCase().includes(q));
      list.innerHTML = filtered.map((c, i) => '<button type="button" role="option" aria-selected="'+(i===active)+'" class="desktop-palette-item" data-command="'+i+'"><span aria-hidden="true">'+c.icon+'</span><span>'+c.label+'<small style="display:block;color:var(--muted);font-size:11px">'+c.detail+'</small></span><kbd>↵</kbd></button>').join('') || '<p style="padding:12px 14px;color:var(--muted)">No matching commands.</p>';
      all('[data-command]', list).forEach((b, i) => b.addEventListener('click', () => { const cmd = filtered[i]; closePalette(); cmd?.run(); }));
      active = Math.min(active, Math.max(0, filtered.length - 1));
    }
    input.addEventListener('input', () => { active = 0; renderCommands(); });
    backdrop.addEventListener('keydown', e => {
      const buttons = all('[data-command]', list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!buttons.length) { input.focus(); return; }
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons.forEach((button, i) => button.setAttribute('aria-selected', String(i === active)));
        buttons[active]?.focus();
      } else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      else if (e.key === 'Enter' && e.target === input && buttons.length) { e.preventDefault(); buttons[active]?.click(); }
      else if (e.key === 'Tab') { e.preventDefault(); (buttons[active] || input).focus(); }
    });
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closePalette(); });
    renderCommands();
    input.focus();
  }

  function openSongFromHash() {
    const raw = decodeURIComponent(location.hash.slice(1));
    const id = raw.startsWith('song-') ? raw.slice(5) : raw;
    if (!id || id === lastDeepLink) return;
    const card = all('#notesGrid .note').find(n => String(n.dataset.id) === id);
    if (!card) return;
    lastDeepLink = id;
    const target = $('[data-open]', card);
    if (target) target.click();
  }

  function timestampSeconds(value) {
    const parts = String(value || '').trim().split(':').map(v => Number(v));
    if (!parts.length || parts.some(v => !Number.isFinite(v) || v < 0)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  function arrangeDetail() {
    if (!dialog || !dialog.classList.contains('show') && !overlay?.classList.contains('show')) return;
    const body = $('.dialog-body', dialog);
    if (!body || $('.desktop-detail-layout', dialog)) return;
    const video = $('.dialog-video', body);
    const layout = document.createElement('div');
    layout.className = 'desktop-detail-layout';
    const media = document.createElement('div');
    media.className = 'desktop-detail-media';
    const copy = document.createElement('div');
    copy.className = 'desktop-detail-copy';
    if (video) media.append(video);
    else {
      const fallback = document.createElement('div');
      fallback.className = 'desktop-media-fallback';
      fallback.setAttribute('aria-hidden', 'true');
      fallback.textContent = '♫';
      media.append(fallback);
    }
    Array.from(body.childNodes).forEach(node => { if (node !== video) copy.append(node); });
    layout.append(copy, media);
    body.replaceWith(layout);
    const moment = $('.moment-section', copy);
    if (moment && !$('a', moment)) {
      const label = $('label', moment);
      const value = Array.from(moment.childNodes).filter(n => n !== label).map(n => n.textContent).join('').trim();
      const seconds = timestampSeconds(value);
      const videoId = video?.dataset.inlinePlay;
      if (seconds !== null && videoId) {
        moment.replaceChildren();
        if (label) moment.append(label);
        const link = document.createElement('a');
        link.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId) + '&t=' + seconds + 's';
        link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = value;
        moment.append(link);
      }
    }
  }

  function sampleTint(imageUrl, element) {
    if (!imageUrl || !element || element.dataset.tintDone === '1') return;
    element.dataset.tintDone = '1';
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 12;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, 12, 12);
        const data = ctx.getImageData(0, 0, 12, 12).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 100) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
        if (!count) return;
        element.style.setProperty('--note-tint', 'rgb(' + Math.round(r/count) + ' ' + Math.round(g/count) + ' ' + Math.round(b/count) + ')');
      } catch (_) { /* Cross-origin thumbnails fall back to the card's safe CSS tint. */ }
    };
    image.onerror = () => { /* Safe fallback tint remains in CSS. */ };
    image.src = imageUrl;
  }

  function tintCards() {
    const run = ++tintRun;
    all('#notesGrid .note').forEach(card => {
      const match = String(getComputedStyle(card).getPropertyValue('--thumb-image')).match(/url\(["']?(.*?)["']?\)/);
      const imageUrl = match?.[1];
      if (imageUrl) sampleTint(imageUrl, card);
    });
    if (run !== tintRun) return;
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); openPalette();
    } else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault(); focusSearch();
    } else if (e.key === 'Escape') {
      closePalette();
    }
  });
  document.addEventListener('click', e => {
    const note = e.target.closest('#notesGrid [data-open]');
    if (note) {
      const card = note.closest('.note');
      if (card?.dataset.id) {
        history.replaceState(null, '', '#song-' + encodeURIComponent(card.dataset.id));
        lastDeepLink = card.dataset.id;
      }
    }
    if (e.target.closest('#closeDetail') || e.target === overlay) {
      if (location.hash.startsWith('#song-')) history.replaceState(null, '', location.pathname + location.search);
      lastDeepLink = '';
    }
  }, true);

  if (dialog && overlay) {
    const detailObserver = new MutationObserver(() => {
      if (overlay.classList.contains('show')) arrangeDetail();
      else if (location.hash.startsWith('#song-')) history.replaceState(null, '', location.pathname + location.search);
    });
    detailObserver.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    detailObserver.observe(dialog, { childList: true });
  }
  const grid = $('#notesGrid');
  if (grid) {
    const gridObserver = new MutationObserver(() => { tintCards(); openSongFromHash(); });
    gridObserver.observe(grid, { childList: true });
    document.addEventListener('load', e => {
      if (e.target?.tagName === 'IMG' && e.target.closest('#notesGrid')) tintCards();
    }, true);
    tintCards();
    openSongFromHash();
  }
  window.addEventListener('hashchange', openSongFromHash);
})();
