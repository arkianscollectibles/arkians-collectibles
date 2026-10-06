import assert from "node:assert/strict";
import { createCheckoutHandler } from "./checkout.ts";
import catalogue from "../_shared/product-prices.json" with { type: "json" };

type Deps = Parameters<typeof createCheckoutHandler>[0];
function fixture(cart: unknown[], validUser = true, cartError: unknown = null, publishableOnly = false) {
  const captured: { userFilter?: unknown; stripeParams?: Record<string, any>; stripeCalls: number } = { stripeCalls: 0 };
  const env: Record<string, string> = {
    STRIPE_SECRET_KEY: "test-placeholder-not-a-real-key", SUPABASE_URL: "https://example.supabase.co",
    ...(publishableOnly ? {SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({default:"test-publishable"})} : {SUPABASE_ANON_KEY:"test-public"}),
  };
  const client = {
    auth: {getUser: () => Promise.resolve({data: {user: validUser ? {id: "user-A", email:"buyer@example.invalid"} : null}, error: null})},
    from: (table: string) => {
      assert.equal(table, "cart");
      return {select: () => ({eq: (column: string, value: unknown) => {
        assert.equal(column, "user_id"); captured.userFilter = value;
        return Promise.resolve({data: cart, error: cartError});
      }})};
    },
  };
  const handler = createCheckoutHandler({
    env: name => env[name],
    createSupabaseClient: (() => client) as unknown as Deps["createSupabaseClient"],
    createStripeClient: (() => ({checkout: {sessions: {create: (params: Record<string, any>) => {
      captured.stripeCalls++; captured.stripeParams = params;
      return Promise.resolve({url:"https://checkout.stripe.com/test-placeholder"});
    }}}})) as unknown as Deps["createStripeClient"],
  });
  return {handler, captured};
}
function request(body: unknown = {}, authorized = true) {
  return new Request("https://example.invalid/functions/v1/create-checkout-function", {
    method:"POST", headers: {"Content-Type":"application/json", ...(authorized ? {Authorization:"Bearer test-user-session"} : {})},
    body:JSON.stringify(body),
  });
}

Deno.test("all 27 products, including IDs 19–28, have server-authoritative prices", async () => {
  const cart = Object.keys(catalogue.products).map(id=>({coin_id:Number(id),quantity:1}));
  const {handler,captured} = fixture(cart);
  const response = await handler(request({price_cents:1,user_id:"user-B"}));
  assert.equal(response.status,200); assert.equal(captured.userFilter,"user-A");
  const params = captured.stripeParams!;
  assert.equal(params.line_items.length,27);
  assert.equal(params.line_items.reduce((sum:number,item:any)=>sum+item.price_data.unit_amount,0),Object.values(catalogue.products).reduce((sum, product) => sum + product.price_cents, 0));
  assert.equal(params.line_items[0].price_data.unit_amount,catalogue.products[1].price_cents);
  assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount,catalogue.shipping_cents);
  assert.equal(params.customer_email,"buyer@example.invalid");
  assert.equal(params.client_reference_id,"user-A");
  assert.equal(params.success_url,"https://arkianscollectibles.com/success.html?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(params.cancel_url,"https://arkianscollectibles.com/cart.html");
});
Deno.test("quantity and public-key fallback are preserved", async () => {
  const {handler,captured}=fixture([{coin_id:7,quantity:2}],true,null,true);
  assert.equal((await handler(request())).status,200);
  assert.equal(captured.stripeParams!.line_items[0].quantity,2);
  assert.equal(captured.stripeParams!.line_items[0].price_data.unit_amount,catalogue.products[7].price_cents);
});
Deno.test("missing or invalid sessions never create a Stripe session", async () => {
  for(const authorized of [false,true]) {
    const {handler,captured}=fixture([{coin_id:1,quantity:1}],false);
    assert.equal((await handler(request({},authorized))).status,401); assert.equal(captured.stripeCalls,0);
  }
});
Deno.test("unknown IDs and invalid quantities are rejected before calling Stripe", async () => {
  for(const item of [{coin_id:6,quantity:1},{coin_id:1,quantity:0},{coin_id:1,quantity:101},{coin_id:1,quantity:1.5},{coin_id:1.5,quantity:1}]) {
    const {handler,captured}=fixture([item]);
    assert.equal((await handler(request())).status,400); assert.equal(captured.stripeCalls,0);
  }
});
Deno.test("empty carts and cart permission errors do not create payment sessions", async () => {
  for(const [cart,error,status] of [[[],null,400],[[{coin_id:1,quantity:1}],{message:"permission denied"},500]] as const) {
    const {handler,captured}=fixture([...cart],true,error);
    assert.equal((await handler(request())).status,status); assert.equal(captured.stripeCalls,0);
  }
});
Deno.test("preflight and unsupported methods never invoke payment creation", async () => {
  const {handler,captured}=fixture([]);
  assert.equal((await handler(new Request("https://example.invalid",{method:"OPTIONS"}))).status,200);
  assert.equal((await handler(new Request("https://example.invalid"))).status,405);
  assert.equal(captured.stripeCalls,0);
});
