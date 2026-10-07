/* Product metadata follows the same catalogue as the displayed price. */
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    if (!location.pathname.endsWith('/product.html')) return;
    const domain = 'https://arkianscollectibles.com/';
    const id = Number(new URLSearchParams(location.search).get('id'));
    const product = Number.isSafeInteger(id) && id > 0 ? window.ARKIANS_PRICES?.products[id] : null;
    // Allow Google to render valid products, then exclude invalid/empty IDs.
    if (!product) {
      document.head.querySelector('meta[name="robots"]').content = 'noindex,follow';
      return;
    }
    const name = `${product.name} (${product.colored === false ? 'Uncoloured' : 'Coloured'})`;
    const title = `${name} | Arkians Collectibles`;
    const description = `${name}, ${product.country}, ${product.year}. Explore this collectible €2 coin at Arkians Collectibles.`;
    const canonical = `${domain}product.html?id=${id}`;
    document.title = title;
    const setMeta = (attribute, key, value) => {
      let meta = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.append(meta); }
      meta.content = value;
    };
    setMeta('name', 'description', description);
    setMeta('name', 'robots', 'index,follow');
    setMeta('property', 'og:type', 'product');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link'); canonicalLink.rel = 'canonical'; document.head.append(canonicalLink);
    }
    canonicalLink.href = canonical;
    const schema = {
      '@context':'https://schema.org', '@type':'Product', '@id':canonical+'#product',
      name, description, sku:String(id), url:canonical,
      offers:{'@type':'Offer', url:canonical, priceCurrency:'EUR',
        price:(product.price_cents / 100).toFixed(2),
        seller:{'@type':'Organization', name:'Arkians Collectibles', url:domain}},
    };
    const data = document.createElement('script');
    data.type = 'application/ld+json'; data.id = 'productStructuredData';
    document.head.append(data);
    const renderSchema = () => { data.textContent = JSON.stringify(schema); };
    renderSchema();
    // Only advertise the real product photo after it loads. A placeholder is
    // not a product image, and missing photos must not produce broken rich data.
    const image = document.getElementById('productImage');
    if (!image) return;
    const expected = new URL(product.image, location.href).href;
    const updateImage = () => {
      if (image.complete && image.naturalWidth > 0 && image.src === expected) {
        schema.image = new URL(product.image, domain).href;
        setMeta('property', 'og:image', schema.image);
      } else {
        delete schema.image;
        document.head.querySelector('meta[property="og:image"]')?.remove();
      }
      renderSchema();
    };
    image.addEventListener('load', updateImage);
    image.addEventListener('error', updateImage);
    updateImage();
  });
})();
