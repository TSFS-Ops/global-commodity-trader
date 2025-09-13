// Enhanced database import that uses the full Excel data processing
import { db } from '../server/db';
import { listings, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

async function enhancedImportToDatabase() {
  console.log('📊 Enhanced Database Import from Latest Report');
  console.log('===============================================');
  
  try {
    // Read the latest import report with all processed data
    const latestReport = JSON.parse(fs.readFileSync('./docs/latest_import_report.json', 'utf8'));
    console.log(`📄 Using report: ${latestReport.timestamp}`);
    
    const processedData = latestReport.allProcessedData || [];
    if (processedData.length === 0) {
      console.error('❌ No processed data found in latest report');
      return;
    }
    
    // Find or create excel-import user
    let importUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'excel-import')
    });
    
    if (!importUser) {
      const [newUser] = await db.insert(users).values({
        username: 'excel-import',
        email: 'excel-import@izenzo.com',
        password: 'hashed_password_placeholder',
        role: 'seller',
        companyName: 'Excel Import System',
        location: 'South Africa'
      }).returning();
      importUser = newUser;
      console.log('✅ Created excel-import user');
    }
    
    console.log(`📦 Processing ${processedData.length} records for database import`);
    
    let imported = 0;
    let skipped = 0;
    const importErrors = [];
    
    for (const item of processedData) {
      try {
        // Skip invalid records (those with errors in original processing)
        if (!item.counterpartyName || !item.quantityAvailable || item.quantityAvailable <= 0) {
          skipped++;
          continue;
        }
        
        // Convert to our database schema
        const listingData = {
          sellerId: importUser.id,
          title: `${item.counterpartyName} - Premium Cannabis${item.qualitySpecs ? ` (${item.qualitySpecs}% THC)` : ''}`,
          description: `High-quality cannabis from ${item.counterpartyName}.${item.qualitySpecs ? ` THC: ${item.qualitySpecs}%.` : ''}${item.contactInfo ? ` Contact: ${item.contactInfo}.` : ''} Available: ${item.quantityAvailable}${item.unit || 'kg'}.`,
          category: 'cannabis' as const,
          quantity: item.quantityAvailable,
          unit: item.unit || 'kg',
          pricePerUnit: item.pricePerUnit || 25000, // Default fallback
          price: (item.pricePerUnit || 25000) * item.quantityAvailable,
          currency: item.currency || 'ZAR',
          location: item.region || item.country || 'South Africa',
          qualityGrade: item.qualitySpecs || 'Premium',
          status: (item.status === 'pending' || item.status?.toLowerCase().includes('pending')) ? 'pending' as const : 'active' as const,
          socialImpactScore: item.socialImpactScore || 75,
          socialImpactCategory: item.socialImpactCategory || 'Healthcare',
          isVerified: true,
          isFeatured: false,
          specifications: {
            sourceRow: item.sourceRow,
            importKey: item.importKey,
            contactInfo: item.contactInfo,
            metadata: item.metadata || {},
            enhancedImport: true,
            originalData: {
              client: item.metadata?.CLIENT,
              grower: item.metadata?.GROWER,
              thc: item.qualitySpecs,
              bidOffer: item.metadata?.['BID/OFFER'],
              status: item.metadata?.STATUS
            }
          }
        };
        
        await db.insert(listings).values(listingData);
        imported++;
        
        if (imported % 5 === 0 || imported === processedData.length) {
          console.log(`✅ Imported ${imported} listings...`);
        }
        
      } catch (error) {
        importErrors.push({
          item: item.counterpartyName || 'Unknown',
          error: error.message
        });
        console.error(`❌ Failed to import ${item.counterpartyName}:`, error.message);
      }
    }
    
    console.log(`\n📊 Enhanced Import Summary:`);
    console.log(`   Successfully imported: ${imported} listings`);
    console.log(`   Skipped (invalid data): ${skipped} listings`);
    console.log(`   Errors: ${importErrors.length} listings`);
    
    // Generate enhanced import report
    const enhancedReport = {
      timestamp: new Date().toISOString(),
      sourceReport: latestReport.timestamp,
      imported,
      skipped,
      errors: importErrors.length,
      importedListings: imported > 0 ? await db.select().from(listings).where(eq(listings.sellerId, importUser.id)) : []
    };
    
    const reportPath = `./backup/enhanced_import_${enhancedReport.timestamp.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(enhancedReport, null, 2));
    fs.writeFileSync('./docs/latest_import_report.json', JSON.stringify(enhancedReport, null, 2));
    
    console.log(`📄 Enhanced import report: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Enhanced import failed:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enhancedImportToDatabase();
}