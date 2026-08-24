import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env.js";

// Service-role client used server-side only, to upload icons to Supabase
// Storage on the user's behalf after our own auth/permission checks.
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export type Storage = SupabaseClient["storage"];

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate("storage", supabaseAdmin.storage);
});

declare module "fastify" {
  interface FastifyInstance {
    storage: Storage;
  }
}
