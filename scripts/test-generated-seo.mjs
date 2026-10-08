/* Integration checks for the published HTML and future catalogue edits.
 * Fixtures are isolated: this test never changes the real catalogue or prices.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = 'supabase/functions/_shared/product-prices.json';
const read = (dir, name) => readFileSync(join(dir, name), 'utf8');
const catalogue = dir => JSON.parse(read(dir, sourcePath));
const writeCatalog = (dir, value) => writeFileSync(join(dir, sourcePath), JSON.stringify(value, null, 2));
const structured = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const productNode = html => structured(html).find(node => node['@type'] === 'Product');
const decode = value => value.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]));
const text = (html, id) => decode(html.match(new RegExp(`<[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\\/[^>]+>`))?.[1].trim() || '');
const build = (dir, args = []) => {
  const result = spawnSync(process.execPath, ['scripts/build-prices.mjs', ...args], {cwd:dir, encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout);
};
for (const href of ['http://arkianscollectibles.com/success.html?session_id=example#receipt',
  'http://www.arkianscollectibles.com/product-1.html?language=el#details']) {
  const location = new URL(href); let destination;
  location.replace = value => {destination=value;};
  runInNewContext(read(root,'https-redirect.js'),{location,URL});
  const expected = new URL(href); expected.protocol='https:'; expected.hostname='arkianscollectibles.com';
  assert.equal(destination,expected.href,'HTTPS redirect lost the path, query, or fragment');
}
for (const href of ['https://arkianscollectibles.com/','http://localhost:3000/','http://unrelated.example/']) {
  const location = new URL(href); let redirected = false;
  location.replace = () => {redirected=true;};
  runInNewContext(read(root,'https-redirect.js'),{location,URL});
  assert.equal(redirected,false,'HTTPS redirect affected a preview or unrelated origin');
}
function checkOutputs(dir) {
  const catalog = catalogue(dir);
  const ids = Object.keys(catalog.products);
  const sitemap = read(dir, 'sitemap.xml');
  assert.equal((sitemap.match(/<loc>/g) || []).length, ids.length + 8);
  const scripts = ['supabase-sdk.js','supabase.js','translations.js','language.js','catalog-data.js','site.js','product-prices.js','product-seo.js','seo.js','coin-photos.js','app.js','search.js'];
  const versions = new Map(readdirSync(dir).filter(name => /\.(?:js|css)$/.test(name))
    .map(name => [name,createHash('sha256').update(readFileSync(join(dir,name))).digest('hex').slice(0,12)]));
  for (const name of readdirSync(dir).filter(name => name.endsWith('.html'))) {
    const html = read(dir,name);
    assert.equal((html.match(/<meta name="robots"/g) || []).length, 1, `${name}: robots duplication`);
    assert.equal((html.match(/<meta name="description"/g) || []).length, 1, `${name}: description duplication`);
    assert.equal((html.match(/<link rel="canonical"/g) || []).length, name === 'product.html' ? 0 : 1, `${name}: canonical duplication`);
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
    assert.ok(html.indexOf('https-redirect.js') < html.indexOf('fonts.googleapis.com'), `${name}: late HTTPS redirect`);
    assert.ok(!html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js'), `${name}: mutable remote SDK`);
    let previous = -1;
    for (const script of scripts) {
      const index = html.indexOf(`src="${script}?v=`);
      assert.ok(index > previous, `${name}: missing or incorrectly ordered ${script}`);
      previous = index;
    }
    for (const match of html.matchAll(/\b(?:src|href)="([\w-]+\.(?:js|css))\?v=([^"\s]+)"/g)) {
      assert.equal(match[2], versions.get(match[1]), `${name}: stale ${match[1]}`);
    }
  }
  for (const [id, product] of Object.entries(catalog.products)) {
    const name = `product-${id}.html`;
    const html = read(dir,name);
    const canonical = `https://arkianscollectibles.com/${name}`;
    const node = productNode(html);
    assert.equal(structured(html).filter(value => value['@type'] === 'Product').length, 1);
    assert.match(html, new RegExp(`<!-- Generated product: ${id} -->`));
    assert.match(html, new RegExp(`<body data-product-id="${id}">`));
    assert.match(html, /<meta name="robots" content="index,follow">/);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert.equal(node.url, canonical);
    assert.equal(node.offers.url, canonical);
    assert.equal(node.offers.price, (product.price_cents / 100).toFixed(2));
    assert.equal(text(html,'productPrice'), `€${(product.price_cents / 100).toFixed(2)}`);
    assert.equal(text(html,'productShipping'), `€${(catalog.shipping_cents / 100).toFixed(2)}`);
    assert.equal(text(html,'productName'), node.name);
    assert.equal(text(html,'productDescription'), node.description);
    assert.equal(node.offers.shippingDetails.hasShippingService['@id'], 'https://arkianscollectibles.com/terms.html#shipping-policy');
    assert.ok(!('deliveryTime' in node.offers.shippingDetails));
    assert.ok(!('aggregateRating' in node));
    assert.ok(!('priceValidUntil' in node.offers));
    if (!product.image || !existsSync(join(dir,product.image))) {
      assert.ok(!node.image, `${name}: nonexistent image in rich data`);
      assert.ok(!html.includes('property="og:image"'), `${name}: nonexistent OG image`);
      assert.ok(html.includes('src="PRODUCT PHOTOS/product-placeholder.svg"'));
    }
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  }
  for (const name of ['account.html','cart.html','search.html','profile.html','edit-profile.html','wishlist.html','order-history.html','success.html']) {
    assert.match(read(dir,name), /<meta name="robots" content="noindex,follow">/);
    assert.ok(!sitemap.includes(`/${name}</loc>`));
  }
  for (const name of ['index.html','terms.html']) {
    const html = read(dir,name);
    const store = structured(html).flatMap(node => node['@graph'] || [node]).find(node => node['@type'] === 'OnlineStore');
    assert.equal(store.hasShippingService['@id'], 'https://arkianscollectibles.com/terms.html#shipping-policy');
    const conditions = store.hasShippingService.shippingConditions;
    const standard = Array.isArray(conditions) ? conditions[0] : conditions;
    assert.equal(standard.shippingRate.value, (catalog.shipping_cents / 100).toFixed(2));
    assert.equal(standard.shippingDestination.length, 27);
  }
  assert.match(read(dir,'terms.html'), /id="shipping-policy"/);
  const coins = read(dir,'coins.html').match(/<!-- Generated catalogue: start -->([\s\S]*?)<!-- Generated catalogue: end -->/)?.[1];
  assert.ok(coins, 'Missing crawlable catalogue');
  for (const id of ids) assert.ok(coins.includes(`href="product-${id}.html"`));
}
const fixture = mkdtempSync(join(tmpdir(), 'arkians-seo-regression-'));
try {
  for (const name of readdirSync(root).filter(name => /\.(?:js|css|html)$/.test(name))) copyFileSync(join(root,name),join(fixture,name));
  for (const name of ['scripts/build-seo.mjs','scripts/build-prices.mjs',sourcePath,'supabase/functions/create-checkout-function/checkout.ts']) {
    mkdirSync(dirname(join(fixture,name)),{recursive:true}); copyFileSync(join(root,name),join(fixture,name));
  }
  mkdirSync(join(fixture,'supabase/dashboard'),{recursive:true});
  for (const product of Object.values(catalogue(root).products)) if (product.image && existsSync(join(root,product.image))) {
    mkdirSync(dirname(join(fixture,product.image)),{recursive:true}); writeFileSync(join(fixture,product.image),'fixture image: existence only');
  }
  checkOutputs(root);
  build(fixture); build(fixture,['--check']); checkOutputs(fixture);
  const catalog = catalogue(fixture);
  const id = Object.keys(catalog.products)[0];
  const changedProduct = catalog.products[id];
  changedProduct.price_cents = 2345;
  changedProduct.name = 'Coin <&" $& $1';
  changedProduct.description = 'Description <&" $& $1 </script>';
  changedProduct.availability = 'OutOfStock';
  catalog.shipping_cents = 456;
  writeCatalog(fixture,catalog); build(fixture); build(fixture,['--check']); checkOutputs(fixture);
  const changedHtml = read(fixture,`product-${id}.html`);
  assert.equal(productNode(changedHtml).name, changedProduct.name + ' (Coloured)');
  assert.equal(text(changedHtml,'productAvailability'), 'Out of stock');
  assert.match(changedHtml, /<button\b[^>]*id="productAddToCart"[^>]*\bdisabled/s);
  const browserContext = {};
  runInNewContext(read(fixture,'product-prices.js'),browserContext);
  assert.equal(browserContext.ARKIANS_PRICES.products[id].price_cents,2345);
  assert.match(read(fixture,'supabase/dashboard/create-checkout-function.ts'), /"price_cents": 2345/);

  const savedHtml = read(fixture,`product-${id}.html`);
  const savedPrices = read(fixture,'product-prices.js');
  for (const field of ['price_cents','gtin']) {
    const invalid = structuredClone(catalog);
    invalid.products[Object.keys(invalid.products).at(-1)][field] = field === 'price_cents' ? -1 : '00000000';
    writeCatalog(fixture,invalid);
    const rejected = spawnSync(process.execPath,['scripts/build-prices.mjs'],{cwd:fixture,encoding:'utf8'});
    assert.notEqual(rejected.status,0, `Invalid ${field} was accepted`);
    assert.equal(read(fixture,`product-${id}.html`),savedHtml,`Invalid ${field} partially regenerated HTML`);
    assert.equal(read(fixture,'product-prices.js'),savedPrices,`Invalid ${field} partially regenerated prices`);
  }

  writeCatalog(fixture,catalog);
  delete catalog.products[id]; writeCatalog(fixture,catalog);
  const stale = spawnSync(process.execPath,['scripts/build-prices.mjs','--check'],{cwd:fixture,encoding:'utf8'});
  assert.notEqual(stale.status,0,'--check missed removed product page');
  writeFileSync(join(fixture,'product-9999.html'),'<!DOCTYPE html><html><head><title>Manual page</title></head><body>Manual page</body></html>');
  build(fixture); build(fixture,['--check']);
  assert.ok(!existsSync(join(fixture,`product-${id}.html`)),'Removed product retains crawlable stale page');
  assert.equal(read(fixture,'product-9999.html').includes('Manual page'),true,'Generator deleted a manually maintained page');
  assert.ok(!read(fixture,'sitemap.xml').includes(`product-${id}.html`));
  console.log(`PASS: ${Object.keys(catalogue(root).products).length} canonical pages, privacy noindex, SDK/cache ordering, shipping references, future price/stock edits, safe HTML escaping, atomic validation and generated orphan cleanup.`);
} finally {
  assert.ok(fixture.startsWith(join(tmpdir(),'arkians-seo-regression-')));
  rmSync(fixture,{recursive:true,force:true});
}
