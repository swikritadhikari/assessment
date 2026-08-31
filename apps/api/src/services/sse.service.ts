import type { FastifyReply, FastifyRequest } from 'fastify';
import { Redis } from 'ioredis';
import { config } from '../config.js';
import { REDIS_KEYS, TIMING, type ConnectedPayload, type SSEMessage } from '@healthchecker/shared';

export class SseService {
  static handleBatchEvents = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const { id: batchId } = req.params;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders();

    const subscriber = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    const channel = REDIS_KEYS.batchEventsChannel(batchId);

    const sendEvent = <T>(event: string, data: T): void => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    const initialPayload: ConnectedPayload = {
      batchId,
      connectedAt: new Date().toISOString()
    };
    sendEvent('connected', initialPayload);

    await subscriber.subscribe(channel);

    subscriber.on('message', (_chan: string, message: string) => {
      try {
        const parsed: SSEMessage<unknown> = JSON.parse(message);
        sendEvent(parsed.type || 'message', parsed);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown JSON parse error';
        req.log.error({ err: errorMsg }, '[SSE] Failed to parse Redis message');
      }
    });

    const heartbeat = setInterval(() => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(': heartbeat\n\n');
      }
    }, TIMING.SSE_HEARTBEAT_INTERVAL_MS);

    req.raw.on('close', async () => {
      clearInterval(heartbeat);
      try {
        await subscriber.unsubscribe(channel);
        subscriber.disconnect();
      } catch {
        // clean close
      }
    });
  };
}
