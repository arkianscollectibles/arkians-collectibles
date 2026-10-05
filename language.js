/* Shared language controls, including content rendered after page load. */
(() => {
  const translations = window.ARKIANS_TRANSLATIONS;
  const storedLanguage = () => {
    try { return localStorage.getItem('arkians-language') === 'el' ? 'el' : 'en'; }
    catch { return 'en'; }
  };
  let language = storedLanguage();
  function translate(root = document) {
    const strings = translations?.[language];
    if (!strings) return;
    for (const [attribute, target] of [['data-i18n', 'textContent'], ['data-i18n-placeholder', 'placeholder'], ['data-i18n-aria', 'aria-label']]) {
      root.querySelectorAll(`[${attribute}]`).forEach(element => {
        const text = strings[element.getAttribute(attribute)];
        if (text === undefined) return;
        if (target === 'textContent') element.textContent = text;
        else element.setAttribute(target, text);
      });
    }
    document.documentElement.lang = language;
    document.querySelectorAll('.language-switch').forEach(button => {
      button.textContent = language === 'en' ? 'EN / GR' : 'GR / EN';
    });
    document.querySelector('.main-nav')?.setAttribute('data-drawer-title', strings.nav_products);
  }
  window.arkiansTranslate = translate;
  document.addEventListener('DOMContentLoaded', () => {
    const aria = {'.mobile-menu-toggle': 'menu_open', '.mobile-menu-close': 'menu_close',
      '.language-switch': 'language_change', '.search-bar button': 'search_label',
      '.header-icons a[href="account.html"]': 'footer_account_title',
      '.header-icons a[href="wishlist.html"]': 'footer_wishlist', '.header-icons a[href="cart.html"]': 'footer_cart'};
    Object.entries(aria).forEach(([selector,key]) => document.querySelectorAll(selector).forEach(el=>el.setAttribute('data-i18n-aria',key)));
    document.querySelectorAll('.language-switch').forEach(button => button.addEventListener('click', () => {
      language = language === 'en' ? 'el' : 'en';
      try { localStorage.setItem('arkians-language', language); } catch { /* Storage can be unavailable. */ }
      translate();
    }));
    translate();
    new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1))) translate();
    }).observe(document.body, {childList: true, subtree: true});
  });
})();
