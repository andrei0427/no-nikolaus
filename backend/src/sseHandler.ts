import { Request, Response } from 'express';
import { subscribe, getLatestVessels, subscribePortVehicles, getLatestPortVehicleData } from './firebase.js';
import { getSchedule } from './schedule.js';
import { SSEMessage } from './types.js';

export function handleSSE(req: Request, res: Response): void {
  console.log('New SSE connection');

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

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
    console.log('SSE connection closed');
    clearInterval(keepalive);
    unsubscribeVessels();
    unsubscribePortVehicles();
  });
}
