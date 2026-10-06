# Prices shared by the site and Stripe checkout

Authoritative file: `supabase/functions/_shared/product-prices.json`.

- Prices are euro cents: `100` = €1.00, `1499` = €14.99, `1999` = €19.99.
- `shipping_cents` is the shipping charge per order (currently `300`, i.e. €3.00 for every supported destination).
- Product IDs match `app.js`. All 37 current coins are included, including IDs 19–28 which were missing from the supplied function.
- All 37 current coins are priced at €14.99 each. Cards/Proof are still display-only templates.
- Stripe receives the price from the server catalogue and the quantity from the authenticated user's database cart. Request-body prices are ignored.

After changing a price, run from the repository root:

```powershell
node scripts/build-prices.mjs
node scripts/build-prices.mjs --check
```

This generates `product-prices.js` for the website and `supabase/dashboard/create-checkout-function.ts` for Dashboard deployment. Never edit these generated copies manually. Product page, search, wishlist and cart all obtain prices from the generated browser catalogue. Cart shipping and total match the same configured shipping amount.

## Deployment required in two places

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
