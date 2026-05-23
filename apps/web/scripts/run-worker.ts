import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { startWorker } from '../lib/blockchain/worker';

const worker = startWorker();
console.log('[blockchain-worker] started, listening for jobs...');

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});
