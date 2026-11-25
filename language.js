/* Shared Greek/English controls for static pages and dynamically rendered UI. */
(() => {
  const translations = window.ARKIANS_TRANSLATIONS;
  const textKeys = window.ARKIANS_TEXT_KEYS || {};
  const normalise = value => value.replace(/\s+/g, ' ').trim();
  const greekKeys = Object.fromEntries(Object.entries(textKeys).map(([text, key]) => [normalise(translations.el[key]), key]));
  const storedLanguage = () => {
    try { return localStorage.getItem('arkians-language') === 'el' ? 'el' : 'en'; }
    catch { return 'en'; }
  };
  let language = storedLanguage();
  let queued = false;
  const originalTitle = document.title;
  function translateRawText(strings) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, noscript, textarea, [contenteditable], [data-i18n], .coin-card-title, #productName, .hero-brand, .logo, .footer-brand')) continue;
      const current = normalise(node.nodeValue);
      if (parent.closest('.coin-card-meta, .cart-card-meta, #productMeta, .wishlist-card-meta')) {
        const countries = window.ARKIANS_COUNTRY_EL || {};
        const entry = Object.entries(countries).find(([en, el]) => current.startsWith(en + ' ') || current.startsWith(el + ' ') || current === en || current === el);
        if (entry) {
          const [en, el] = entry;
          const source = current.startsWith(en) ? en : el;
          const replacement = (language === 'el' ? el : en) + current.slice(source.length);
          if (replacement !== current) node.nodeValue = replacement;
          continue;
        }
      }
      if (/^(Quantity:|Ποσότητα:)\s*\d+$/.test(current)) {
        const replacement = (language === 'el' ? 'Ποσότητα: ' : 'Quantity: ') + current.match(/\d+$/)[0];
        if (replacement !== current) node.nodeValue = replacement;
        continue;
      }
      const key = textKeys[current] || greekKeys[current];
      if (!key || !strings[key] || current === strings[key]) continue;
      node.nodeValue = (node.nodeValue.match(/^\s*/)?.[0] || '') + strings[key] + (node.nodeValue.match(/\s*$/)?.[0] || '');
    }
    document.querySelectorAll('input[placeholder], textarea[placeholder], [aria-label]').forEach(element => {
      for (const attribute of ['placeholder', 'aria-label']) {
        if (!element.hasAttribute(attribute) || element.hasAttribute(attribute === 'placeholder' ? 'data-i18n-placeholder' : 'data-i18n-aria')) continue;
        const current = normalise(element.getAttribute(attribute));
        const key = textKeys[current] || greekKeys[current];
        if (key && strings[key] && current !== strings[key]) element.setAttribute(attribute, strings[key]);
      }
    });
  }
  function translate(root = document) {
    const strings = translations?.[language];
    if (!strings) return;
    for (const [attribute, target] of [['data-i18n', 'textContent'], ['data-i18n-placeholder', 'placeholder'], ['data-i18n-aria', 'aria-label']]) {
      root.querySelectorAll(`[${attribute}]`).forEach(element => {
        const text = strings[element.getAttribute(attribute)];
        if (text === undefined) return;
        if (target === 'textContent') {
          if (element.textContent !== text) element.textContent = text;
        } else if (element.getAttribute(target) !== text) element.setAttribute(target, text);
      });
    }
    translateRawText(strings);
    if (document.documentElement.lang !== language) document.documentElement.lang = language;
    document.querySelectorAll('.language-option').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    document.querySelector('.main-nav')?.setAttribute('data-drawer-title', strings.nav_products);
    const titleParts = originalTitle.split(' | ');
    const titleKey = textKeys[titleParts[0]];
    if (titleKey) document.title = [strings[titleKey], ...titleParts.slice(1)].join(' | ');
  }
  function scheduleTranslation() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; translate(); });
  }
  window.arkiansTranslate = translate;
  document.addEventListener('DOMContentLoaded', () => {
    const aria = {'.mobile-menu-toggle': 'menu_open', '.mobile-menu-close': 'menu_close',
      '.search-bar button': 'search_label', '.header-icons a[href="account.html"]': 'footer_account_title',
      '.header-icons a[href="wishlist.html"]': 'footer_wishlist', '.header-icons a[href="cart.html"]': 'footer_cart'};
    Object.entries(aria).forEach(([selector, key]) => document.querySelectorAll(selector).forEach(element => element.setAttribute('data-i18n-aria', key)));
    document.querySelectorAll('.language-option').forEach(button => button.addEventListener('click', () => {
      language = button.dataset.language === 'el' ? 'el' : 'en';
      try { localStorage.setItem('arkians-language', language); } catch { /* Keep the current visit usable. */ }
      translate();
      window.dispatchEvent(new CustomEvent('arkians:language-change', {detail: {language}}));
    }));
    translate();
    new MutationObserver(scheduleTranslation).observe(document.body, {childList: true, subtree: true, characterData: true});
    window.addEventListener('storage', event => {
      if (event.key === 'arkians-language') { language = storedLanguage(); translate(); }
    });
  });
})();
