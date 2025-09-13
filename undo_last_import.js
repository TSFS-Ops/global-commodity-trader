#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { listings } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

// Find the latest import report
function getLatestImportReport() {
  const backupDir = './backup';
  if (!fs.existsSync(backupDir)) {
    throw new Error('Backup directory not found');
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('import_report_') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No import reports found');
  }
  
  const reportPath = path.join(backupDir, files[0]);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  return { report, reportPath };
}

async function undoLastImport() {
  console.log('🔄 Undo Last Import');
  console.log('===================');
  
  const forceFlag = process.argv.includes('--force');
  
  if (!forceFlag) {
    console.log('⚠️  This will delete imported listings from the database');
    console.log('   Add --force flag to confirm deletion');
    console.log('   Example: node scripts/undo_last_import.js --force');
    return;
  }
  
  try {
    const { report, reportPath } = getLatestImportReport();
    
    console.log(`📄 Found import report: ${path.basename(reportPath)}`);
    console.log(`📅 Import timestamp: ${report.timestamp}`);
    console.log(`📊 Original summary:`, report.summary);
    
    // Find import user
    const importUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'excel-import')
    });
    
    if (!importUser) {
      console.log('❌ Excel import user not found');
      return;
    }
    
    // Get current imported listings
    const currentImported = await db
      .select()
      .from(listings)
      .where(eq(listings.sellerId, importUser.id));
    
    console.log(`🔍 Found ${currentImported.length} listings to remove`);
    
    if (currentImported.length === 0) {
      console.log('✅ No imported listings found to undo');
      return;
    }
    
    // Show what will be deleted
    console.log('\n📋 Listings to be removed:');
    currentImported.forEach((listing, i) => {
      console.log(`   ${i + 1}. ${listing.title} (${listing.quantity}${listing.unit} @ ${listing.currency}${listing.pricePerUnit})`);
    });
    
    // Perform deletion
    const deleteResult = await db
      .delete(listings)
      .where(eq(listings.sellerId, importUser.id));
    
    console.log(`\n✅ Successfully removed ${deleteResult.rowCount || currentImported.length} imported listings`);
    
    // Create undo report
    const undoReport = {
      undoTimestamp: new Date().toISOString(),
      originalImportReport: reportPath,
      originalImportTimestamp: report.timestamp,
      deletedListings: currentImported.length,
      deletedListingsDetails: currentImported.map(listing => ({
        id: listing.id,
        title: listing.title,
        quantity: listing.quantity,
        pricePerUnit: listing.pricePerUnit
      }))
    };
    
    const undoReportPath = `./backup/undo_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(undoReportPath, JSON.stringify(undoReport, null, 2));
    
    console.log(`📄 Undo report saved: ${undoReportPath}`);
    console.log('\n🎉 Import successfully reverted');
    
  } catch (error) {
    console.error('❌ Undo failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  undoLastImport();
}

export { undoLastImport };