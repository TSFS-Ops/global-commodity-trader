import { readJson } from '../lib/safeJsonStore.js';
import path from 'path';

const signalsPath = path.join(process.cwd(), 'data', 'signals.json');

export default {
  name: 'internalSignals',
  fetchAndNormalize: async (token, criteria) => {
    try {
      const signals = await readJson(signalsPath);
      
      // Filter by commodity allow-list
      const allowedCommodities = ['cannabis', 'hemp', 'cbd'];
      let filtered = signals.filter(signal => 
        allowedCommodities.includes(signal.commodity)
      );
      
      // Filter by criteria
      if (criteria.commodityType) {
        filtered = filtered.filter(signal => 
          signal.commodity.toLowerCase() === criteria.commodityType.toLowerCase()
        );
      }
      
      if (criteria.region) {
        filtered = filtered.filter(signal => 
          signal.region.toLowerCase().includes(criteria.region.toLowerCase())
        );
      }
      
      if (criteria.query) {
        const queryLower = criteria.query.toLowerCase();
        filtered = filtered.filter(signal =>
          signal.companyName.toLowerCase().includes(queryLower) ||
          signal.text.toLowerCase().includes(queryLower)
        );
      }
      
      // Map to unified shape for search results
      return filtered.map(signal => ({
        _type: 'signal',
        counterpartyId: signal.id,
        counterpartyName: signal.companyName,
        commodityType: signal.commodity,
        region: signal.region,
        pricePerUnit: null,
        quantityAvailable: null,
        qualitySpecs: null,
        licenseStatus: null,
        createdAt: signal.createdAt,
        // Additional signal-specific fields
        signalKind: signal.kind,
        signalText: signal.text,
        views: signal.views,
        clicks: signal.clicks
      }));
    } catch (error) {
      console.error('InternalSignals connector error:', error);
      // Do NOT throw - return empty array on any error
      return [];
    }
  }
};