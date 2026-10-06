import type Stripe from "npm:stripe@22.6.2";
import type { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.117.2/cors";
import priceCatalog from "../_shared/product-prices.json" with { type: "json" };

type Product = { name: string; price_cents: number; colored?: boolean };
const PRODUCTS: Record<string, Product> = priceCatalog.products;
const SHIPPING_CENTS = priceCatalog.shipping_cents;

type Dependencies = {
  env: (name: string) => string | undefined;
  createSupabaseClient: typeof createClient;
  createStripeClient: (secret: string) => Pick<Stripe, "checkout">;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabasePublicKey(env: Dependencies["env"]): string | null {
  const legacyKey = env("SUPABASE_ANON_KEY");
  if (legacyKey) return legacyKey;
  const publishableKeys = env("SUPABASE_PUBLISHABLE_KEYS");
  if (!publishableKeys) return null;
  try {
    const parsed = JSON.parse(publishableKeys);
    const key = parsed.default || Object.values(parsed)[0];
    return typeof key === "string" && key ? key : null;
  } catch { return null; }
}

export function createCheckoutHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jsonResponse({ error: "You must be logged in" }, 401);
      const stripeSecret = deps.env("STRIPE_SECRET_KEY");
      const supabaseUrl = deps.env("SUPABASE_URL");
      const supabaseKey = getSupabasePublicKey(deps.env);
      if (!stripeSecret) return jsonResponse({ error: "Stripe secret key is missing" }, 500);
      if (!supabaseUrl || !supabaseKey) return jsonResponse({ error: "Supabase configuration is missing" }, 500);
      const supabase = deps.createSupabaseClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return jsonResponse({ error: "Invalid user session" }, 401);
      const { data: cart, error: cartError } = await supabase.from("cart")
        .select("coin_id, quantity").eq("user_id", user.id);
      if (cartError) return jsonResponse({ error: "Could not load cart" }, 500);
      if (!cart?.length) return jsonResponse({ error: "Your cart is empty" }, 400);
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      for (const item of cart) {
        const coinId = Number(item.coin_id);
        const quantity = Number(item.quantity);
        if (!Number.isSafeInteger(coinId) || coinId < 1) return jsonResponse({ error: "Invalid coin ID" }, 400);
        const product = PRODUCTS[coinId];
        if (!product) return jsonResponse({ error: `Unknown coin ID: ${coinId}` }, 400);
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
          return jsonResponse({ error: `Invalid quantity for coin ${coinId}` }, 400);
        }
        if (!Number.isSafeInteger(product.price_cents) || product.price_cents < 0) {
          throw new Error(`Invalid price configuration for coin ${coinId}`);
        }
        // Always use the server's catalogue; request-body prices are ignored.
        lineItems.push({ quantity, price_data: {
          currency: "eur", unit_amount: product.price_cents,
          product_data: { name: product.colored === false ? `${product.name} (Uncoloured)` : product.name },
        } });
      }
      if (!Number.isSafeInteger(SHIPPING_CENTS) || SHIPPING_CENTS < 0) {
        throw new Error("Invalid shipping price configuration");
      }
      const stripe = deps.createStripeClient(stripeSecret);
      const session = await stripe.checkout.sessions.create({
        mode: "payment", line_items: lineItems,
        shipping_address_collection: { allowed_countries: [
          "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
          "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
        ] },
        shipping_options: [{ shipping_rate_data: {
          type: "fixed_amount", fixed_amount: { amount: SHIPPING_CENTS, currency: "eur" },
          display_name: "EU Shipping",
        } }],
        phone_number_collection: { enabled: true },
        customer_email: user.email ?? undefined,
        client_reference_id: user.id, metadata: { user_id: user.id },
        success_url: "https://arkianscollectibles.com/success.html?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://arkianscollectibles.com/cart.html",
      });
      if (!session.url) return jsonResponse({ error: "Stripe checkout URL was not returned" }, 500);
      return jsonResponse({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      return jsonResponse({ error: "Checkout failed" }, 500);
    }
  };
}
