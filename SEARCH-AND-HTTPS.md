# HTTPS, Google and catalogue maintenance

The production domain stays `arkianscollectibles.com`; `CNAME` and DNS are unchanged.

## HTTPS verified on 8 October 2026

HTTPS serves the site with a valid certificate covering the apex and `www`. The `www` HTTPS address redirects to the apex. HTTP returned the same HTML with status 200, without a server redirect.

`https-redirect.js` now redirects ordinary HTTP visitors to HTTPS before the rest of the page loads. This browser redirect cannot protect the initial HTTP request. An authorized repository administrator must enable **Enforce HTTPS** in [GitHub Settings → Pages](https://github.com/arkianscollectibles/arkians-collectibles/settings/pages) so the server redirects every HTTP visitor. Although GitHub advertises push permission for the connected user, the integration rejected both source writes and pull request creation on the live repository with HTTP 403. The complete update is saved on the fork branch `christinetzebelekoy-droid/arkians-collectibles:codex/seo-security-2026-10-08`. Publishing it requires a signed-in repository owner to create and merge the comparison. Administration access was also unavailable.

All page templates use a `no-referrer` policy, disable embedded objects and external base/form destinations, and request insecure subresources be upgraded. The Supabase browser SDK is now an unchanged local copy of version 2.117.3 instead of a mutable `@2` CDN request. See `THIRD-PARTY-NOTICES.md`. These frontend changes do not establish the security of remote Supabase RLS rules, payment webhooks or Stripe settings.

## Crawlable product pages

Every active catalogue product has generated `product-N.html` with its actual title, visible details, image, price, canonical URL and Product JSON-LD in the initial HTML. Product links and the sitemap use these URLs. Existing `product.html?id=N` links continue working and specify the generated URL as their canonical after rendering.

The shared `product-seo.js` builder is used in the generator and browser. The schema declares confirmed availability, actual EUR prices, a reference to the common shipping service, and the published 14-day withdrawal policy with return postage paid by the customer. The common shipping service is described on the homepage and `terms.html`, with €3 standard shipping to the 27 checkout destinations. The published total estimate remains 3–10 business days; separate handling/transit estimates are not invented.

Brand, GTIN and MPN are included only when genuine catalogue fields are supplied. Internal SKU is not a manufacturer identifier. Products without assigned identifiers may retain Google's optional identifier warning. No reviews, ratings, manufacturer brands, stock expiry or price expiry are fabricated.

The homepage identifies `Arkians Collectibles` consistently through title, visible heading, Open Graph, WebSite and OnlineStore metadata. Store contact information comes from the published business terms. The existing Google verification tag is preserved.

`robots.txt` allows crawling, including JavaScript. The sitemap contains 8 public information/catalogue pages and 67 product pages. Account, cart, wishlist, profile, order history, search and payment results remain `noindex`. This is an indexing instruction, not access control.

## Build and verify after edits

```powershell
node scripts/build-prices.mjs
node scripts/build-prices.mjs --check
node scripts/test-product-seo.mjs
node scripts/test-generated-seo.mjs
```

The price generator also runs the SEO generator, regenerates static products and asset cache tags. Edit the authoritative `supabase/functions/_shared/product-prices.json`, not the generated copies. Price changes also require the separate Supabase checkout deployment in `supabase/PRICES.md` before the new prices are announced.

## Remaining Google account actions

The public [Rich Results Test](https://search.google.com/test/rich-results) can test a generated product without logging in. After publication, use [Search Console](https://search.google.com/search-console) to inspect the homepage and a product, submit `https://arkianscollectibles.com/sitemap.xml`, request indexing where allowed, and validate the existing merchant warnings. These account actions were not submitted during this update because Search Console required sign-in.

Google controls crawl timing, inclusion and ranking. Correct metadata and a submitted sitemap do not guarantee an immediate result for a branded search.
