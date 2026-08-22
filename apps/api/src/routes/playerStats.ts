import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { getPlayerSeasonStats, PlayerNotFoundError } from "../domain/playerStats.js";

const querySchema = z.object({
  seasonId: z.string().uuid().optional(),
});

function sendPlayerStatsError(reply: FastifyReply, err: unknown) {
  if (err instanceof PlayerNotFoundError) return reply.code(404).send({ error: err.message });
  throw err;
}

export default async function playerStatsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get<{ Params: { playerId: string } }>("/players/:playerId/stats", async (request, reply) => {
    const query = querySchema.parse(request.query);
    try {
      return await getPlayerSeasonStats(fastify.db, { playerId: request.params.playerId, ...query });
    } catch (err) {
      return sendPlayerStatsError(reply, err);
    }
  });
}
