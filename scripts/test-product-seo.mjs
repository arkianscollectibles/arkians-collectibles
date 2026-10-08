import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const catalog = JSON.parse(read('supabase/functions/_shared/product-prices.json'));
const helperSource = read('product-seo.js');
const runtimeSource = read('seo.js');
const sandbox = { URL };
runInNewContext(helperSource, sandbox);
const seo = sandbox.ARKIANS_PRODUCT_SEO;
const plain = value => JSON.parse(JSON.stringify(value));

// Guard the business facts against the actual checkout and public policies,
// rather than maintaining another independent list of schema expectations.
const checkout = read('supabase/functions/create-checkout-function/checkout.ts');
const checkoutCountries = [...checkout.match(/allowed_countries:\s*\[([^\]]+)\]/)[1].matchAll(/"([A-Z]{2})"/g)]
  .map(match => match[1]);
assert.deepEqual([...seo.countries], checkoutCountries);
const policy = read('returns.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
assert.match(policy, /withdrawal period expires 14 calendar days/);
assert.match(policy, /responsible for the direct cost of returning the goods/);
assert.match(policy, /proof of postage or shipment/);
const browser = {};
runInNewContext(read('product-prices.js'), browser);
assert.deepEqual(plain(browser.ARKIANS_PRICES), catalog, 'Browser and checkout catalogue must agree');
const shipping = plain(seo.shippingService(catalog));
assert.equal(shipping['@type'], 'ShippingService');
assert.equal(shipping['@id'], 'https://arkianscollectibles.com/terms.html#shipping-policy');
assert.equal(shipping.shippingConditions.shippingRate.value, (catalog.shipping_cents / 100).toFixed(2));
assert.equal(shipping.shippingConditions.shippingRate.currency, 'EUR');
assert.deepEqual(shipping.shippingConditions.shippingDestination.map(region => region.addressCountry), checkoutCountries);
assert.equal(shipping.handlingTime, undefined);
assert.equal(shipping.shippingConditions.transitTime, undefined);
assert.throws(() => seo.shippingService({ shipping_cents: -1 }), /shipping/);

for (const [id, product] of Object.entries(catalog.products)) {
  const imageURL = new URL(product.image, seo.domain).href;
  const metadata = seo.buildProduct({ product, id, catalog, imageURL });
  const schema = plain(metadata.schema);
  assert.equal(schema.name, metadata.name);
  assert.equal(schema.description, metadata.description);
  assert.equal(schema.sku, id);
  assert.equal(schema.image, imageURL);
  assert.equal(schema.url, `https://arkianscollectibles.com/product-${id}.html`);
  assert.equal(metadata.canonical, schema.url);
  assert.equal(schema.offers.url, schema.url);
  assert.equal(schema.offers.price, (product.price_cents / 100).toFixed(2));
  assert.equal(schema.offers.priceCurrency, 'EUR');
  assert.equal(schema.offers.availability, 'https://schema.org/InStock');
  assert.deepEqual(schema.offers.shippingDetails, {
    '@type': 'OfferShippingDetails', hasShippingService: { '@id': shipping['@id'] },
  }, 'Use the documented reference to the standard merchant shipping service');
  const returns = schema.offers.hasMerchantReturnPolicy;
  assert.equal(returns.merchantReturnDays, 14);
  assert.equal(returns.returnPolicyCategory, 'https://schema.org/MerchantReturnFiniteReturnWindow');
  assert.equal(returns.returnFees, 'https://schema.org/ReturnFeesCustomerResponsibility');
  assert.equal(returns.returnMethod, 'https://schema.org/ReturnByMail');
  assert.equal(returns.merchantReturnLink, 'https://arkianscollectibles.com/returns.html');
  assert.deepEqual(returns.applicableCountry, checkoutCountries);
  assert.equal(returns.returnShippingFeesAmount, undefined);
  assert.equal(schema.offers.shippingDetails.deliveryTime, undefined, 'Do not invent a handling/transit split');
  for (const field of ['brand', 'gtin', 'gtin13', 'gtin14', 'aggregateRating', 'review', 'mpn']) {
    assert.equal(schema[field], undefined, `Do not invent ${field}`);
  }
  assert.equal(schema.offers.itemCondition, undefined);
  assert.equal(schema.offers.priceValidUntil, undefined);
  assert.equal(seo.schema(product, id, catalog).image, undefined, 'No unchecked image is added');
}
const product = catalog.products[1];
assert.equal(seo.schema({ ...product, availability: 'OutOfStock' }, 1, catalog).offers.availability, 'https://schema.org/OutOfStock');
assert.equal(seo.schema({ ...product, availability: 'https://schema.org/PreOrder' }, 1, catalog).offers.availability, 'https://schema.org/PreOrder');
const stockCases = [
  ['InStock', 'product_in_stock', true], ['OutOfStock', 'product_out_of_stock', false],
  ['SoldOut', 'product_sold_out', false], ['Discontinued', 'product_discontinued', false],
  ['InStoreOnly', 'product_in_store_only', false], ['LimitedAvailability', 'product_limited_availability', true],
  ['OnlineOnly', 'product_online_only', true], ['BackOrder', 'product_back_order', true],
  ['PreOrder', 'product_pre_order', true], ['PreSale', 'product_pre_sale', true],
];
for (const [availability, key, purchasable] of stockCases) {
  const supplied = { ...product, availability };
  const status = seo.stockStatus(supplied);
  assert.equal(status.key, key);
  assert.ok(status.en && status.el, 'Each stock state has an English and Greek label');
  assert.equal(seo.canPurchase(supplied), purchasable);
  assert.equal(seo.stockStatus({ ...supplied, availability: `https://schema.org/${availability}` }).key, key);
}
assert.throws(() => seo.schema({ ...product, availability: 'unknown' }, 1, catalog), /availability/);
assert.throws(() => seo.schema(product, 0, catalog), /product ID/);
assert.throws(() => seo.schema(product, '01', catalog), /product ID/);
assert.throws(() => seo.schema({ ...product, price_cents: 14.99 }, 1, catalog), /metadata/);
assert.throws(() => seo.schema(product, 1, { ...catalog, shipping_cents: -1 }), /shipping/);
assert.throws(() => seo.schema(product, 1, catalog, 'http://example.com/photo.jpg'), /HTTPS/);
for (const gtin of ['96385074', '036000291452', '4006381333931', '04006381333931']) {
  assert.equal(seo.validateGTIN(gtin), gtin);
  const supplied = plain(seo.schema({ ...product, gtin, brand: 'Verified issuer', mpn: 'ABC-001' }, 1, catalog));
  assert.equal(supplied[`gtin${gtin.length}`], gtin, 'Use the most specific GTIN field and preserve leading zeroes');
  assert.equal(supplied.brand.name, 'Verified issuer');
  assert.equal(supplied.mpn, 'ABC-001');
}
for (const gtin of ['4006381333932', '00000000', '123456789', '400638133393A', 4006381333931, '']) {
  assert.throws(() => seo.schema({ ...product, gtin }, 1, catalog), /GTIN/);
}
assert.equal(seo.schema({ ...product, gtin13: '4006381333931' }, 1, catalog).gtin13, '4006381333931');
assert.throws(() => seo.schema({ ...product, gtin14: '4006381333931' }, 1, catalog), /gtin14/);
assert.throws(() => seo.schema({ ...product, brand: '' }, 1, catalog), /brand/);
assert.throws(() => seo.schema({ ...product, mpn: 100 }, 1, catalog), /mpn/);

// Exercise the browser integration at its DOM boundary. This catches stale
// schema duplication, URL precedence, and image fallback bugs in seo.js.
function page({ id, query = '', staticSchema, imageState = 'loaded', pathname = '/product.html', pageCatalog = catalog, lang = 'en' } = {}) {
  const head = [];
  const handlers = new Map();
  const domReady = [];
  function node(tag) {
    return { tag, content: '', textContent: '', attributes: {},
      setAttribute(key, value) { this.attributes[key] = value; },
      remove() { const index = head.indexOf(this); if (index >= 0) head.splice(index, 1); },
    };
  }
  if (staticSchema) {
    const data = node('script'); data.id = 'productStructuredData';
    data.textContent = JSON.stringify(staticSchema); head.push(data);
  }
  const href = `https://arkianscollectibles.com${pathname}${query}`;
  const image = {
    id: 'productImage', src: new URL(product.image, href).href,
    complete: imageState !== 'loading', naturalWidth: imageState === 'loaded' ? 420 : 0,
    addEventListener(event, callback) { handlers.set(event, callback); },
  };
  const status = node('p'); status.id = 'productAvailability';
  const buyButton = node('button'); buyButton.id = 'productAddToCart'; buyButton.dataset = {};
  const bodyNodes = [image, status, buyButton];
  const document = {
    body: { dataset: id === undefined ? {} : { productId: String(id) } }, title: '',
    documentElement: { lang },
    createElement: node,
    getElementById(key) { return bodyNodes.find(item => item.id === key) || head.find(item => item.id === key); },
    addEventListener(event, callback) { assert.equal(event, 'DOMContentLoaded'); domReady.push(callback); },
    head: {
      append(item) { head.push(item); },
      querySelector(selector) {
        const meta = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
        if (meta) return head.find(item => item.tag === 'meta' && item.attributes[meta[1]] === meta[2]);
        if (selector === 'link[rel="canonical"]') return head.find(item => item.tag === 'link' && item.rel === 'canonical');
        throw Error(`Unhandled selector: ${selector}`);
      },
    },
  };
  const context = { URL, URLSearchParams, document, location: { pathname, search: query, href }, ARKIANS_PRICES: pageCatalog };
  context.window = context;
  runInNewContext(helperSource, context);
  runInNewContext(runtimeSource, context);
  domReady.forEach(callback => callback());
  return { image, head, document, status, buyButton,
    schema: () => JSON.parse(head.find(item => item.id === 'productStructuredData')?.textContent || 'null'),
    meta: (attribute, key) => document.head.querySelector(`meta[${attribute}="${key}"]`)?.content,
    event(event) { assert.ok(handlers.has(event)); handlers.get(event)(); },
  };
}
const legacy = page({ query: '?id=1' });
assert.equal(legacy.schema().url, seo.url(1));
assert.equal(legacy.schema().image, new URL(product.image, seo.domain).href);
assert.equal(legacy.meta('name', 'robots'), 'index,follow');
assert.equal(legacy.status.textContent, seo.stockStatus(product).en);
assert.equal(legacy.status.attributes['data-i18n'], 'product_in_stock');
assert.equal(legacy.buyButton.disabled, false);
const staticPage = page({ id: 1, query: '?id=2', pathname: '/product-1.html', staticSchema: seo.schema(product, 1, catalog, product.image), imageState: 'loading' });
assert.equal(staticPage.schema().sku, '1', 'A query must not change a static product page');
assert.equal(staticPage.head.filter(item => item.id === 'productStructuredData').length, 1);
assert.equal(staticPage.schema().image, new URL(product.image, seo.domain).href, 'Verified static image survives loading');
staticPage.image.src = new URL('PRODUCT PHOTOS/product-placeholder.svg', seo.domain).href;
staticPage.image.complete = true; staticPage.image.naturalWidth = 200;
staticPage.event('error');
assert.equal(staticPage.schema().image, undefined, 'A placeholder is never a Product image');
assert.equal(staticPage.meta('property', 'og:image'), undefined);
assert.equal(staticPage.meta('name', 'twitter:image'), undefined);
assert.equal(staticPage.schema().offers.availability, 'https://schema.org/InStock', 'Photo failures do not change stock');
for (const [availability, key, purchasable] of stockCases) {
  const changedProduct = { ...product, availability };
  const pageCatalog = { ...catalog, products: { ...catalog.products, 1: changedProduct } };
  for (const lang of ['en', 'el']) {
    const changed = page({ id: 1, pathname: '/product-1.html', pageCatalog, lang, staticSchema: seo.schema(product, 1, catalog) });
    assert.equal(changed.schema().offers.availability, `https://schema.org/${availability}`);
    assert.equal(changed.status.attributes['data-i18n'], key);
    assert.equal(changed.status.textContent, seo.stockStatus(changedProduct)[lang]);
    assert.equal(changed.buyButton.disabled, !purchasable);
    assert.equal(changed.buyButton.dataset.stockUnavailable, String(!purchasable));
  }
}
const missing = page({ query: '?id=99999', staticSchema: seo.schema(product, 1, catalog) });
assert.equal(missing.meta('name', 'robots'), 'noindex,follow');
assert.equal(missing.schema(), null, 'Invalid IDs must not retain Product markup');
for (const query of ['', '?id=1.0', '?id=01', '?id=-1', '?id=1x']) {
  const invalid = page({ query });
  assert.equal(invalid.meta('name', 'robots'), 'noindex,follow');
  assert.equal(invalid.schema(), null);
}
console.log(`Product SEO verified: ${Object.keys(catalog.products).length} catalogue products, standard shipping policy, checkout/policy agreement, all 10 availability states in English/Greek, and browser/image fallback integration.`);
