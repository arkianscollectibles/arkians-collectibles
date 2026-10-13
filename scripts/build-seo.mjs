import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const check = process.argv.includes('--check');
const catalog = JSON.parse(readFileSync(new URL('supabase/functions/_shared/product-prices.json', root), 'utf8'));
const photoFile = new URL('coin-gallery.json', root);
const photoCatalog = existsSync(photoFile) ? JSON.parse(readFileSync(photoFile, 'utf8')) : null;
if (!Number.isSafeInteger(catalog.shipping_cents) || catalog.shipping_cents < 0) throw Error('Invalid shipping_cents');
if (!catalog.products || !Object.keys(catalog.products).length) throw Error('Empty product catalogue');
const context = { URL };
runInNewContext(readFileSync(new URL('product-seo.js', root), 'utf8'), context);
const helper = context.ARKIANS_PRODUCT_SEO;
const domain = helper.domain;
const brand = 'Arkians Collectibles';
const httpsVersion = createHash('sha256').update(readFileSync(new URL('https-redirect.js', root))).digest('hex').slice(0,12);
const pages = {
  'index.html': ['Arkians Collectibles | Coloured & Uncoloured €2 Coins', 'Discover coloured and uncoloured commemorative €2 coins at Arkians Collectibles. Browse European coins by country and year.'],
  'coins.html': ['Collectible €2 Coins | Arkians Collectibles', 'Browse coloured and uncoloured commemorative €2 coins at Arkians Collectibles. Filter European collectible coins by country, year and colour.'],
  'cards.html': ['Coin Cards | Arkians Collectibles', 'Explore upcoming coin cards at Arkians Collectibles. Browse the collection by country and year.'],
  'proof.html': ['Proof Coins | Arkians Collectibles', 'Explore upcoming proof coins at Arkians Collectibles. Browse the collection by country and year.'],
  'about.html': ['About Arkians Collectibles', 'Learn about Arkians Collectibles, based in Athens, Greece, and our collection of coloured and uncoloured commemorative coins.'],
  'privacy.html': ['Privacy Policy | Arkians Collectibles', 'Read how Arkians Collectibles handles privacy, customer accounts and cookies.'],
  'returns.html': ['Returns & Withdrawal | Arkians Collectibles', 'Read the returns and withdrawal policy for purchases from Arkians Collectibles.'],
  'terms.html': ['Terms & Conditions | Arkians Collectibles', 'Read the terms and conditions for using Arkians Collectibles and purchasing collectible coins.'],
};
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const money = cents => `€${(cents / 100).toFixed(2)}`;
const outputs = new Map();
// Prepare all products before writing: a bad price, ID, identifier, stock value
// or image path must fail without leaving a partially regenerated storefront.
const preparedProducts = Object.entries(catalog.products).map(([id, product]) => {
  const actualImage = product.image && existsSync(new URL(product.image, root)) ? product.image : null;
  const imageURL = actualImage ? new URL(actualImage, domain).href : null;
  const productData = helper.buildProduct({product,id,catalog,imageURL});
  const status = helper.stockStatus(product);
  return {id, product, actualImage, imageURL, productData, status};
});
const photoIdentities = new Set();
const photoIds = new Set();
const existingIdentities = new Set(Object.entries(catalog.products).map(([id, product]) => {
  const feature = photoCatalog?.existing_coin_features?.[product.source_coin_id || id];
  return feature ? JSON.stringify([product.country, product.year, feature, product.colored]) : null;
}).filter(Boolean));
const photographs = (photoCatalog?.images || []).map(photo => {
  const identity = JSON.stringify([photo.country, photo.year, photo.feature, photo.colored]);
  if (!/^[a-z0-9-]+$/.test(photo.id) || !photo.name || !photo.country || !photo.feature ||
      !Number.isSafeInteger(photo.year) || typeof photo.colored !== 'boolean') throw Error('Invalid photograph metadata');
  if (photoIds.has(photo.id) || photoIdentities.has(identity) || existingIdentities.has(identity)) throw Error(`Duplicate coin photograph: ${photo.id}`);
  photoIds.add(photo.id); photoIdentities.add(identity);
  if (!photo.image?.startsWith('PRODUCT PHOTOS/COINS/') || photo.image.split('/').includes('..') ||
      !existsSync(new URL(photo.image, root))) throw Error(`Missing or invalid original photograph: ${photo.id}`);
  if (!Array.isArray(photo.pixels) || photo.pixels.length !== 2 || !photo.pixels.every(n => Number.isSafeInteger(n) && n > 0) ||
      !['width','left','top'].every(key => Number.isFinite(photo.display?.[key])) || photo.display.width <= 0) throw Error(`Invalid photograph frame: ${photo.id}`);
  return Object.fromEntries(['id','name','nameEl','searchAliases','country','year','colored','image','pixels','display']
    .filter(key => photo[key] !== undefined).map(key => [key,photo[key]]));
});
if (photoCatalog) outputs.set('coin-gallery-data.js', '// Generated by node scripts/build-prices.mjs. Edit coin-gallery.json.\n'
  + 'globalThis.ARKIANS_PHOTO_CATALOG = ' + JSON.stringify(photographs, null, 2) + ';\n');
const photoCards = '<div class="coin-grid">\n' + photographs.map(photo => {
  const frame = Object.entries(photo.display).map(([key, value]) => `--gallery-image-${key}: ${value}%`).join('; ');
  return `        <article class="coin-card" id="photo-${photo.id}" data-gallery-coin="${photo.id}">
          <a class="coin-gallery-image" href="${escape(photo.image)}" aria-label="${escape(photo.name)}" style="${frame}">
            <img class="coin-card-image" src="${escape(photo.image)}" alt="${escape(photo.name)}" width="${photo.pixels[0]}" height="${photo.pixels[1]}" loading="lazy">
          </a>
          <h3 class="coin-card-title">${escape(photo.name)}</h3>
          <p class="coin-card-meta"><span data-i18n="country_${photo.country.toLowerCase()}">${escape(photo.country)}</span> · ${photo.year} · <span data-i18n="variant_uncolored">Uncoloured</span></p>
        </article>`;
}).join('\n') + '\n      </div>';
function addPhotoFilters(current, key, options, render) {
  const group = current.indexOf(`data-i18n="filter_${key}"`);
  const start = current.indexOf('<div class="filter-options" hidden>', group);
  const end = current.indexOf('</div>', start) + 6;
  if (group < 0 || start < 0 || end < 6) throw Error(`Missing ${key} filter markup`);
  return current.slice(0,start) + '<div class="filter-options" hidden>\n' + options.map(render).join('\n') + '\n          </div>' + current.slice(end);
}
const staticCards = preparedProducts.map(({id, product, actualImage, productData}) => `
          <a class="coin-card coin-product-link" href="product-${id}.html">
            <img class="coin-card-image" src="${escape(actualImage || 'PRODUCT PHOTOS/product-placeholder.svg')}" alt="${escape(productData.name)}" loading="lazy">
            <div class="coin-card-title">${escape(productData.name)}</div>
            <div class="coin-card-meta">${escape(product.country)} · ${escape(product.year)}</div>
            <div class="coin-card-price">${money(product.price_cents)}</div>
          </a>`).join('\n');
function save(name, contents) {
  const file = new URL(name, root);
  if (check) {
    let current;
    try { current = readFileSync(file, 'utf8'); } catch { /* Report missing output. */ }
    if (current !== contents) throw Error(`${name} SEO is stale; run node scripts/build-prices.mjs`);
  } else writeFileSync(file, contents);
}
function metadata({title, description, canonical, index = true, product, image}) {
  return [
    '  <!-- Generated SEO: start -->',
    '  <meta name="referrer" content="no-referrer">',
    '  <meta http-equiv="Content-Security-Policy" content="object-src \'none\'; base-uri \'self\'; form-action \'self\'; upgrade-insecure-requests">',
    `  <script src="https-redirect.js?v=${httpsVersion}"></script>`,
    '  <link rel="icon" type="image/svg+xml" href="favicon.svg">',
    `  <meta name="description" content="${escape(description)}">`,
    `  <meta name="robots" content="${index ? 'index,follow' : 'noindex,follow'}">`,
    ...(canonical ? [`  <link rel="canonical" href="${canonical}">`] : []),
    `  <meta property="og:type" content="${product ? 'product' : 'website'}">`,
    `  <meta property="og:site_name" content="${brand}">`,
    `  <meta property="og:title" content="${escape(title)}">`,
    `  <meta property="og:description" content="${escape(description)}">`,
    `  <meta property="og:url" content="${canonical || domain + 'product.html'}">`,
    ...(image ? [`  <meta property="og:image" content="${escape(image)}">`] : []),
    `  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    ...(product ? [`  <script type="application/ld+json" id="productStructuredData">${json(product)}</script>`] : []),
    '  <!-- Generated SEO: end -->',
  ].join('\n');
}
function installMetadata(current, values) {
  let updated = current.replace(/\s*<!-- Generated SEO: start -->[\s\S]*?<!-- Generated SEO: end -->\s*/g, '\n\n');
  updated = updated.replace(/\s*<meta\b[^>]*\bname=(["'])description\1[^>]*>\s*/gi, '\n\n');
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(values.title)}</title>`);
  updated = updated.replace(/(<title>[\s\S]*?<\/title>)\s*/i, (_match, title) => `${title}\n\n${metadata(values)}\n\n  `);
  updated = updated.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/g, '<script src="supabase-sdk.js"></script>');
  if (!/src=["']product-seo\.js(?:\?[^"']*)?["']/.test(updated)) {
    updated = updated.replace(/(<script src="seo\.js[^" ]*"><\/script>)/, '<script src="product-seo.js"></script>\n$1');
  }
  if (photoCatalog && !/src=["']coin-gallery-data\.js(?:\?[^"']*)?["']/.test(updated)) {
    updated = updated.replace(/(<script src="site\.js[^" ]*"><\/script>)/,
      '<script src="coin-gallery-data.js"></script>\n<script src="coin-gallery.js"></script>\n$1');
  }
  return updated;
}
const store = {'@context':'https://schema.org', '@graph':[
  {'@type':'OnlineStore', '@id':domain+'#organization', name:brand, legalName:'ARKIANS MOBILE CENTERS E.E.', url:domain,
    description:pages['index.html'][1], email:'arkians.gr@gmail.com', telephone:'+302160023648',
    address:{'@type':'PostalAddress',addressLocality:'Perama',addressCountry:'GR'},
    contactPoint:{'@type':'ContactPoint',contactType:'customer service',email:'arkians.gr@gmail.com',telephone:'+302160023648',availableLanguage:['English','Greek']},
    hasMerchantReturnPolicy:helper.returnPolicy(), hasShippingService:helper.shippingService(catalog)},
  {'@type':'WebSite','@id':domain+'#website',name:brand,url:domain,inLanguage:['en','el'],publisher:{'@id':domain+'#organization'}},
]};
for (const name of readdirSync(root).filter(name => name.endsWith('.html') && !/^product-\d+\.html$/.test(name))) {
  const current = readFileSync(new URL(name, root), 'utf8');
  const publicPage = pages[name];
  const productPage = name === 'product.html';
  const title = publicPage?.[0] || current.match(/<title>([\s\S]*?)<\/title>/i)[1].trim();
  let updated = installMetadata(current, {title,
    description:publicPage?.[1] || (productPage ? 'Explore collectible commemorative €2 coins at Arkians Collectibles.' : 'Manage your account and purchases at Arkians Collectibles.'),
    canonical:productPage ? null : domain+(name==='index.html'?'':name),index:!!publicPage || productPage});
  if (name === 'index.html' || name === 'terms.html') updated = updated.replace('  <!-- Generated SEO: end -->', `  <script type="application/ld+json">${json(store)}</script>\n  <!-- Generated SEO: end -->`);
  if (name === 'terms.html') updated = updated.replace(/(<span id="standardShippingPrice">)[\s\S]*?(<\/span>)/,
    (_match, start, end) => `${start}${money(catalog.shipping_cents)}${end}`);
  if (name === 'coins.html') {
    if (photoCatalog) {
      updated = updated.replace(/<!-- Generated photo catalogue: start -->[\s\S]*?<!-- Generated photo catalogue: end -->/,
        () => '<!-- Generated photo catalogue: start -->\n      ' + photoCards + '\n      <!-- Generated photo catalogue: end -->');
      const countries = [...new Set([...preparedProducts.map(p => p.product.country), ...photographs.map(p => p.country)])].sort();
      const years = [...new Set([...updated.matchAll(/value="(\d{4})" class="year-filter"/g)].map(m => Number(m[1]))
        .concat(preparedProducts.map(p => p.product.year), photographs.map(p => p.year)))].sort((a,b) => a-b);
      updated = addPhotoFilters(updated, 'country', countries, country => `            <label><input type="checkbox" value="${escape(country)}" class="country-filter"> <span data-i18n="country_${country.toLowerCase()}">${escape(country)}</span></label>`);
      updated = addPhotoFilters(updated, 'year', years, year => `            <label><input type="checkbox" value="${year}" class="year-filter"> <span>${year}</span></label>`);
    }
    const cards = `<!-- Generated catalogue: start -->${staticCards}\n          <!-- Generated catalogue: end -->`;
    if (updated.includes('<!-- Generated catalogue: start -->')) {
      updated = updated.replace(/<!-- Generated catalogue: start -->[\s\S]*?<!-- Generated catalogue: end -->/, () => cards);
    } else {
      updated = updated.replace(/(<div class="coin-grid" id="allCoins">)[\s\S]*?(<\/div>)/,
        (_match, start, end) => `${start}\n          ${cards}\n        ${end}`);
    }
  }
  outputs.set(name, updated);
}
// Complete crawlable HTML, while keeping all existing query-string links usable.
const template = outputs.get('product.html');
for (const {id, product, actualImage, imageURL, productData, status} of preparedProducts) {
  let updated = installMetadata(template, {...productData,product:productData.schema,image:imageURL});
  updated = updated.replace(/<!DOCTYPE html>/i, match => `${match}\n<!-- Generated product: ${id} -->`);
  updated = updated.replace('<body>', `<body data-product-id="${id}">`);
  updated = updated.replace(/(<img\s+id="productImage"[\s\S]*?)src="[^"]*"([\s\S]*?)alt="[^"]*"/,
    (_match, before, middle) => `${before}src="${escape(actualImage || 'PRODUCT PHOTOS/product-placeholder.svg')}"${middle}alt="${escape(productData.name)}"`);
  updated = updated.replace(/(<h1 id="productName">)[\s\S]*?(<\/h1>)/, (_match, start, end) => `${start}${escape(productData.name)}${end}`);
  updated = updated.replace(/(<div\s+id="productMeta"[\s\S]*?>)[\s\S]*?(<\/div>)/, (_match, start, end) => `${start}${escape(product.country)} · ${escape(product.year)}${end}`);
  updated = updated.replace(/(<div\s+id="productPrice"[\s\S]*?>)[\s\S]*?(<\/div>)/, (_match, start, end) => `${start}${money(product.price_cents)}${end}`);
  updated = updated.replace(/(<p\s+id="productDescription"[\s\S]*?>)[\s\S]*?(<\/p>)/, (_match, start, end) => `${start}${escape(productData.description)}${end}`);
  updated = updated.replace(/(<span id="productShipping">)[\s\S]*?(<\/span>)/, (_match, start, end) => `${start}${money(catalog.shipping_cents)}${end}`);
  updated = updated.replace(/<p id="productAvailability"[^>]*>[\s\S]*?<\/p>/, () => `<p id="productAvailability" data-i18n="${escape(status.key)}">${escape(status.en)}</p>`);
  if (!helper.canPurchase(product)) {
    updated = updated.replace(/(<button\b[^>]*\bid="productAddToCart"[^>]*)(>)/, (_match, start, end) => `${start} disabled${end}`);
  }
  outputs.set(`product-${id}.html`, updated);
}
// Delete only pages proven to have been generated by this script. Manually
// maintained product-like filenames are never removed by catalogue changes.
const orphans = readdirSync(root).filter(name => /^product-\d+\.html$/.test(name) && !outputs.has(name))
  .filter(name => {
    const id = name.match(/^product-(\d+)\.html$/)[1];
    const current = readFileSync(new URL(name, root), 'utf8');
    return current.includes(`<!-- Generated product: ${id} -->`) && current.includes(`<body data-product-id="${id}">`);
  });
const urls = [...Object.keys(pages).map(name => domain+(name==='index.html'?'':name)), ...Object.keys(catalog.products).map(id=>helper.url(id))];
outputs.set('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  +urls.map(url=>`  <url><loc>${escape(url)}</loc></url>`).join('\n')+'\n</urlset>\n');
outputs.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${domain}sitemap.xml\n`);
if (check && orphans.length) throw Error(`Removed products still have generated pages: ${orphans.join(', ')}`);
for (const [name, contents] of outputs) save(name, contents);
if (!check) for (const name of orphans) unlinkSync(new URL(name, root));
