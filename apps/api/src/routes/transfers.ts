import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createTransferWindow,
  getTransferWindow,
  makeTransfer,
  NotCommissionerError,
  PlayerAlreadyOwnedError,
  PlayerNotOnRosterError,
  TransferWindowClosedError,
  TransferWindowExistsError,
  TransferWindowNotFoundError,
} from "../domain/transfers.js";
import { PositionCapExceededError } from "../domain/draft.js";

const createWindowSchema = z.object({
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  postWindowDraftPickCount: z.number().int().min(1).max(15),
});

const makeTransferSchema = z.object({
  playerOutId: z.string().uuid(),
  playerInId: z.string().uuid(),
});

function sendTransferError(reply: FastifyReply, err: unknown) {
  if (err instanceof NotCommissionerError) return reply.code(403).send({ error: err.message });
  if (err instanceof TransferWindowExistsError) return reply.code(409).send({ error: err.message });
  if (err instanceof TransferWindowNotFoundError) return reply.code(404).send({ error: err.message });
  if (err instanceof TransferWindowClosedError) return reply.code(409).send({ error: err.message });
  if (err instanceof PlayerNotOnRosterError) return reply.code(409).send({ error: err.message });
  if (err instanceof PlayerAlreadyOwnedError) return reply.code(409).send({ error: err.message });
  if (err instanceof PositionCapExceededError) return reply.code(409).send({ error: err.message });
  throw err;
}

export default async function transferRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/transfer-window", async (request) => {
    return getTransferWindow(fastify.db, request.params.leagueId);
  });

  fastify.post<{ Params: { leagueId: string } }>("/leagues/:leagueId/transfer-window", async (request, reply) => {
    const body = createWindowSchema.parse(request.body);
    try {
      const window = await createTransferWindow(fastify.db, {
        leagueId: request.params.leagueId,
        requestedByUserId: request.user!.id,
        opensAt: new Date(body.opensAt),
        closesAt: new Date(body.closesAt),
        postWindowDraftPickCount: body.postWindowDraftPickCount,
      });
      return reply.code(201).send(window);
    } catch (err) {
      return sendTransferError(reply, err);
    }
  });

  fastify.post<{ Params: { leagueId: string } }>("/leagues/:leagueId/transfers", async (request, reply) => {
    const body = makeTransferSchema.parse(request.body);
    try {
      return await makeTransfer(fastify.db, {
        leagueId: request.params.leagueId,
        userId: request.user!.id,
        ...body,
      });
    } catch (err) {
      return sendTransferError(reply, err);
    }
  });
}
