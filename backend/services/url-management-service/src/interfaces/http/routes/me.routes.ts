import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.middleware.js';

export async function meRoutes(app: FastifyInstance) {
    app.get('/api/me', { preHandler: requireAuth }, async (request) => {
        return { user: request.user };
    });
}
