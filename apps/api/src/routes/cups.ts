import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createCupEvent,
  listCupsForLeague,
  setCupIcon,
  CupAlreadyActiveError,
  CupNotFoundError,
  NotCommissionerError,
  NotEnoughEntrantsError,
  StartingGameweekNotFoundError,
} from "../domain/cups.js";
import { InvalidIconFileError } from "../domain/icons.js";

const createCupSchema = z.object({
  name: z.string().min(1).max(100),
  format: z.enum(["single", "double"]),
  startingGameweekNumber: z.number().int().min(1).max(38),
  configuredRounds: z.number().int().min(1).max(10).optional(),
});

function sendCupError(reply: FastifyReply, err: unknown) {
  if (err instanceof NotCommissionerError) return reply.code(403).send({ error: err.message });
  if (err instanceof CupAlreadyActiveError) return reply.code(409).send({ error: err.message });
  if (err instanceof NotEnoughEntrantsError) return reply.code(409).send({ error: err.message });
  if (err instanceof StartingGameweekNotFoundError) return reply.code(404).send({ error: err.message });
  if (err instanceof CupNotFoundError) return reply.code(404).send({ error: err.message });
  if (err instanceof InvalidIconFileError) return reply.code(400).send({ error: err.message });
  throw err;
}

export default async function cupRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get<{ Params: { leagueId: string } }>("/leagues/:leagueId/cups", async (request) => {
    return listCupsForLeague(fastify.db, request.params.leagueId);
  });

  fastify.post<{ Params: { leagueId: string } }>("/leagues/:leagueId/cups", async (request, reply) => {
    const body = createCupSchema.parse(request.body);
    try {
      const cup = await createCupEvent(fastify.db, {
        leagueId: request.params.leagueId,
        requestedByUserId: request.user!.id,
        ...body,
      });
      return reply.code(201).send(cup);
    } catch (err) {
      return sendCupError(reply, err);
    }
  });

  fastify.post<{ Params: { leagueId: string; cupEventId: string } }>(
    "/leagues/:leagueId/cups/:cupEventId/icon",
    async (request, reply) => {
      const file = await request.file();
      if (!file) return reply.code(400).send({ error: "No file uploaded" });
      const buffer = await file.toBuffer();
      try {
        const cup = await setCupIcon(fastify.db, fastify.storage, {
          leagueId: request.params.leagueId,
          cupEventId: request.params.cupEventId,
          requestedByUserId: request.user!.id,
          buffer,
          mimeType: file.mimetype,
        });
        return cup;
      } catch (err) {
        return sendCupError(reply, err);
      }
    },
  );
}
