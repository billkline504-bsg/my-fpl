import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  finalizeGameweek,
  GameweekNotFoundError,
  generateSeasonSchedule,
  getMatchupsForGameweek,
  getStandings,
  NoGameweeksError,
  NotCommissionerError,
  NotEnoughMembersError,
  ScheduleAlreadyExistsError,
} from "../domain/standings.js";
import { getLeagueHistory } from "../domain/leagueHistory.js";

const gameweekQuerySchema = z.object({
  gameweek: z.coerce.number().int().min(1),
});

function sendStandingsError(reply: FastifyReply, err: unknown) {
  if (err instanceof NotCommissionerError) return reply.code(403).send({ error: err.message });
  if (err instanceof ScheduleAlreadyExistsError) return reply.code(409).send({ error: err.message });
  if (err instanceof NotEnoughMembersError) return reply.code(409).send({ error: err.message });
  if (err instanceof NoGameweeksError) return reply.code(409).send({ error: err.message });
  if (err instanceof GameweekNotFoundError) return reply.code(404).send({ error: err.message });
  throw err;
}

export default async function standingsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post<{ Params: { leagueId: string } }>("/leagues/:leagueId/schedule", async (request, reply) => {
    try {
      const result = await generateSeasonSchedule(fastify.db, {
        leagueId: request.params.leagueId,
        requestedByUserId: request.user!.id,
      });
      return reply.code(201).send(result);
    } catch (err) {
      return sendStandingsError(reply, err);
    }
  });

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/standings", async (request) => {
    return getStandings(fastify.db, request.params.leagueId);
  });

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/history", async (request) => {
    return getLeagueHistory(fastify.db, request.params.leagueId);
  });

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/matchups", async (request) => {
    const query = gameweekQuerySchema.parse(request.query);
    return getMatchupsForGameweek(fastify.db, { leagueId: request.params.leagueId, gameweekNumber: query.gameweek });
  });

  fastify.post<{ Params: { leagueId: string; gameweekNumber: string } }>(
    "/leagues/:leagueId/gameweeks/:gameweekNumber/finalize",
    async (request, reply) => {
      try {
        return await finalizeGameweek(fastify.db, {
          leagueId: request.params.leagueId,
          requestedByUserId: request.user!.id,
          gameweekNumber: Number(request.params.gameweekNumber),
        });
      } catch (err) {
        return sendStandingsError(reply, err);
      }
    },
  );
}
