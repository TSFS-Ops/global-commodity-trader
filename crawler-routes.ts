// Express 2.x compatibility - export function that registers routes on app
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require('express');
import type { Request, Response } from 'express';
import { fetchFromConnectors } from './services/crawlerService';

export default function crawlerRouter(app: any) {

app.post('/search', async (req: Request, res: Response) => {
  try {
    const { criteria = {}, connectors = {}, options = {} } = req.body;
    const response = await fetchFromConnectors({
      connectors,
      criteria,
      options
    });
    res.json({ ok: true, meta: response.meta, results: response.results });
  } catch (err: any) {
    console.error('Crawler search error', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

}