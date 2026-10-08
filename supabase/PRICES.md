# Prices shared by the site and Stripe checkout

Authoritative file: `supabase/functions/_shared/product-prices.json`.

- Prices are euro cents: `100` = €1.00, `1499` = €14.99, `1999` = €19.99.
- `shipping_cents` is the shipping charge per order (currently `300`, i.e. €3.00 for every supported destination).
- Product IDs match `app.js`. All 67 current products are included: 37 coloured coins and 30 matching uncoloured editions. Uncoloured IDs are their coloured counterpart's ID plus 37; the 7 remaining IDs are reserved but inactive until genuine images are acquired.
- All current coins are priced at €14.99 each. Cards/Proof are still display-only templates.
- Stripe receives the price from the server catalogue and the quantity from the authenticated user's database cart. Request-body prices are ignored.

After changing a price, run from the repository root:

```powershell
node scripts/build-prices.mjs
node scripts/build-prices.mjs --check
```

This generates `product-prices.js` for the website and `supabase/dashboard/create-checkout-function.ts` for Dashboard deployment. Never edit these generated copies manually. It also updates every local JavaScript/CSS cache tag in the HTML from the file contents, including template edits and frontend fixes. Run the generator after changing those files as well; `--check` detects stale tags. Product page, search, wishlist and cart all obtain prices from the generated browser catalogue. Cart shipping and total match the same configured shipping amount.

## Deployment required in two places

The price generator also rebuilds each `product-N.html`, its initial Product JSON-LD, canonical link, visible price, availability and shipping charge, as well as the sitemap and store policies. This keeps Google's data tied to the same authoritative price source. Run `node scripts/test-product-seo.mjs` and `node scripts/test-generated-seo.mjs` before publication. If a product is removed, the generator removes only its explicitly marked generated page; it does not remove a hand-written HTML page.

Optional `availability` accepts a Schema.org availability name or HTTPS URL. All 67 products were confirmed available on 8 October 2026. Real manufacturer identifiers can be supplied as strings in `brand`, `mpn`, `gtin`, or the specific `gtin8`, `gtin12`, `gtin13`, `gtin14`. Do not invent identifiers; checksum validation does not establish that the manufacturer assigned one. Changing product availability must also be enforced in the backend before publication, so unavailable stock cannot be paid for through an existing cart.

A Git push publishes the website, not the Supabase function. Updating the source does not automatically update either live deployment.

1. In Supabase → Edge Functions → create-checkout-function → Code, replace the current entrypoint code with the entire generated `supabase/dashboard/create-checkout-function.ts` file and deploy it. That file is standalone, so no extra Dashboard files are needed. Keep existing JWT verification settings and existing secrets. No secret values are in the generated file. Preserve `STRIPE_SECRET_KEY` in Supabase secrets; do not copy it into the repository or chat.
2. Publish the GitHub Pages source containing the matching generated `product-prices.js`. The generator updates the `?v=` in HTML automatically to invalidate older price caches. Refresh the website and confirm the cart agrees with Stripe. Existing open checkout sessions may retain the older price; verify a newly created session.

Both live deployments must be updated before announcing a price change. The corrected success/cancel URLs use `arkianscollectibles.com` and do not change DNS or CNAME.

If using the Supabase CLI instead of the Dashboard, the normal function entrypoint is `supabase/functions/create-checkout-function/index.ts`; it imports the shared JSON directly. Use an authorized project account and preserve the existing gateway JWT configuration. This task did not obtain a Supabase management credential or deploy the remote function.

## Local verification

With Deno installed:

```powershell
deno check --lock=supabase/deno.lock --frozen supabase/functions/create-checkout-function/index.ts supabase/dashboard/create-checkout-function.ts
deno test --lock=supabase/deno.lock --frozen supabase/functions/create-checkout-function/checkout_test.ts
```

Tests use fake Supabase/Stripe clients and create no real payment sessions. Check the real integration using Stripe test mode and a separate test customer account after deployment; do not treat unit checks as proof of live Stripe payment completion. The order-verification/webhook functions were not provided and are unchanged.
