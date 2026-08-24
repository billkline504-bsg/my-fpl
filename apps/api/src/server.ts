import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { MAX_ICON_SIZE_BYTES } from "@my-fpl/shared";
import authenticatePlugin from "./plugins/authenticate.js";
import dbPlugin from "./plugins/db.js";
import fplSyncSchedulePlugin from "./plugins/fplSyncSchedule.js";
import storagePlugin from "./plugins/storage.js";
import cupRoutes from "./routes/cups.js";
import draftRoutes from "./routes/draft.js";
import fplSyncRoutes from "./routes/fplSync.js";
import healthRoutes from "./routes/health.js";
import leagueRoutes from "./routes/leagues.js";
import playerRoutes from "./routes/players.js";
import playerStatsRoutes from "./routes/playerStats.js";
import profileRoutes from "./routes/profiles.js";
import rosterRoutes from "./routes/rosters.js";
import standingsRoutes from "./routes/standings.js";
import transferRoutes from "./routes/transfers.js";

export async function buildServer() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: true });
  await fastify.register(multipart, { limits: { fileSize: MAX_ICON_SIZE_BYTES } });
  await fastify.register(dbPlugin);
  await fastify.register(authenticatePlugin);
  await fastify.register(storagePlugin);
  await fastify.register(fplSyncSchedulePlugin);

  await fastify.register(healthRoutes);
  await fastify.register(leagueRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(playerRoutes);
  await fastify.register(playerStatsRoutes);
  await fastify.register(fplSyncRoutes);
  await fastify.register(draftRoutes);
  await fastify.register(rosterRoutes);
  await fastify.register(standingsRoutes);
  await fastify.register(transferRoutes);
  await fastify.register(cupRoutes);

  return fastify;
}
