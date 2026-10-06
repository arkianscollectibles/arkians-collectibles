# Existing Supabase connection

Project: `ubgnwgwicaznwfxvbxfg`.
The site uses its existing public publishable key. Never put a `service_role`, secret API key, Google client secret or dashboard password in this repository or chat.

## Google sign-in on the existing domain

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://arkianscollectibles.com`
- Additional Redirect URLs: add `https://arkianscollectibles.com/account.html`.
- If the site is also served on www, add `https://www.arkianscollectibles.com/account.html`.
- Preserve other existing redirects that are still needed. Use exact production URLs rather than wildcard domains.

Google is already enabled in this project. In its Google Cloud OAuth client, keep this Authorized redirect URI:
`https://ubgnwgwicaznwfxvbxfg.supabase.co/auth/v1/callback`.
The application requests only `openid email profile`; it has no Gmail, Drive or ChatGPT integration. The site return URL and Google→Supabase callback are different URLs. No DNS or CNAME change is needed.

## Customer data and personal accounts

Google sign-in gives the application the user's name, picture and email address. It does not grant access to the inbox or ChatGPT conversations. Project administrators can see account emails in Supabase Auth; don't use a personal email to test a customer account if you don't want administrators to see that address. Use a business or separate test account.

Keep Dashboard administrator accounts separate from customer accounts. Share only the project access needed by collaborators, never a personal Google/ChatGPT password, browser profile or authenticated browser session. This repository cannot log out other applications on a work computer.

Before calling customer data protected, run the read-only `access-audit.sql` in SQL Editor and review the actual RLS policies and role grants. Each user's cart, wishlist and orders must be restricted to that user's auth.uid(); order items must inherit ownership from their order. Payment/order creation and payment status changes belong to verified server-side functions, not unrestricted browser writes. Do not disable RLS or grant broad table access to make an error disappear.

## Validation performed / still required

- Auth settings responds HTTP 200 and Google provider is enabled.
- The Google authorize endpoint redirects to accounts.google.com with basic identity scopes.
- Anonymous requests to cart, wishlist and orders fail with HTTP 401 / database permission denied. No customer records were retrieved. This does not prove isolation between authenticated users.
- Frontend return URL, PKCE flow and auth UI can be tested without signing into a real account.
- Still required: verify production Redirect URLs in Dashboard, complete sign-in using a separate test account, verify logout and isolation with a second test account, and inspect existing RLS policies. Checkout/payment functions are a separate check and were not invoked.
