import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import cron from "node-cron";
import { autoFinalizeCupRounds } from "../domain/cups.js";
import { syncAll } from "../domain/fplSync.js";
import { autoFinalizeFinishedGameweeks } from "../domain/standings.js";

export default fp(async (fastify: FastifyInstance) => {
  async function runSync() {
    try {
      const result = await syncAll(fastify.db);
      fastify.log.info({ result }, "FPL sync completed");
    } catch (err) {
      fastify.log.error({ err }, "FPL sync failed");
    }

    try {
      const result = await autoFinalizeFinishedGameweeks(fastify.db);
      if (result.gameweeksFinalized > 0) {
        fastify.log.info({ result }, "Auto-finalized gameweeks");
      }
    } catch (err) {
      fastify.log.error({ err }, "Auto-finalization failed");
    }

    try {
      const result = await autoFinalizeCupRounds(fastify.db);
      if (result.roundsFinalized > 0) {
        fastify.log.info({ result }, "Auto-finalized cup rounds");
      }
    } catch (err) {
      fastify.log.error({ err }, "Cup auto-finalization failed");
    }
  }

  // Sync once at startup so local dev has data without waiting on the cron,
  // then keep it fresh every 30 minutes.
  void runSync();
  cron.schedule("*/30 * * * *", runSync);
});
