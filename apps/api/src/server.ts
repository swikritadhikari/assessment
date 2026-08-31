import fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { batchRoutes } from './routes/batch.routes.js';

const bootstrap = async () => {
  const app = fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn'
    }
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ProbePulse Bulk URL Health Checker API',
        description: 'Distributed, high-concurrency bulk URL health checking REST API with BullMQ job queuing, PostgreSQL persistence, Redis caching, and Server-Sent Events.',
        version: '1.0.0'
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: 'Local Server' }
      ],
      tags: [
        { name: 'Batches', description: 'Batch ingestion, status, cancellation, and retry operations' },
        { name: 'Health', description: 'System health probe' }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'API Health Check',
      description: 'Returns server operational status and timestamp',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', example: '2026-08-31T20:00:00.000Z' }
          }
        }
      }
    }
  }, async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await app.register(batchRoutes);
  await initDb();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`[API Server] Running at http://${config.host}:${config.port}`);
    console.log(`[API Server] Swagger documentation available at http://${config.host}:${config.port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`[API Server] Received ${signal}. Shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  }
};

bootstrap().catch((err) => {
  console.error('[API Server] Fatal bootstrap error:', err);
  process.exit(1);
});
