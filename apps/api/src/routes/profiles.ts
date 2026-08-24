import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getProfile, setMyIcon, upsertProfile } from "../domain/profiles.js";
import { InvalidIconFileError } from "../domain/icons.js";

const upsertProfileSchema = z.object({
  displayName: z.string().min(1).max(50),
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

  fastify.post("/profiles/me/icon", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "No file uploaded" });
    const buffer = await file.toBuffer();
    try {
      return await setMyIcon(fastify.db, fastify.storage, {
        userId: request.user!.id,
        buffer,
        mimeType: file.mimetype,
      });
    } catch (err) {
      if (err instanceof InvalidIconFileError) return reply.code(400).send({ error: err.message });
      throw err;
    }
  });
}
