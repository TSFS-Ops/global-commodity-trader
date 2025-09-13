#!/usr/bin/env node

// Test the internal crawler directly without authentication issues
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testInternalCrawlerDirect() {
  console.log('🧪 Direct Internal Crawler Test');
  console.log('==============================');
  
  try {
    // Import the internal connector directly
    const { fetchAndNormalize } = await import('../connectors/internalDB.js');
    
    console.log('📋 Testing cannabis search criteria...');
    
    const testCriteria = {
      commodityType: 'cannabis',
      priceRange: { min: 20000, max: 35000 },
      minQuantity: 50
    };
    
    console.log('🔍 Criteria:', JSON.stringify(testCriteria, null, 2));
    
    const result = await fetchAndNormalize(null, testCriteria);
    
    console.log('\n📊 Crawler Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Connector: ${result.connector}`);
    console.log(`   Results Count: ${result.resultsCount}`);
    
    if (result.success && result.results && result.results.length > 0) {
      console.log('\n🌿 Cannabis Listings Found:');
      result.results.slice(0, 5).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.counterpartyName}`);
        console.log(`   Quantity: ${listing.quantityAvailable}${listing.unit}`);
        console.log(`   Price: ${listing.currency}${listing.pricePerUnit}/${listing.unit}`);
        console.log(`   Quality: ${listing.qualitySpecs}`);
        console.log(`   Score: ${listing.score}`);
        if (listing.socialImpactScore) {
          console.log(`   Social Impact: ${listing.socialImpactScore}`);
        }
      });
      
      console.log(`\n✅ Internal crawler working perfectly!`);
      console.log(`   Found ${result.results.length} matching cannabis listings`);
      
    } else {
      console.log('\n❌ No results or crawler error:');
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testInternalCrawlerDirect();
}