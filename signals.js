import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJson, writeJson } from '../lib/safeJsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const SIGNALS_FILE = path.join(__dirname, '../data/signals.json');

// Helper function to create slug from company name
function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// POST /api/signals/ingest
router.post('/ingest', (req, res) => {
  try {
    const {
      source,
      kind,
      companyName,
      contact,
      commodity,
      region,
      text,
      priceMin,
      priceMax,
      url
    } = req.body;

    // Validations
    if (!companyName || !commodity || !text) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: companyName, commodity, text'
      });
    }

    if (!['cannabis', 'hemp', 'cbd'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        ok: false,
        error: 'Commodity must be one of: cannabis, hemp, cbd'
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        ok: false,
        error: 'Text must be 500 characters or less'
      });
    }

    // Create signal record
    const signal = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      views: 0,
      clicks: 0,
      source: source || 'manual',
      kind: kind || 'buyer_intent',
      companyName,
      companyKey: slug(companyName),
      contact,
      commodity: commodity.toLowerCase(),
      region: region || '',
      text,
      priceMin: priceMin || null,
      priceMax: priceMax || null,
      url: url || null
    };

    // Read existing signals
    const signals = readJson(SIGNALS_FILE);
    signals.push(signal);

    // Write back to file
    if (writeJson(SIGNALS_FILE, signals)) {
      res.json({ ok: true, id: signal.id });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to save signal' });
    }
  } catch (error) {
    console.error('Error ingesting signal:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/signals/search
router.get('/search', (req, res) => {
  try {
    const {
      query = '',
      commodity = '',
      region = '',
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    // Read signals
    let signals = readJson(SIGNALS_FILE);

    // Filter by commodity (cannabis/hemp/cbd only)
    if (commodity) {
      const allowedCommodities = ['cannabis', 'hemp', 'cbd'];
      if (allowedCommodities.includes(commodity.toLowerCase())) {
        signals = signals.filter(s => s.commodity === commodity.toLowerCase());
      } else {
        return res.json({ ok: true, count: 0, page: pageNum, pages: 0, results: [] });
      }
    } else {
      // Default to cannabis/hemp/cbd only
      signals = signals.filter(s => ['cannabis', 'hemp', 'cbd'].includes(s.commodity));
    }

    // Filter by region
    if (region) {
      signals = signals.filter(s => 
        s.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    // Filter by query (keyword search)
    if (query) {
      const queryLower = query.toLowerCase();
      signals = signals.filter(s =>
        s.companyName.toLowerCase().includes(queryLower) ||
        s.text.toLowerCase().includes(queryLower)
      );
    }

    // Sort by createdAt descending
    signals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const totalCount = signals.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = signals.slice(startIndex, endIndex);

    res.json({
      ok: true,
      count: totalCount,
      page: pageNum,
      pages: totalPages,
      results: paginatedResults
    });
  } catch (error) {
    console.error('Error searching signals:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /api/events/log
router.post('/log', (req, res) => {
  try {
    const { type, itemType, itemId } = req.body;

    if (!['view', 'click'].includes(type) || itemType !== 'signal' || !itemId) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid event parameters'
      });
    }

    // Read signals
    const signals = readJson(SIGNALS_FILE);
    
    // Find and update the signal
    const signalIndex = signals.findIndex(s => s.id === itemId);
    if (signalIndex === -1) {
      return res.status(404).json({ ok: false, error: 'Signal not found' });
    }

    // Increment view or click count
    if (type === 'view') {
      signals[signalIndex].views = (signals[signalIndex].views || 0) + 1;
    } else if (type === 'click') {
      signals[signalIndex].clicks = (signals[signalIndex].clicks || 0) + 1;
    }

    // Write back to file
    if (writeJson(SIGNALS_FILE, signals)) {
      res.json({ ok: true });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to update signal' });
    }
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;