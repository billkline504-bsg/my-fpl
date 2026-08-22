import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../env.js";

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

// Supabase Auth signs access tokens with a per-project asymmetric key (ES256)
// and publishes the public key via JWKS, rather than a shared HS256 secret.
const jwks = createRemoteJWKSet(new URL("/auth/v1/.well-known/jwks.json", env.SUPABASE_URL));

async function verifyBearerToken(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, jwks);
    if (typeof payload.sub !== "string") {
      return reply.code(401).send({ error: "Invalid token subject" });
    }
    request.user = { id: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("user", undefined);
  fastify.decorate("authenticate", verifyBearerToken);
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: typeof verifyBearerToken;
  }
}
