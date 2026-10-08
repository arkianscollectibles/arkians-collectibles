/* Product metadata follows the same catalogue and helper as generated pages. */
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.dataset.productId;
    if (!pageId && !location.pathname.endsWith('/product.html')) return;
    const sourceId = pageId || new URLSearchParams(location.search).get('id');
    const id = /^[1-9]\d*$/.test(sourceId || '') ? Number(sourceId) : NaN;
    const catalog = window.ARKIANS_PRICES;
    const product = Number.isSafeInteger(id) && id > 0 ? catalog?.products[id] : null;
    const helper = window.ARKIANS_PRODUCT_SEO;
    const setMeta = (attribute, key, value) => {
      let meta = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.append(meta); }
      meta.content = value;
    };
    // Allow Google to render valid products, then exclude invalid/empty IDs.
    if (!product) {
      setMeta('name', 'robots', 'noindex,follow');
      document.getElementById('productStructuredData')?.remove();
      return;
    }
    if (!helper) return;
    const { title, description, canonical } = helper.buildProduct({ product, id, catalog });
    const stock = helper.stockStatus(product);
    const availabilityLabel = document.getElementById('productAvailability');
    if (availabilityLabel) {
      availabilityLabel.setAttribute('data-i18n', stock.key);
      availabilityLabel.textContent = document.documentElement.lang === 'el' ? stock.el : stock.en;
    }
    const buyButton = document.getElementById('productAddToCart');
    if (buyButton) {
      buyButton.disabled = !helper.canPurchase(product);
      buyButton.dataset.stockUnavailable = String(buyButton.disabled);
    }
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', 'index,follow');
    setMeta('property', 'og:type', 'product');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.append(canonicalLink);
    }
    canonicalLink.href = canonical;
    let data = document.getElementById('productStructuredData');
    let staticImage;
    // Keep a generator-verified photograph while it is still loading. An error
    // or a placeholder removes it; no duplicate Product node is appended.
    try { staticImage = JSON.parse(data?.textContent || '{}').image; } catch { /* Replace malformed old metadata. */ }
    const expectedImage = new URL(product.image, helper.domain).href;
    if (staticImage !== expectedImage) staticImage = undefined;
    const schema = helper.schema(product, id, catalog, staticImage);
    if (!data) {
      data = document.createElement('script');
      data.type = 'application/ld+json'; data.id = 'productStructuredData';
      document.head.append(data);
    }
    const renderSchema = () => { data.textContent = JSON.stringify(schema); };
    renderSchema();
    // Only advertise the real product photo after it loads. A placeholder is
    // not a product image, and missing photos must not produce broken rich data.
    const image = document.getElementById('productImage');
    if (!image) return;
    const expected = new URL(product.image, location.href).href;
    const updateImage = () => {
      if (image.complete && image.naturalWidth > 0 && image.src === expected) {
        schema.image = expectedImage;
        setMeta('property', 'og:image', schema.image);
        setMeta('name', 'twitter:image', schema.image);
      } else if (image.complete || image.src !== expected) {
        delete schema.image;
        document.head.querySelector('meta[property="og:image"]')?.remove();
        document.head.querySelector('meta[name="twitter:image"]')?.remove();
      }
      renderSchema();
    };
    image.addEventListener('load', updateImage);
    image.addEventListener('error', updateImage);
    updateImage();
  });
})();
