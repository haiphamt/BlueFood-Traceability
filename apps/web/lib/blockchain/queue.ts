import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface AnchorJobData {
  batchEventId: string;
  batchId: string;
  lotId: string;
  eventType: string;
  payload: Record<string, unknown>;
  prevHash?: string;
}

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is not set');
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}

let anchorQueue: Queue<AnchorJobData> | null = null;

export function getAnchorQueue(): Queue<AnchorJobData> {
  if (!anchorQueue) {
    anchorQueue = new Queue<AnchorJobData>('blockchain-anchor', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 15_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return anchorQueue;
}
