import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getProfile, upsertProfile } from "../domain/profiles.js";

const upsertProfileSchema = z.object({
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
});

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/profiles/me", async (request, reply) => {
    const profile = await getProfile(fastify.db, request.user!.id);
    if (!profile) return reply.code(404).send({ error: "Profile not found" });
    return profile;
  });

  fastify.put("/profiles/me", async (request) => {
    const body = upsertProfileSchema.parse(request.body);
    return upsertProfile(fastify.db, { id: request.user!.id, ...body });
  });
}
