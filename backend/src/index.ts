import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './config/db';
import { redisConnection } from './config/redis';
import { initElasticsearchIndex } from './config/elasticsearch';
import { bullBoardRouter } from './config/bullBoard';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import { initEmailWorker } from './workers/email.worker';
import { recoverPendingJobs } from './services/scheduler.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Bull-Board Live Queue Dashboard
app.use('/admin/queues', bullBoardRouter);

// API Routes
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Health Check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPing = await redisConnection.ping();

    res.json({
      status: 'ok',
      database: 'connected',
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start Server and Background Workers
const server = app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Bull-Board Queue Dashboard: http://localhost:${PORT}/admin/queues`);
  console.log(`===============================================`);

  try {
    // 1. Initialize Elasticsearch index
    await initElasticsearchIndex();

    // 2. Initialize BullMQ email worker
    console.log('[Worker] Starting email worker process...');
    const worker = initEmailWorker();

    // 3. Run server startup recovery for pending jobs
    await recoverPendingJobs();

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n[Server] Graceful shutdown initiated...');
      await worker.close();
      await prisma.$disconnect();
      server.close(() => {
        console.log('[Server] Closed remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[Startup] Failed during worker or recovery startup:', error);
  }
});
