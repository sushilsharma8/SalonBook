import type { Request, Response } from 'express';
import { createApp } from '../server.ts';

const appPromise = createApp();

export default async function handler(req: Request, res: Response) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Vercel handler startup error:', error);
    return res.status(500).json({ error: 'Server startup failed' });
  }
}
