import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../services/auth.js';

declare module 'fastify' {
    interface FastifyRequest {
        user?: (typeof auth.$Infer.Session)['user'];
        session?: (typeof auth.$Infer.Session)['session'];
    }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
    const result = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
    });

    if (!result) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }

    request.user = result.user;
    request.session = result.session;
}
