import flags from '../config/flags.js';

// Deterministic scoring for search results
function calculateBaseScore(item, criteria) {
  let score = 0;
  
  // Keyword relevance (base scoring)
  if (criteria.query && item.counterpartyName) {
    const queryLower = criteria.query.toLowerCase();
    const nameLower = item.counterpartyName.toLowerCase();
    if (nameLower.includes(queryLower)) {
      score += 10;
    }
  }
  
  // Commodity match
  if (criteria.commodityType && item.commodityType) {
    if (item.commodityType.toLowerCase() === criteria.commodityType.toLowerCase()) {
      score += 5;
    }
  }
  
  // Region match
  if (criteria.region && item.region) {
    if (item.region.toLowerCase().includes(criteria.region.toLowerCase())) {
      score += 3;
    }
  }
  
  // Freshness (newer items get higher score)
  if (item.createdAt) {
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - ageDays * 0.1); // Decay over time
  }
  
  return score;
}

async function rankItems(items, criteria) {
  const results = [];
  
  for (const item of items) {
    let score = calculateBaseScore(item, criteria);
    
    // FLAG-GATED ENHANCEMENTS (all non-breaking)
    
    // Uncertainty scoring (flag: ENABLE_UNCERTAINTY)
    if (flags.ENABLE_UNCERTAINTY) {
      // Add uncertainty based on freshness and data sparsity
      const uncertainty = calculateUncertainty(item);
      score += uncertainty * 0.1; // Small γ coefficient
    }
    
    // QMatch interference (flag: ENABLE_QMATCH) 
    if (flags.ENABLE_QMATCH) {
      try {
        const { getInterference } = await import('./qmatchClient.js');
        const interference = await getInterference(criteria, [item], { timeoutMs: 150 });
        if (interference.byId[item.counterpartyId]) {
          const { interference: iValue = 0, conflict = 0 } = interference.byId[item.counterpartyId];
          score += iValue * 0.05 - conflict * 0.02; // Small coefficients
        }
      } catch (err) {
        // Non-blocking - ignore errors
      }
    }
    
    // Intuition belief scoring (flag: ENABLE_INTUITION)
    if (flags.ENABLE_INTUITION && item.beliefScore) {
      score += item.beliefScore * 0.03; // Small ε coefficient
    }
    
    results.push({
      ...item,
      _score: score
    });
  }
  
  // Sort by score descending
  return results.sort((a, b) => b._score - a._score);
}

function calculateUncertainty(item) {
  // Simple uncertainty calculation based on data completeness and freshness
  let uncertainty = 0;
  
  // Data sparsity uncertainty
  const fields = [item.pricePerUnit, item.quantityAvailable, item.qualitySpecs];
  const missingFields = fields.filter(f => f === null || f === undefined).length;
  uncertainty += missingFields * 0.5;
  
  // Freshness uncertainty (older = more uncertain)
  if (item.createdAt) {
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    uncertainty += Math.min(ageDays * 0.1, 2); // Cap at 2
  }
  
  return uncertainty;
}

export { rankItems, calculateBaseScore };