// Express 2.x compatibility
const express = require('express');
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from '../lib/safeJsonStore.js';
import path from 'path';

const intuitionPath = path.join(process.cwd(), 'data', 'intuition.json');

export default function intuitionRouter(app) {

// POST /api/intuition/ingest - Store soft notes with confidence/decay
app.post('/ingest', async (req, res) => {
  try {
    const { itemId, itemType, note, confidence, decay } = req.body;
    
    if (!itemId || !itemType || !note) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: itemId, itemType, note' 
      });
    }
    
    const intuitionEntry = {
      id: uuidv4(),
      itemId,
      itemType,
      note,
      confidence: confidence || 0.5,
      decay: decay || 0.1,
      createdAt: new Date().toISOString(),
      beliefScore: (confidence || 0.5) * Math.random() // Simple belief calculation
    };
    
    const intuitions = await readJson(intuitionPath);
    intuitions.push(intuitionEntry);
    await writeJson(intuitionPath, intuitions);
    
    res.json({ ok: true, id: intuitionEntry.id });
  } catch (error) {
    console.error('Intuition ingest error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/intuition/search - Get intuition entries for items
app.get('/search', async (req, res) => {
  try {
    const { itemId, itemType } = req.query;
    
    const intuitions = await readJson(intuitionPath);
    let filtered = intuitions;
    
    if (itemId) {
      filtered = filtered.filter(i => i.itemId === itemId);
    }
    
    if (itemType) {
      filtered = filtered.filter(i => i.itemType === itemType);
    }
    
    res.json({ ok: true, results: filtered });
  } catch (error) {
    console.error('Intuition search error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

}