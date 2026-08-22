import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listPlayers } from "../domain/players.js";

const listPlayersQuerySchema = z.object({
  search: z.string().min(1).optional(),
  position: z.enum(["GK", "DEF", "MID", "FWD"]).optional(),
});

export default async function playerRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/players", async (request) => {
    const query = listPlayersQuerySchema.parse(request.query);
    return listPlayers(fastify.db, query);
  });
}
