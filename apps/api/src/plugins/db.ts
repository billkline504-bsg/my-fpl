import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createDb, type Db } from "@my-fpl/db";
import { env } from "../env.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const db = createDb(env.DATABASE_URL);
  fastify.decorate("db", db);
});
