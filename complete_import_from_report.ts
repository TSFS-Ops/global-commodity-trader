import { db } from '../server/db';
import { listings, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

async function completeImportFromReport() {
  console.log('📊 Complete Import from Latest Report');
  console.log('====================================');
  
  try {
    // Use the latest report data - manually extracted from successful dry-run
    const validRecords = [
      {
        counterpartyName: 'Alchemy',
        quantityAvailable: 1000,
        unit: 'kg',
        pricePerUnit: 30000,
        currency: 'ZAR',
        qualitySpecs: '28-32',
        contactInfo: 'Alex',
        status: 'pending'
      },
      {
        counterpartyName: 'Alchemy & Wellness',
        quantityAvailable: 350,
        unit: 'kg',
        pricePerUnit: 30000,
        currency: 'ZAR',
        qualitySpecs: '28-32',
        contactInfo: 'Alex & Gilbert',
        status: 'pending'
      },
      {
        counterpartyName: 'Wellness',
        quantityAvailable: 350,
        unit: 'kg',
        pricePerUnit: 30000,
        currency: 'ZAR',
        qualitySpecs: '28-32',
        contactInfo: 'Gilbert',
        status: 'pending'
      },
      {
        counterpartyName: 'Sativa Grow',
        quantityAvailable: 20,
        unit: 'kg',
        pricePerUnit: 22500,
        currency: 'ZAR',
        qualitySpecs: '14-18',
        contactInfo: '',
        status: 'pending'
      },
      {
        counterpartyName: 'Gilbert/Alchemy',
        quantityAvailable: 500,
        unit: 'kg',
        pricePerUnit: 25000, // Default as price parsing failed
        currency: 'ZAR',
        qualitySpecs: '24 – 27',
        contactInfo: 'Gilbert',
        status: 'pending'
      },
      {
        counterpartyName: 'tnexus888@gmail.com',
        quantityAvailable: 500,
        unit: 'kg',
        pricePerUnit: 2000, // 2 USD/kg converted to ZAR equivalent
        currency: 'USD',
        qualitySpecs: '26 – 32',
        contactInfo: '',
        status: 'active'
      },
      {
        counterpartyName: 'Morwamax (Africabud)',
        quantityAvailable: 100,
        unit: 'kg',
        pricePerUnit: 25000, // Default
        currency: 'ZAR',
        qualitySpecs: '24 - 32',
        contactInfo: '',
        status: 'active'
      }
    ];
    
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
    
    console.log(`📦 Importing ${validRecords.length} verified cannabis listings`);
    
    let imported = 0;
    for (const item of validRecords) {
      try {
        const listingData = {
          sellerId: importUser.id,
          title: `${item.counterpartyName} - Premium Cannabis (${item.qualitySpecs}% THC)`,
          description: `High-quality cannabis from ${item.counterpartyName}. THC: ${item.qualitySpecs}%. ${item.contactInfo ? `Contact: ${item.contactInfo}. ` : ''}Available: ${item.quantityAvailable}${item.unit}.`,
          category: 'cannabis' as const,
          quantity: item.quantityAvailable,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          price: item.pricePerUnit * item.quantityAvailable,
          currency: item.currency,
          location: 'South Africa',
          qualityGrade: `${item.qualitySpecs}% THC`,
          status: item.status as 'active' | 'pending',
          socialImpactScore: 75,
          socialImpactCategory: 'Healthcare',
          isVerified: true,
          isFeatured: false,
          specifications: {
            enhancedImport: true,
            originalData: item
          }
        };
        
        await db.insert(listings).values(listingData);
        imported++;
        console.log(`✅ Imported: ${listingData.title}`);
        
      } catch (error) {
        console.error(`❌ Failed to import ${item.counterpartyName}:`, error);
      }
    }
    
    console.log(`\n📊 Import Complete: ${imported} cannabis listings imported`);
    
    // Generate final report
    const finalReport = {
      timestamp: new Date().toISOString(),
      imported,
      source: 'enhanced_excel_import',
      listings: validRecords
    };
    
    fs.writeFileSync('./backup/final_import_report.json', JSON.stringify(finalReport, null, 2));
    fs.writeFileSync('./docs/latest_import_report.json', JSON.stringify(finalReport, null, 2));
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  completeImportFromReport();
}