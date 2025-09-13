import path from 'path';
import { fileURLToPath } from 'url';
import { readJson } from '../lib/safeJsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SIGNALS_FILE = path.join(__dirname, '../data/signals.json');

export default {
  name: 'internalSignals',
  
  async fetchAndNormalize(token, criteria) {
    try {
      console.log('🔍 InternalSignals: Fetching signals with criteria:', criteria);
      
      // Read signals from file
      let signals = readJson(SIGNALS_FILE);
      
      // Filter by commodity (cannabis/hemp/cbd only)
      const allowedCommodities = ['cannabis', 'hemp', 'cbd'];
      signals = signals.filter(signal => 
        allowedCommodities.includes(signal.commodity)
      );
      
      // Apply criteria filters
      if (criteria.commodityType || criteria.productType) {
        const requestedCommodity = (criteria.commodityType || criteria.productType).toLowerCase();
        signals = signals.filter(signal => 
          signal.commodity.includes(requestedCommodity)
        );
      }
      
      // Filter by region
      if (criteria.region || criteria.location) {
        const location = (criteria.region || criteria.location).toLowerCase();
        signals = signals.filter(signal => 
          signal.region.toLowerCase().includes(location)
        );
      }
      
      // Filter by keyword/query
      if (criteria.query) {
        const queryLower = criteria.query.toLowerCase();
        signals = signals.filter(signal =>
          signal.companyName.toLowerCase().includes(queryLower) ||
          signal.text.toLowerCase().includes(queryLower)
        );
      }
      
      // Filter by price range if provided
      if (criteria.priceMin != null || criteria.priceMax != null) {
        signals = signals.filter(signal => {
          if (signal.priceMin != null && criteria.priceMax != null) {
            return signal.priceMin <= criteria.priceMax;
          }
          if (signal.priceMax != null && criteria.priceMin != null) {
            return signal.priceMax >= criteria.priceMin;
          }
          return true; // Include signals without price info
        });
      }
      
      console.log(`✅ InternalSignals: Found ${signals.length} matching signals`);
      
      // Map to unified crawler format
      const normalizedResults = signals.map(signal => ({
        _type: 'signal',
        id: `signal-${signal.id}`,
        source: 'internalSignals',
        counterpartyId: signal.id,
        counterpartyName: signal.companyName,
        commodityType: signal.commodity,
        region: signal.region,
        pricePerUnit: null,
        quantityAvailable: null,
        qualitySpecs: null,
        licenseStatus: null,
        notes: signal.text,
        
        // Signal-specific fields
        signalType: signal.kind,
        signalSource: signal.source,
        contact: signal.contact,
        priceMin: signal.priceMin,
        priceMax: signal.priceMax,
        url: signal.url,
        views: signal.views,
        clicks: signal.clicks,
        createdAt: signal.createdAt,
        
        // Metadata
        metadata: {
          originalId: signal.id,
          isSignal: true,
          companyKey: signal.companyKey
        },
        
        // Scoring for ranking (signals get lower base score than listings)
        score: 30 + (signal.views || 0) * 0.1 + (signal.clicks || 0) * 0.5,
        matchReason: 'Signal match from internal database'
      }));
      
      return normalizedResults;
      
    } catch (error) {
      console.error('❌ InternalSignals connector error:', error);
      throw new Error(`InternalSignals connector failed: ${error.message}`);
    }
  }
};