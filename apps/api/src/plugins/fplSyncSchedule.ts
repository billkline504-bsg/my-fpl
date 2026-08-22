import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import cron from "node-cron";
import { syncAll } from "../domain/fplSync.js";

export default fp(async (fastify: FastifyInstance) => {
  async function runSync() {
    try {
      const result = await syncAll(fastify.db);
      fastify.log.info({ result }, "FPL sync completed");
    } catch (err) {
      fastify.log.error({ err }, "FPL sync failed");
    }
  }

  // Sync once at startup so local dev has data without waiting on the cron,
  // then keep it fresh every 30 minutes.
  void runSync();
  cron.schedule("*/30 * * * *", runSync);
});
