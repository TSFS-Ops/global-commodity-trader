#!/usr/bin/env node

// Import the newer Excel file specifically
import { db } from '../server/db.js';
import { listings, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import XLSX from 'xlsx';
import fs from 'fs';

const targetFile = 'attached_assets/Izenzo Trading Platfrom V1_1755170867011.xlsx';

async function importNewFile() {
  console.log('📊 Import New Excel File');
  console.log('========================');
  
  if (!fs.existsSync(targetFile)) {
    console.log('❌ New Excel file not found');
    return;
  }
  
  console.log(`📄 Processing: ${targetFile}`);
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(targetFile);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    
    console.log(`📋 Found ${jsonData.length} data rows`);
    
    if (jsonData.length === 0) {
      console.log('❌ No data found in Excel file');
      return;
    }
    
    // Analyze columns
    const sampleRow = jsonData[0];
    console.log('\n🔤 Available columns:');
    Object.keys(sampleRow).forEach(key => {
      console.log(`   - ${key}`);
    });
    
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
    
    // Process rows with enhanced mapping
    let imported = 0;
    let skipped = 0;
    
    console.log('\n📦 Processing cannabis listings...');
    
    for (const row of jsonData) {
      try {
        // Extract data with multiple column name possibilities
        const counterparty = row.CLIENT || row.GROWER || row.Seller || row.Company || 'Unknown';
        const quantity = parseFloat(row.QUANTITY || row.Quantity || row.QTY || 0);
        const thc = row['%THC'] || row.THC || row.Quality || '';
        const contact = row.CONTACT || row.Contact || row.Email || '';
        const status = row.STATUS || row.Status || 'active';
        
        // Extract price with multiple formats
        let pricePerUnit = 0;
        const priceField = row['BID/OFFER'] || row.Price || row.Rate || row.Cost || '';
        
        if (priceField) {
          const priceStr = String(priceField).toLowerCase();
          if (priceStr.includes('r') || priceStr.includes('zar')) {
            // ZAR pricing
            const match = priceStr.match(/(\d+(?:\.\d+)?)/);
            if (match) {
              pricePerUnit = parseFloat(match[1]) * (priceStr.includes('/g') ? 1000 : 1);
            }
          } else if (priceStr.includes('usd') || priceStr.includes('$')) {
            // USD pricing  
            const match = priceStr.match(/(\d+(?:\.\d+)?)/);
            if (match) {
              pricePerUnit = parseFloat(match[1]) * 19; // Convert USD to ZAR approx
            }
          } else {
            // Try direct number
            const match = priceStr.match(/(\d+(?:\.\d+)?)/);
            if (match) {
              pricePerUnit = parseFloat(match[1]);
            }
          }
        }
        
        // Skip invalid rows
        if (!counterparty || counterparty === 'Unknown' || quantity <= 0 || pricePerUnit <= 0) {
          skipped++;
          continue;
        }
        
        const listingData = {
          sellerId: importUser.id,
          title: `${counterparty} - Premium Cannabis${thc ? ` (${thc}% THC)` : ''}`,
          description: `High-quality cannabis from ${counterparty}.${thc ? ` THC: ${thc}%.` : ''}${contact ? ` Contact: ${contact}.` : ''} Available: ${quantity}kg.`,
          category: 'cannabis',
          quantity: Math.round(quantity),
          unit: 'kg',
          pricePerUnit: Math.round(pricePerUnit),
          price: Math.round(pricePerUnit * quantity),
          currency: 'ZAR',
          location: 'South Africa',
          qualityGrade: thc || 'Premium',
          status: status.toLowerCase().includes('pending') ? 'pending' : 'active',
          socialImpactScore: 75,
          socialImpactCategory: 'Healthcare',
          isVerified: true,
          isFeatured: false,
          specifications: {
            sourceFile: targetFile,
            originalData: row,
            newFileImport: true
          }
        };
        
        await db.insert(listings).values(listingData);
        imported++;
        
        console.log(`✅ ${imported}. ${counterparty} - ${quantity}kg @ R${pricePerUnit}/kg`);
        
      } catch (error) {
        console.error(`❌ Failed to import row:`, error.message);
        skipped++;
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`   Successfully imported: ${imported} new listings`);
    console.log(`   Skipped: ${skipped} invalid rows`);
    console.log(`   Total cannabis inventory expanded`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importNewFile();
}