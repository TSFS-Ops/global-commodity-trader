// Express 2.x compatibility - export function that registers routes on app
const express = require('express');
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from '../lib/safeJsonStore.js';
import path from 'path';

const signalsPath = path.join(process.cwd(), 'data', 'signals.json');

// Export function that registers routes directly on the app (Express 2.x style)
export default function signalsRouter(app) {

// POST /api/signals/ingest
app.post('/ingest', async (req, res) => {
  try {
    const { source, kind, companyName, commodity, region, text, priceMin, priceMax, url } = req.body;
    
    // Validation
    if (!source || !kind || !companyName || !commodity || !region || !text) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: source, kind, companyName, commodity, region, text' 
      });
    }
    
    // Commodity allow-list
    const allowedCommodities = ['cannabis', 'hemp', 'cbd'];
    if (!allowedCommodities.includes(commodity.toLowerCase())) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Commodity must be one of: cannabis, hemp, cbd' 
      });
    }
    
    // Text length validation
    if (text.length > 500) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Text must be 500 characters or less' 
      });
    }
    
    // Create signal object
    const signal = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      source,
      kind,
      companyName,
      companyKey: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      commodity: commodity.toLowerCase(),
      region,
      text,
      priceMin: priceMin || null,
      priceMax: priceMax || null,
      url: url || null
    };
    
    // Read existing signals, add new one, write back
    const signals = await readJson(signalsPath);
    signals.push(signal);
    await writeJson(signalsPath, signals);
    
    res.json({ ok: true, id: signal.id });
  } catch (error) {
    console.error('Signal ingest error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/signals/search
app.get('/search', async (req, res) => {
  try {
    const { query = '', commodity = '', region = '', page = '1', limit = '20' } = req.query;
    
    const signals = await readJson(signalsPath);
    
    // Filter by commodity allow-list
    let filtered = signals.filter(signal => {
      const allowedCommodities = ['cannabis', 'hemp', 'cbd'];
      return allowedCommodities.includes(signal.commodity);
    });
    
    // Filter by commodity if specified
    if (commodity) {
      filtered = filtered.filter(signal => 
        signal.commodity.toLowerCase() === commodity.toLowerCase()
      );
    }
    
    // Filter by region if specified
    if (region) {
      filtered = filtered.filter(signal => 
        signal.region.toLowerCase().includes(region.toLowerCase())
      );
    }
    
    // Filter by query (search in companyName and text)
    if (query) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(signal =>
        signal.companyName.toLowerCase().includes(queryLower) ||
        signal.text.toLowerCase().includes(queryLower)
      );
    }
    
    // Sort by createdAt desc
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const results = filtered.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(filtered.length / limitNum);
    
    res.json({
      ok: true,
      count: filtered.length,
      page: pageNum,
      pages: totalPages,
      results
    });
  } catch (error) {
    console.error('Signal search error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /api/events/log
app.post('/log', async (req, res) => {
  try {
    const { type, itemType, itemId } = req.body;
    
    if (!type || !itemType || !itemId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: type, itemType, itemId' 
      });
    }
    
    if (!['view', 'click'].includes(type)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Type must be "view" or "click"' 
      });
    }
    
    if (itemType === 'signal') {
      const signals = await readJson(signalsPath);
      const signalIndex = signals.findIndex(s => s.id === itemId);
      
      if (signalIndex !== -1) {
        if (type === 'view') {
          signals[signalIndex].views++;
        } else if (type === 'click') {
          signals[signalIndex].clicks++;
        }
        await writeJson(signalsPath, signals);
      }
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Event log error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

}