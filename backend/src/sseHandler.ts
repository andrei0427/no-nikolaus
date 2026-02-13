import { Request, Response } from 'express';
import { subscribe, getLatestVessels, subscribePortVehicles, getLatestPortVehicleData } from './firebase.js';
import { getSchedule } from './schedule.js';
import { SSEMessage } from './types.js';

const MAX_SSE_CONNECTIONS = 100;
let activeConnections = 0;

export function handleSSE(req: Request, res: Response): void {
  if (activeConnections >= MAX_SSE_CONNECTIONS) {
    res.status(503).json({ error: 'Too many connections' });
    return;
  }
  activeConnections++;
  console.log(`New SSE connection (${activeConnections} active)`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Alt-Svc', 'clear'); // Prevent HTTP/3 (QUIC) — unstable for SSE

  // Send initial data immediately
  const initialVessels = getLatestVessels();
  if (initialVessels.length > 0) {
    const message: SSEMessage = {
      vessels: initialVessels,
      portVehicleData: getLatestPortVehicleData(),
      schedule: getSchedule() ?? undefined,
      timestamp: Date.now(),
    };
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  }

  // Subscribe to vessel updates
  const unsubscribeVessels = subscribe((vessels) => {
    const message: SSEMessage = {
      vessels,
      portVehicleData: getLatestPortVehicleData(),
      schedule: getSchedule() ?? undefined,
      timestamp: Date.now(),
    };
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  });

  // Subscribe to port vehicle updates
  const unsubscribePortVehicles = subscribePortVehicles((portVehicleData) => {
    const message: SSEMessage = {
      vessels: getLatestVessels(),
      portVehicleData,
      schedule: getSchedule() ?? undefined,
      timestamp: Date.now(),
    };
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  });

  // Send keepalive every 30 seconds
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    activeConnections--;
    console.log(`SSE connection closed (${activeConnections} active)`);
    clearInterval(keepalive);
    unsubscribeVessels();
    unsubscribePortVehicles();
  });
}
