// Internal Database Connector - fetches cannabis/hemp listings from our own database

// Import storage layer
let storage;

async function getStorage() {
  if (!storage) {
    // Dynamic import for ES modules
    const storageModule = await import('../server/storage.js');
    storage = storageModule.storage;
  }
  return storage;
}

export const name = 'internalDB';

export async function fetchAndNormalize(token, criteria) {
  try {
    console.log('🔍 InternalDB: Fetching cannabis/hemp listings with criteria:', criteria);
    
    // Hard-coded cannabis/hemp allow-list for security
    const allowed = new Set(['cannabis', 'hemp', 'cbd', 'thc']);
    
    const storageInstance = await getStorage();
    
    // Get all listings from storage
    let allListings = await storageInstance.getListings({ status: 'active' });
    
    // First filter: Only allow cannabis/hemp commodities
    let results = allListings.filter(listing => {
      const category = (listing.category || '').toLowerCase();
      
      // Hard filter to allowed commodities only
      const hasAllowedCommodity = Array.from(allowed).some(allowedType => 
        category.includes(allowedType)
      );
      
      if (!hasAllowedCommodity) {
        return false;
      }
      
      // Exclude listings without proper commodity type set
      if (!category || category.trim() === '') {
        return false;
      }
      
      return true;
    });
    
    // Apply additional criteria filters
    if (criteria.commodityType || criteria.productType) {
      const requestedCommodity = (criteria.commodityType || criteria.productType).toLowerCase();
      results = results.filter(listing => {
        const category = (listing.category || '').toLowerCase();
        return category.includes(requestedCommodity);
      });
    }
    
    // Filter by region/location
    if (criteria.region || criteria.location) {
      const location = (criteria.region || criteria.location).toLowerCase();
      results = results.filter(listing => 
        (listing.location || '').toLowerCase().includes(location)
      );
    }
    
    // Filter by minimum social impact score
    if (criteria.minSocialImpactScore) {
      results = results.filter(listing => 
        (listing.socialImpactScore || 0) >= criteria.minSocialImpactScore
      );
    }
    
    // Filter by price range
    if (criteria.priceMin != null) {
      results = results.filter(listing => 
        listing.pricePerUnit >= Number(criteria.priceMin)
      );
    }
    if (criteria.priceMax != null) {
      results = results.filter(listing => 
        listing.pricePerUnit <= Number(criteria.priceMax)
      );
    }
    
    // Filter by minimum quantity
    if (criteria.quantity || criteria.minQuantity) {
      const minQty = criteria.quantity || criteria.minQuantity;
      results = results.filter(listing => 
        (listing.quantity || 0) >= minQty
      );
    }
    
    console.log(`✅ InternalDB: Found ${results.length} cannabis/hemp listings after filtering`);
    
    // Normalize to unified schema
    const normalizedResults = results.map(listing => ({
      id: `internal-${listing.id}`,
      source: 'internalDB',
      counterpartyName: listing.title || `Seller ${listing.sellerId}`,
      commodityType: listing.category,
      quantityAvailable: listing.quantity,
      unit: listing.unit,
      pricePerUnit: listing.pricePerUnit,
      currency: listing.currency || 'ZAR',
      region: listing.location,
      qualitySpecs: listing.qualityGrade,
      socialImpactScore: listing.socialImpactScore || 0,
      socialImpactCategory: listing.socialImpactCategory || '',
      licenseStatus: listing.isVerified,
      notes: listing.description,
      
      // Enhanced fields
      title: listing.title,
      description: listing.description,
      isVerified: listing.isVerified,
      isFeatured: listing.isFeatured,
      createdAt: listing.createdAt,
      
      // Metadata
      metadata: {
        originalId: listing.id,
        internalListing: true,
        allowedCommodity: true
      },
      
      // Scoring for ranking
      score: 50 + (listing.socialImpactScore || 0) * 0.3 + (listing.isVerified ? 10 : 0),
      matchReason: 'Cannabis/hemp internal database match'
    }));
    
    return normalizedResults;
    
  } catch (error) {
    console.error('❌ InternalDB connector error:', error);
    throw new Error(`InternalDB connector failed: ${error.message}`);
  }
}