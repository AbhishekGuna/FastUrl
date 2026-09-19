import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import { AuthLoginSchema } from '../schemas/auth.schema.js';
import { auth } from '../services/auth.js';

export async function authRoutes(app: FastifyInstance) {
    app.route({
        method: ['GET', 'POST'],
        url: '/api/auth/*',
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        async handler(request, reply) {
            try {
                const url = new URL(request.url, `http://${request.headers.host}`);
                const headers = fromNodeHeaders(request.headers);

                const req = new Request(url.toString(), {
                    method: request.method,
                    headers,
                    ...(request.body ? { body: JSON.stringify(request.body) } : {}),
                });

                const parsedBody = AuthLoginSchema.safeParse(request.body || {});
                if (!parsedBody.success) {
                    return reply.status(400).send({
                        error: 'Validation Error',
                        details: parsedBody.error.flatten(),
                    });
                }

                const response = await auth.handler(req);
                reply.status(response.status);
                response.headers.forEach((value, key) => {
                    reply.header(key, value);
                });
                return reply.send(response.body ? await response.text() : null);
            } catch (err) {
                app.log.error(err);
                return reply.status(500).send({ error: 'Internal auth error' });
            }
        },
    });
}
