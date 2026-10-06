import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const domain = 'https://arkianscollectibles.com/';
const brand = 'Arkians Collectibles';
const check = process.argv.includes('--check');
const catalog = JSON.parse(readFileSync(new URL('supabase/functions/_shared/product-prices.json', root), 'utf8'));
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
function save(name, contents) {
  const file = new URL(name, root);
  if (check) {
    let current;
    try { current = readFileSync(file, 'utf8'); } catch { /* Report a missing generated file. */ }
    if (current !== contents) throw Error(`${name} SEO is stale; run node scripts/build-seo.mjs`);
  } else writeFileSync(file, contents);
}

for (const name of readdirSync(root).filter(name => name.endsWith('.html'))) {
  const current = readFileSync(new URL(name, root), 'utf8');
  const publicPage = pages[name];
  const productPage = name === 'product.html';
  const title = publicPage?.[0] || current.match(/<title>([\s\S]*?)<\/title>/i)[1].trim();
  const description = publicPage?.[1] || (name === 'product.html'
    ? 'Explore collectible commemorative €2 coins at Arkians Collectibles.'
    : 'Manage your account and purchases at Arkians Collectibles.');
  const canonical = domain + (name === 'index.html' ? '' : name);
  const metadata = [
    '  <!-- Generated SEO: start -->',
    `  <meta name="description" content="${escape(description)}">`,
    // Google may skip rendering a page whose original HTML says noindex.
    // Product IDs are resolved by seo.js; leave their initial URL self-canonical.
    `  <meta name="robots" content="${publicPage || productPage ? 'index,follow' : 'noindex,follow'}">`,
    ...(!productPage ? [`  <link rel="canonical" href="${canonical}">`] : []),
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="${brand}">`,
    `  <meta property="og:title" content="${escape(title)}">`,
    `  <meta property="og:description" content="${escape(description)}">`,
    `  <meta property="og:url" content="${canonical}">`,
    `  <meta name="twitter:card" content="summary">`,
  ];
  if (name === 'index.html') {
    const structured = {'@context':'https://schema.org', '@graph':[
      {'@type':'Organization','@id':domain+'#organization', name:brand, url:domain},
      {'@type':'WebSite','@id':domain+'#website', name:brand, url:domain,
        inLanguage:['en','el'], publisher:{'@id':domain+'#organization'}},
    ]};
    metadata.push(`  <script type="application/ld+json">${JSON.stringify(structured)}</script>`);
  }
  metadata.push('  <!-- Generated SEO: end -->');
  let updated = current.replace(/\s*<!-- Generated SEO: start -->[\s\S]*?<!-- Generated SEO: end -->\s*/g, '\n\n');
  updated = updated.replace(/\s*<meta\b[^>]*\bname=(["'])description\1[^>]*>\s*/gi, '\n\n');
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`);
  updated = updated.replace(/(<title>[\s\S]*?<\/title>)\s*/i, `$1\n\n${metadata.join('\n')}\n\n  `);
  if (!/src=["']seo\.js(?:\?[^"']*)?["']/.test(updated)) {
    updated = updated.replace(/(<script src="coin-photos\.js[^" ]*"><\/script>)/, '<script src="seo.js"></script>\n$1');
  }
  save(name, updated);
}

const urls = [...Object.keys(pages).map(name => domain + (name === 'index.html' ? '' : name)),
  ...Object.keys(catalog.products).map(id => `${domain}product.html?id=${Number(id)}`)];
save('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n') + '\n</urlset>\n');
// Keep resources crawlable so Google can render products and read noindex tags.
save('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${domain}sitemap.xml\n`);
