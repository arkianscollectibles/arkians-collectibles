/* Keep product titles of the same rendered line count in separate grid rows. */
(() => {
  const positions = new WeakMap();
  const watched = new WeakSet();
  let nextPosition = 0;
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  };
  const resize = new ResizeObserver(schedule);
  function update() {
    document.querySelectorAll('.coin-grid').forEach(grid => {
      if (!watched.has(grid)) { watched.add(grid); resize.observe(grid); }
      if (!grid.getClientRects().length || grid.clientWidth === 0) return;
      const cards = [...grid.children].filter(card => card.matches('.coin-card'));
      const entries = cards.map(card => {
        if (!positions.has(card)) positions.set(card, nextPosition++);
        const title = card.querySelector('.coin-card-title');
        if (!title || !card.getClientRects().length) return null;
        const style = getComputedStyle(title);
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
        const lines = Math.max(1, Math.round(title.getBoundingClientRect().height / lineHeight));
        return {card, lines, position: positions.get(card)};
      }).filter(Boolean);
      entries.sort((a, b) => a.lines - b.lines || a.position - b.position);
      const current = cards.filter(card => card.getClientRects().length);
      if (entries.some((entry, index) => entry.card !== current[index])) {
        const fragment = document.createDocumentFragment();
        entries.forEach(({card}) => fragment.appendChild(card));
        grid.appendChild(fragment);
      }
      let previous = null;
      entries.forEach(({card, lines}) => {
        const column = lines !== previous ? '1' : '';
        if (card.style.gridColumn !== column) card.style.gridColumn = column;
        previous = lines;
      });
    });
  }
  const start = () => {
    new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true, characterData: true});
    new MutationObserver(schedule).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
    window.addEventListener('resize', schedule, {passive: true});
    document.fonts?.ready.then(schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();