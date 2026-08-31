import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { BatchService } from '../services/batch.service.js';
import { SseService } from '../services/sse.service.js';
import { parseUrlsFromText, createBatchSchema, StatusCodes } from '@healthchecker/shared';

interface JsonRequestBody {
  name?: string;
  urls?: string[] | string;
}

interface BatchIdParams {
  id: string;
}

export const batchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/batches', {
    schema: {
      tags: ['Batches'],
      summary: 'Create and enqueue a new URL health check batch',
      description: 'Accepts either JSON { name, urls } or multipart/form-data with file upload or text. URLs are validated, deduplicated, persisted in PostgreSQL, and enqueued as individual BullMQ jobs.',
      consumes: ['application/json', 'multipart/form-data'],
      response: {
        201: {
          type: 'object',
          properties: {
            batchId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: { type: 'string', example: 'PROCESSING' },
            totalUrls: { type: 'number', example: 10 },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    }
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      let name: string | undefined;
      const rawUrls: string[] = [];

      const isMultipart = req.isMultipart();

      if (isMultipart) {
        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === 'file') {
            const buffer = await part.toBuffer();
            const content = buffer.toString('utf-8');
            const parsed = parseUrlsFromText(content);
            rawUrls.push(...parsed);
            if (!name && part.filename) {
              name = part.filename.replace(/\.[^/.]+$/, '');
            }
          } else if (part.type === 'field') {
            if (part.fieldname === 'name' && typeof part.value === 'string') {
              name = part.value;
            } else if (part.fieldname === 'urls' && typeof part.value === 'string') {
              rawUrls.push(...parseUrlsFromText(part.value));
            }
          }
        }
      } else {
        const body = req.body as JsonRequestBody | undefined;
        if (body) {
          name = body.name;
          if (Array.isArray(body.urls)) {
            for (const u of body.urls) {
              rawUrls.push(...parseUrlsFromText(String(u)));
            }
          } else if (typeof body.urls === 'string') {
            rawUrls.push(...parseUrlsFromText(body.urls));
          }
        }
      }

      const uniqueUrls = Array.from(new Set(rawUrls));

      const validation = createBatchSchema.safeParse({
        name,
        urls: uniqueUrls
      });

      if (!validation.success) {
        return reply.status(StatusCodes.BAD_REQUEST).send({
          statusCode: StatusCodes.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Validation failed',
          details: validation.error.flatten().fieldErrors
        });
      }

      const batch = await BatchService.createBatch({
        name: validation.data.name,
        urls: validation.data.urls
      });

      return reply.status(StatusCodes.CREATED).send(batch);
    } catch (error) {
      req.log.error({ err: error }, 'Failed to create batch');
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred while creating batch'
      });
    }
  });

  fastify.get('/api/batches', {
    schema: {
      tags: ['Batches'],
      summary: 'List recent batches',
      description: 'Returns the most recent 50 batches. Results are served from a 30-second Redis cache and automatically invalidated on batch state mutations.',
      response: {
        200: {
          type: 'object',
          properties: {
            batches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                  totalUrls: { type: 'number' },
                  completedUrls: { type: 'number' },
                  successfulUrls: { type: 'number' },
                  failedUrls: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            total: { type: 'number' },
            cachedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const list = await BatchService.listBatches();
      return reply.send(list);
    } catch (error) {
      req.log.error({ err: error }, 'Failed to list batches');
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An error occurred while fetching batch list'
      });
    }
  });

  fastify.get<{ Params: BatchIdParams }>('/api/batches/:id', {
    schema: {
      tags: ['Batches'],
      summary: 'Get single batch detail with all URL checks',
      description: 'Returns full batch status and all individual URL check results including HTTP status codes, latency, page titles, and attempts.',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Batch UUID' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: { type: 'string' },
            totalUrls: { type: 'number' },
            completedUrls: { type: 'number' },
            successfulUrls: { type: 'number' },
            failedUrls: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  batchId: { type: 'string', format: 'uuid' },
                  url: { type: 'string' },
                  status: { type: 'string' },
                  httpStatus: { type: 'number', nullable: true },
                  responseTimeMs: { type: 'number', nullable: true },
                  pageTitle: { type: 'string', nullable: true },
                  errorMessage: { type: 'string', nullable: true },
                  attempts: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  completedAt: { type: 'string', format: 'date-time', nullable: true }
                }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 404 },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params;
      const batch = await BatchService.getBatchById(id);
      if (!batch) {
        return reply.status(StatusCodes.NOT_FOUND).send({
          statusCode: StatusCodes.NOT_FOUND,
          error: 'Not Found',
          message: `Batch with ID "${id}" was not found.`
        });
      }
      return reply.send(batch);
    } catch (error) {
      req.log.error({ err: error }, 'Failed to retrieve batch');
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An error occurred while fetching batch details'
      });
    }
  });

  fastify.get<{ Params: BatchIdParams }>('/api/batches/:id/events', {
    schema: {
      tags: ['Batches'],
      summary: 'Server-Sent Events (SSE) live progress stream',
      description: 'Establishes a real-time SSE stream subscribing to Redis Pub/Sub channel for live URL check completions, failures, cancellations, and retries.',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Batch UUID' }
        },
        required: ['id']
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params;
      const batch = await BatchService.getBatchById(id);
      if (!batch) {
        return reply.status(StatusCodes.NOT_FOUND).send({
          statusCode: StatusCodes.NOT_FOUND,
          error: 'Not Found',
          message: `Batch with ID "${id}" was not found.`
        });
      }
      await SseService.handleBatchEvents(req, reply);
    } catch (error) {
      req.log.error({ err: error }, 'SSE stream subscription error');
      if (!reply.raw.headersSent) {
        return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Failed to establish event stream connection'
        });
      }
    }
  });

  fastify.post<{ Params: BatchIdParams }>('/api/batches/:id/cancel', {
    schema: {
      tags: ['Batches'],
      summary: 'Cancel in-flight and queued batch checks',
      description: 'Sets Redis cancellation flag, marks batch and remaining checks as CANCELLED in PostgreSQL, and broadcasts cancellation event to active clients.',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Batch UUID' }
        },
        required: ['id']
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params;
      const batch = await BatchService.cancelBatch(id);
      if (!batch) {
        return reply.status(StatusCodes.NOT_FOUND).send({
          statusCode: StatusCodes.NOT_FOUND,
          error: 'Not Found',
          message: `Batch with ID "${id}" was not found.`
        });
      }
      return reply.send(batch);
    } catch (error) {
      req.log.error({ err: error }, 'Failed to cancel batch');
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An error occurred while cancelling batch'
      });
    }
  });

  fastify.post<{ Params: BatchIdParams }>('/api/batches/:id/retry', {
    schema: {
      tags: ['Batches'],
      summary: 'Retry only failed or cancelled checks in batch',
      description: 'Re-enqueues failed and cancelled checks without repeating successful checks. Resets attempts counter and broadcasts retry event.',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Batch UUID' }
        },
        required: ['id']
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params;
      const batch = await BatchService.retryFailed(id);
      if (!batch) {
        return reply.status(StatusCodes.NOT_FOUND).send({
          statusCode: StatusCodes.NOT_FOUND,
          error: 'Not Found',
          message: `Batch with ID "${id}" was not found.`
        });
      }
      return reply.send(batch);
    } catch (error) {
      req.log.error({ err: error }, 'Failed to retry batch');
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An error occurred while retrying batch checks'
      });
    }
  });
};
