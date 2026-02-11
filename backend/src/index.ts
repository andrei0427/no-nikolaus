import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initFirebase, getLatestVessels } from './firebase.js';
import { initSchedule } from './schedule.js';
import { handleSSE } from './sseHandler.js';
import { handleSendPush, handlePredictionFeedback } from './pushHandler.js';
import { sendTelegramAlert } from './telegram.js';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  })
);

app.use(express.json({ limit: '10kb' }));

// SSE endpoint for vessel streaming
app.get('/api/vessels/stream', handleSSE);

// Get latest vessels snapshot (non-streaming)
app.get('/api/vessels', (_req, res) => {
  res.json({
    vessels: getLatestVessels(),
    timestamp: Date.now(),
  });
});

// Push notification endpoints
app.post('/api/send-prediction-push', handleSendPush);
app.post('/api/prediction-feedback', handlePredictionFeedback);

// Frontend error reporting
app.post('/api/report-error', (req, res) => {
  const { source, error } = req.body;
  if (!source || !error) {
    res.status(400).json({ error: 'Missing source or error' });
    return;
  }
  console.error(`[Frontend] ${source}: ${error}`);
  sendTelegramAlert(`Frontend error (${source}): ${error}`);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  sendTelegramAlert(`Unhandled server error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

// Initialize Firebase and fetch schedule
initFirebase();
initSchedule();

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/api/vessels/stream`);
});
