import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createDraftEvent,
  DraftAlreadyActiveError,
  DraftNotFoundError,
  DraftNotInProgressError,
  DraftNotPendingError,
  getDraftForLeague,
  InitialDraftAlreadyExistsError,
  InitialDraftNotCompleteError,
  listAvailableDraftPlayers,
  makeDraftPick,
  NoLeagueMembersError,
  NotCommissionerError,
  NotYourTurnError,
  PlayerAlreadyDraftedError,
  PositionCapExceededError,
  startDraftEvent,
  TransferWindowNotClosedError,
} from "../domain/draft.js";

const createDraftSchema = z.object({
  type: z.enum(["initial", "post_transfer"]),
  pickCount: z.number().int().min(1).max(15),
});

const availablePlayersQuerySchema = z.object({
  search: z.string().min(1).optional(),
  position: z.enum(["GK", "DEF", "MID", "FWD"]).optional(),
});

const makePickSchema = z.object({
  playerId: z.string().uuid(),
});

function sendDraftError(reply: FastifyReply, err: unknown) {
  if (err instanceof NotCommissionerError) return reply.code(403).send({ error: err.message });
  if (err instanceof DraftAlreadyActiveError) return reply.code(409).send({ error: err.message });
  if (err instanceof DraftNotFoundError) return reply.code(404).send({ error: err.message });
  if (err instanceof DraftNotPendingError) return reply.code(409).send({ error: err.message });
  if (err instanceof DraftNotInProgressError) return reply.code(409).send({ error: err.message });
  if (err instanceof NoLeagueMembersError) return reply.code(409).send({ error: err.message });
  if (err instanceof NotYourTurnError) return reply.code(409).send({ error: err.message });
  if (err instanceof PlayerAlreadyDraftedError) return reply.code(409).send({ error: err.message });
  if (err instanceof PositionCapExceededError) return reply.code(409).send({ error: err.message });
  if (err instanceof InitialDraftAlreadyExistsError) return reply.code(409).send({ error: err.message });
  if (err instanceof InitialDraftNotCompleteError) return reply.code(409).send({ error: err.message });
  if (err instanceof TransferWindowNotClosedError) return reply.code(409).send({ error: err.message });
  throw err;
}

export default async function draftRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/draft", async (request) => {
    return getDraftForLeague(fastify.db, request.params.leagueId);
  });

  fastify.post<{ Params: { leagueId: string } }>("/leagues/:leagueId/draft", async (request, reply) => {
    const body = createDraftSchema.parse(request.body);
    try {
      const draftEvent = await createDraftEvent(fastify.db, {
        leagueId: request.params.leagueId,
        requestedByUserId: request.user!.id,
        ...body,
      });
      return reply.code(201).send(draftEvent);
    } catch (err) {
      return sendDraftError(reply, err);
    }
  });

  fastify.post<{ Params: { leagueId: string; draftEventId: string } }>(
    "/leagues/:leagueId/draft/:draftEventId/start",
    async (request, reply) => {
      try {
        return await startDraftEvent(fastify.db, {
          leagueId: request.params.leagueId,
          draftEventId: request.params.draftEventId,
          requestedByUserId: request.user!.id,
        });
      } catch (err) {
        return sendDraftError(reply, err);
      }
    },
  );

  fastify.get<{ Params: { leagueId: string } }>(
    "/leagues/:leagueId/draft/available-players",
    async (request) => {
      const query = availablePlayersQuerySchema.parse(request.query);
      const draft = await getDraftForLeague(fastify.db, request.params.leagueId);
      if (!draft) return [];
      return listAvailableDraftPlayers(fastify.db, { leagueId: request.params.leagueId, seasonId: draft.seasonId, ...query });
    },
  );

  fastify.post<{ Params: { leagueId: string } }>("/leagues/:leagueId/draft/pick", async (request, reply) => {
    const body = makePickSchema.parse(request.body);
    try {
      return await makeDraftPick(fastify.db, {
        leagueId: request.params.leagueId,
        userId: request.user!.id,
        playerId: body.playerId,
      });
    } catch (err) {
      return sendDraftError(reply, err);
    }
  });
}
