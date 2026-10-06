/* Centre the original source photographs inside an equal square display frame. */
(() => {
  const catalogue = Object.values(window.ARKIANS_PRICES.products);
  const photos = new Map(catalogue.filter(coin => coin.image_frame).map(coin => [coin.image, coin]));
  window.arkiansCoinVariant = coin => coin.colored === false
    ? ' · <span data-i18n="variant_uncolored">Uncoloured</span>' : '';

  function prepare(image) {
    const coin = photos.get(image.getAttribute('src'));
    if (!coin) {
      if (image.classList.contains('coin-photo')) {
        image.classList.remove('coin-photo');
        const frame = image.parentElement;
        frame.replaceWith(image);
      }
      return;
    }
    if (image.classList.contains('coin-photo')) return;
    const frame = document.createElement('span');
    frame.className = 'coin-photo-frame';
    if (image.classList.contains('cart-card-image')) frame.classList.add('coin-photo-frame--cart');
    if (image.classList.contains('product-detail-image')) frame.classList.add('coin-photo-frame--product');
    for (const key of ['width', 'height', 'left', 'top']) {
      frame.style.setProperty(`--coin-photo-${key}`, `${coin.image_frame[key]}%`);
    }
    image.before(frame);
    frame.append(image);
    image.classList.add('coin-photo');
    const credit = document.createElement('span');
    credit.className = 'coin-photo-credit';
    if (coin.image_credit && coin.image_credit !== 'ECB') {
      const label = document.createElement('span');
      label.dataset.i18n = 'photo_source';
      label.textContent = 'Photo: ';
      credit.append(label, ` ${coin.image_credit}`);
    } else {
      credit.dataset.i18n = 'photo_ecb';
      credit.textContent = 'Photo: ECB';
    }
    frame.append(credit);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(prepare);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') prepare(record.target);
        else for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches('img')) prepare(node);
          node.querySelectorAll('img').forEach(prepare);
        }
      }
    }).observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['src']});
  });
})();
