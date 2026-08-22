import type { FastifyInstance } from "fastify";
import { leagues } from "@my-fpl/db";
import { eq } from "drizzle-orm";
import { getActiveRosterPlayers } from "../domain/rosters.js";

export default async function rosterRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/roster", async (request, reply) => {
    const [league] = await fastify.db.select().from(leagues).where(eq(leagues.id, request.params.leagueId));
    if (!league) return reply.code(404).send({ error: "League not found" });

    return getActiveRosterPlayers(fastify.db, {
      leagueId: request.params.leagueId,
      userId: request.user!.id,
      seasonId: league.seasonId,
    });
  });
}
