import type { FastifyInstance } from "fastify";
import { autoFinalizeCupRounds } from "../domain/cups.js";
import { syncAll } from "../domain/fplSync.js";
import { autoFinalizeFinishedGameweeks } from "../domain/standings.js";

export default async function fplSyncRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/fpl/sync", async () => {
    const result = await syncAll(fastify.db);
    const finalized = await autoFinalizeFinishedGameweeks(fastify.db);
    const cupsFinalized = await autoFinalizeCupRounds(fastify.db);
    return { ...result, finalized, cupsFinalized };
  });
}
