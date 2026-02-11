import { Request, Response } from 'express';
import { subscribe, getLatestVessels } from './firebase.js';
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
      timestamp: Date.now(),
    };
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  }

  // Subscribe to vessel updates
  const unsubscribe = subscribe((vessels) => {
    const message: SSEMessage = {
      vessels,
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
    unsubscribe();
  });
}
