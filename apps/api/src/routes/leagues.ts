import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  AlreadyMemberError,
  createLeague,
  getLeagueMembers,
  joinLeagueByInviteCode,
  LeagueFullError,
  LeagueNotFoundError,
  listMyLeagues,
  ProfileRequiredError,
} from "../domain/leagues.js";
import { getOrCreateDefaultSeason, NotCommissionerError, SeasonAlreadyActiveError, startNextSeasonForLeague } from "../domain/seasons.js";

const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  seasonId: z.string().uuid().optional(),
});

const joinLeagueSchema = z.object({
  inviteCode: z.string().min(1),
});

const startNextSeasonSchema = z.object({
  label: z.string().min(1).max(50),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

function sendDomainError(reply: FastifyReply, err: unknown) {
  if (err instanceof LeagueNotFoundError) return reply.code(404).send({ error: err.message });
  if (err instanceof LeagueFullError) return reply.code(409).send({ error: err.message });
  if (err instanceof AlreadyMemberError) return reply.code(409).send({ error: err.message });
  if (err instanceof ProfileRequiredError) return reply.code(400).send({ error: err.message });
  if (err instanceof NotCommissionerError) return reply.code(403).send({ error: err.message });
  if (err instanceof SeasonAlreadyActiveError) return reply.code(409).send({ error: err.message });
  throw err;
}

export default async function leagueRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/leagues", async (request) => {
    return listMyLeagues(fastify.db, request.user!.id);
  });

  fastify.post("/leagues", async (request, reply) => {
    const body = createLeagueSchema.parse(request.body);
    try {
      const seasonId = body.seasonId ?? (await getOrCreateDefaultSeason(fastify.db)).id;
      const league = await createLeague(fastify.db, { name: body.name, seasonId, commissionerId: request.user!.id });
      return reply.code(201).send(league);
    } catch (err) {
      return sendDomainError(reply, err);
    }
  });

  fastify.post("/leagues/join", async (request, reply) => {
    const body = joinLeagueSchema.parse(request.body);
    try {
      const league = await joinLeagueByInviteCode(fastify.db, { ...body, userId: request.user!.id });
      return league;
    } catch (err) {
      return sendDomainError(reply, err);
    }
  });

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/members", async (request) => {
    return getLeagueMembers(fastify.db, request.params.leagueId);
  });

  fastify.post<{ Params: { leagueId: string } }>("/leagues/:leagueId/seasons", async (request, reply) => {
    const body = startNextSeasonSchema.parse(request.body);
    try {
      const league = await startNextSeasonForLeague(fastify.db, {
        leagueId: request.params.leagueId,
        requestedByUserId: request.user!.id,
        ...body,
      });
      return reply.code(201).send(league);
    } catch (err) {
      return sendDomainError(reply, err);
    }
  });
}
