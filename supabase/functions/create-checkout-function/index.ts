import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createCheckoutHandler } from "./checkout.ts";

Deno.serve(createCheckoutHandler({
  env: (name) => Deno.env.get(name),
  createSupabaseClient: createClient,
  createStripeClient: (secret) => new Stripe(secret),
}));
