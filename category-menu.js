/* Click-to-open categories with a dismissible blurred backdrop. */
(() => {
  const start = () => {
    const nav = document.getElementById('mainNav');
    const trigger = nav?.querySelector('.dropdown-trigger');
    const menu = nav?.querySelector('.dropdown-menu');
    if (!nav || !trigger || !menu) return;
    const desktop = window.matchMedia('(min-width: 701px)');
    const backdrop = document.createElement('div');
    backdrop.className = 'category-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
    menu.id = 'productCategories';
    trigger.setAttribute('aria-controls', menu.id);
    trigger.setAttribute('aria-expanded', 'false');
    const icon = trigger.querySelector('.nav-products-icon');
    if (icon) icon.innerHTML = '<path class="menu-line menu-line-top" d="M4 6h11"/><path class="menu-line menu-line-middle" d="M4 12h16"/><path class="menu-line menu-line-bottom" d="M4 18h16"/>';
    let open = false;
    const header = nav.closest('.site-header');
    function positionBackdrop() {
      if (backdrop.hidden) return;
      const bottom = Math.max(0, header?.getBoundingClientRect().bottom || 0);
      backdrop.style.top = bottom + 'px';
      if (open && desktop.matches) {
        const viewportWidth = document.documentElement.clientWidth;
        const panelWidth = menu.getBoundingClientRect().width;
        const buttonBounds = trigger.getBoundingClientRect();
        const centeredLeft = buttonBounds.left + (buttonBounds.width - panelWidth) / 2;
        const left = Math.max(12, Math.min(centeredLeft, viewportWidth - panelWidth - 12));
        menu.style.setProperty('--category-panel-top', bottom + 'px');
        menu.style.setProperty('--category-panel-left', left + 'px');
      }
    }
    function syncBackdrop() {
      backdrop.hidden = !(open || nav.classList.contains('mobile-open'));
      positionBackdrop();
    }
    window.addEventListener('scroll', positionBackdrop, {passive: true});
    window.addEventListener('resize', positionBackdrop, {passive: true});
    if (header) new ResizeObserver(positionBackdrop).observe(header);
    function setOpen(value, restoreFocus = false) {
      open = Boolean(value && desktop.matches);
      nav.classList.toggle('categories-open', open);
      trigger.setAttribute('aria-expanded', String(open));
      icon?.querySelector('.menu-line-top')?.setAttribute('d', open ? 'M4 6h16' : 'M4 6h11');
      menu.inert = desktop.matches && !open;
      if (desktop.matches) menu.setAttribute('aria-hidden', String(!open));
      else menu.removeAttribute('aria-hidden');
      syncBackdrop();
      if (restoreFocus) trigger.focus();
    }
    trigger.addEventListener('click', () => setOpen(!open));
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' && desktop.matches) {
        event.preventDefault();
        setOpen(true);
        menu.querySelector('a')?.focus();
      }
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('click', event => {
      if (open && !trigger.contains(event.target) && !menu.contains(event.target)) setOpen(false);
    });
    document.addEventListener('focusin', event => {
      if (open && !trigger.contains(event.target) && !menu.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
    });
    backdrop.addEventListener('click', () => {
      if (open) setOpen(false, true);
      if (nav.classList.contains('mobile-open')) nav.querySelector('.mobile-menu-close')?.click();
    });
    new MutationObserver(syncBackdrop).observe(nav, {attributes: true, attributeFilter: ['class']});
    desktop.addEventListener('change', () => setOpen(false));
    setOpen(false);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();