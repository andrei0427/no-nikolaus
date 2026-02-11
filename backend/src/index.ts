import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initFirebase, getLatestVessels } from './firebase.js';
import { initSchedule } from './schedule.js';
import { handleSSE } from './sseHandler.js';
import { handleSendPush, handlePredictionFeedback } from './pushHandler.js';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  })
);

app.use(express.json());

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const PORT = process.env.PORT || 3001;

// Initialize Firebase and fetch schedule
initFirebase();
initSchedule();

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/api/vessels/stream`);
});
