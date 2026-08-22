import type { FastifyInstance } from "fastify";
import { syncAll } from "../domain/fplSync.js";

export default async function fplSyncRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/fpl/sync", async () => {
    return syncAll(fastify.db);
  });
}
