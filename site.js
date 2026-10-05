/* Shared cookie controls and display-only catalogue templates. */
(() => {
  const consentKey = 'arkians-cookie-consent';
  let returnFocus;
  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(consentKey));
      return saved?.version === 1 && typeof saved.optional === 'boolean' ? saved : null;
    } catch { return null; }
  }
  window.arkiansHasOptionalConsent = () => readConsent()?.optional === true;
  document.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('section');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', 'cookieTitle');
    banner.hidden = !!readConsent();
    banner.innerHTML = `
      <div class="cookie-copy"><h2 id="cookieTitle" data-i18n="cookie_title">Cookies & privacy</h2>
      <p data-i18n="cookie_message"></p>
      <a href="privacy.html" data-i18n="cookie_policy">Privacy policy</a></div>
      <div class="cookie-actions">
        <button type="button" data-consent="accept" data-i18n="cookie_accept">Accept all</button>
        <button type="button" data-consent="reject" data-i18n="cookie_reject">Necessary only</button>
      </div>`;
    document.body.appendChild(banner);
    window.arkiansTranslate?.();
    banner.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => {
      const consent = {version: 1, necessary: true, optional: button.dataset.consent === 'accept', updatedAt: new Date().toISOString()};
      try { localStorage.setItem(consentKey, JSON.stringify(consent)); } catch { /* Keep this visit usable without storage. */ }
      banner.hidden = true;
      window.dispatchEvent(new CustomEvent('arkians:cookie-consent', {detail: consent}));
      returnFocus?.focus();
    }));
    document.querySelectorAll('.cookie-settings').forEach(button => button.addEventListener('click', () => {
      returnFocus = button;
      banner.hidden = false;
      banner.querySelector('button').focus();
    }));
  });

  window.arkiansRenderTemplates = (container, products) => {
    container.replaceChildren();
    if (!products.length) {
      const message = document.createElement('p');
      message.setAttribute('data-i18n', 'no_products');
      container.appendChild(message);
    }
    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'coin-card template-product';
      const image = document.createElement('img');
      image.className = 'coin-card-image';
      image.alt = product.name;
      image.addEventListener('error', () => { image.src = 'PRODUCT PHOTOS/product-placeholder.svg'; }, {once:true});
      image.src = product.image;
      const name = document.createElement('div');
      name.className = 'coin-card-title';
      name.textContent = product.name;
      const meta = document.createElement('div');
      meta.className = 'coin-card-meta';
      const country = document.createElement('span');
      country.setAttribute('data-i18n', `country_${product.country.toLowerCase()}`);
      country.textContent = product.country;
      meta.append(country, ` · ${product.year}`);
      const status = document.createElement('button');
      status.type = 'button';
      status.className = 'add-cart-button';
      status.disabled = true;
      status.setAttribute('data-i18n', 'coming_soon');
      card.append(image, name, meta, status);
      container.appendChild(card);
    });
    window.arkiansTranslate?.();
  };
})();
