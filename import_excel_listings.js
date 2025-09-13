#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  purgeExisting: process.argv.includes('--purge-existing'),
  verbose: process.argv.includes('--verbose'),
  maxRows: parseInt(process.argv.find(arg => arg.startsWith('--max-rows='))?.split('=')[1]) || null,
  customFile: process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1] || null
};

// Column mapping configuration - maps Excel headers to our canonical schema
const COLUMN_MAPPINGS = {
  // ID fields
  'id': 'id',
  'listing id': 'id',
  'listingid': 'id',
  
  // Counterparty/Seller fields
  'seller': 'counterpartyName',
  'counterparty': 'counterpartyName',
  'counterpartyname': 'counterpartyName',
  'grower': 'counterpartyName',
  'client': 'counterpartyName',
  'company': 'counterpartyName',
  
  // Product/Commodity fields
  'product': 'commodityType',
  'commodity': 'commodityType',
  'commoditytype': 'commodityType',
  'type': 'commodityType',
  'category': 'commodityType',
  
  // Quantity fields
  'quantity': 'quantityAvailable',
  'qty': 'quantityAvailable',
  'quantityavailable': 'quantityAvailable',
  'amount': 'quantityAvailable',
  'volume': 'quantityAvailable',
  
  // Price fields
  'price': 'pricePerUnit',
  'priceperunit': 'pricePerUnit',
  'unitprice': 'pricePerUnit',
  'rate': 'pricePerUnit',
  'bid/offer': 'pricePerUnit',
  'bidoffer': 'pricePerUnit',
  'bid': 'pricePerUnit',
  'offer': 'pricePerUnit',
  
  // Location fields
  'location': 'region',
  'region': 'region',
  'country': 'country',
  'city': 'region',
  'address': 'region',
  
  // Quality fields
  'quality': 'qualitySpecs',
  'qualityspecs': 'qualitySpecs',
  'grade': 'qualitySpecs',
  'specs': 'qualitySpecs',
  '%thc': 'qualitySpecs',
  'thc': 'qualitySpecs',
  
  // Social impact fields
  'social score': 'socialImpactScore',
  'socialimpactscore': 'socialImpactScore',
  'impact score': 'socialImpactScore',
  'impactscore': 'socialImpactScore',
  'social impact category': 'socialImpactCategory',
  'socialimpactcategory': 'socialImpactCategory',
  'impact category': 'socialImpactCategory',
  
  // License fields
  'license': 'licenseStatus',
  'licensestatus': 'licenseStatus',
  'licensed': 'licenseStatus',
  
  // Currency fields
  'currency': 'currency',
  'curr': 'currency',
  
  // Status fields
  'status': 'status',
  'state': 'status',
  
  // Contact fields
  'contact': 'contactInfo',
  'email': 'contactInfo',
  'phone': 'contactInfo',
  
  // Notes fields
  'notes': 'notes',
  'description': 'notes',
  'details': 'notes',
  'comments': 'notes'
};

// Find Excel files in common upload locations
function findExcelFiles() {
  // Use custom file if specified
  if (CONFIG.customFile) {
    if (fs.existsSync(CONFIG.customFile)) {
      console.log(`📌 Using specified file: ${CONFIG.customFile}`);
      return [CONFIG.customFile];
    } else {
      throw new Error(`Specified file not found: ${CONFIG.customFile}`);
    }
  }
  
  const searchPaths = [
    '../attached_assets',
    './attached_assets',
    '../uploads',
    './uploads',
    '../files',
    './files',
    '../data',
    './data',
    '..',
    '.',
  ];
  
  const excelFiles = [];
  
  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const files = fs.readdirSync(searchPath);
      const xlsxFiles = files.filter(file => 
        file.toLowerCase().endsWith('.xlsx') || 
        file.toLowerCase().endsWith('.xls')
      );
      
      for (const file of xlsxFiles) {
        excelFiles.push(path.join(searchPath, file));
      }
    }
  }
  
  return excelFiles;
}

// Normalize column header for mapping
function normalizeHeader(header) {
  return header.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Map Excel row to canonical schema
function mapRowToCanonical(row, columnMappings, unmappedColumns) {
  const canonical = {
    metadata: {}
  };
  
  for (const [excelColumn, value] of Object.entries(row)) {
    const normalizedColumn = normalizeHeader(excelColumn);
    const canonicalField = columnMappings[normalizedColumn];
    
    if (canonicalField) {
      canonical[canonicalField] = value;
    } else {
      // Store unmapped columns in metadata
      canonical.metadata[excelColumn] = value;
      if (!unmappedColumns.has(excelColumn)) {
        unmappedColumns.add(excelColumn);
      }
    }
  }
  
  return canonical;
}

// Parse quantity with unit
function parseQuantity(quantityStr) {
  if (!quantityStr) return { quantity: 0, unit: 'kg' };
  
  const str = quantityStr.toString().trim();
  const match = str.match(/([0-9.]+)\s*([a-zA-Z]*)/);
  
  if (!match) return { quantity: 0, unit: 'kg' };
  
  let quantity = parseFloat(match[1]);
  let unit = match[2].toLowerCase() || 'kg';
  
  // Convert tons to kg
  if (unit.includes('ton')) {
    quantity = quantity * 1000;
    unit = 'kg';
  }
  
  return { quantity, unit };
}

// Parse price with currency detection
function parsePrice(priceStr) {
  if (!priceStr) return { price: 0, currency: 'ZAR', unit: 'kg' };
  
  const str = priceStr.toString().trim();
  
  // Try multiple price patterns
  const patterns = [
    /([A-Z]{3})?[\s]*([0-9.]+)[\s]*\/[\s]*([a-zA-Z]+)/i,  // USD30/g, R30/g
    /([A-Z]{3})?[\s]*([0-9.]+)/i,  // USD30, R30
  ];
  
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const currency = match[1] || (str.includes('R') ? 'ZAR' : 'USD');
      let price = parseFloat(match[2]);
      const unit = match[3] ? match[3].toLowerCase() : 'kg';
      
      // Convert per-gram to per-kg
      if (unit === 'g') {
        price = price * 1000;
      }
      
      return { price, currency, unit: 'kg' };
    }
  }
  
  return { price: 0, currency: 'ZAR', unit: 'kg' };
}

// Validate and clean row data
function validateRow(row, rowIndex) {
  const errors = [];
  const warnings = [];
  
  // Parse quantity
  const quantityData = parseQuantity(row.quantityAvailable);
  row.quantityAvailable = quantityData.quantity;
  row.unit = quantityData.unit;
  
  if (row.quantityAvailable <= 0) {
    errors.push(`Invalid quantity: ${row.quantityAvailable}`);
  }
  
  // Parse price
  const priceData = parsePrice(row.pricePerUnit);
  row.pricePerUnit = priceData.price;
  row.currency = row.currency || priceData.currency;
  
  if (row.pricePerUnit < 0) {
    warnings.push(`Negative price: ${row.pricePerUnit}`);
  }
  
  // Validate social impact score
  if (row.socialImpactScore !== undefined && row.socialImpactScore !== null) {
    const score = parseFloat(row.socialImpactScore);
    if (isNaN(score)) {
      row.socialImpactScore = null;
      warnings.push(`Invalid social impact score, set to null`);
    } else if (score < 0 || score > 100) {
      row.socialImpactScore = Math.max(0, Math.min(100, score));
      warnings.push(`Social impact score clamped to 0-100 range`);
    } else {
      row.socialImpactScore = score;
    }
  }
  
  // Clean string fields
  ['counterpartyName', 'commodityType', 'region', 'country'].forEach(field => {
    if (row[field]) {
      row[field] = row[field].toString().trim();
    }
  });
  
  // Generate import key for deduplication
  const keyParts = [
    row.counterpartyName || '',
    row.commodityType || '',
    row.quantityAvailable || 0,
    row.pricePerUnit || 0
  ];
  row.importKey = keyParts.join('|').toLowerCase();
  
  return { errors, warnings };
}

// Main import function
async function importExcelListings() {
  console.log('🚀 Excel Listings Import Script');
  console.log('================================');
  
  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be imported');
  }
  
  // Find Excel files
  const excelFiles = findExcelFiles();
  if (excelFiles.length === 0) {
    console.error('❌ No Excel files found in common locations');
    process.exit(1);
  }
  
  console.log(`📁 Found ${excelFiles.length} Excel file(s):`);
  excelFiles.forEach(file => console.log(`   - ${file}`));
  
  // Use the first Excel file found
  const filePath = excelFiles[0];
  console.log(`\n📖 Processing: ${filePath}`);
  
  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  
  if (sheetNames.length === 0) {
    console.error('❌ No sheets found in Excel file');
    process.exit(1);
  }
  
  // Use first non-empty sheet
  let selectedSheet = null;
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length > 0) {
      selectedSheet = { name: sheetName, data };
      break;
    }
  }
  
  if (!selectedSheet) {
    console.error('❌ No non-empty sheets found');
    process.exit(1);
  }
  
  console.log(`📊 Using sheet: ${selectedSheet.name} (${selectedSheet.data.length} rows)`);
  
  // Analyze column headers
  const sampleRow = selectedSheet.data[0];
  const excelHeaders = Object.keys(sampleRow);
  const unmappedColumns = new Set();
  
  console.log('\n🔍 Column Analysis:');
  console.log('Excel columns found:', excelHeaders);
  
  // Create column mapping
  const columnMappings = {};
  const mappingSummary = [];
  
  for (const header of excelHeaders) {
    const normalizedHeader = normalizeHeader(header);
    const canonicalField = COLUMN_MAPPINGS[normalizedHeader];
    
    if (canonicalField) {
      columnMappings[normalizedHeader] = canonicalField;
      mappingSummary.push(`✓ Excel column "${header}" -> field ${canonicalField}`);
    } else {
      mappingSummary.push(`? Excel column "${header}" -> metadata (unmapped)`);
    }
  }
  
  console.log('\n📋 Column Mappings:');
  mappingSummary.forEach(mapping => console.log(`   ${mapping}`));
  
  // Process rows
  console.log('\n⚙️ Processing rows...');
  const results = {
    totalRows: selectedSheet.data.length,
    processedRows: 0,
    validRows: 0,
    errorRows: 0,
    warningRows: 0,
    duplicateKeys: new Set(),
    errors: [],
    warnings: [],
    processedData: []
  };
  
  const maxRows = CONFIG.maxRows || selectedSheet.data.length;
  const rowsToProcess = selectedSheet.data.slice(0, maxRows);
  
  for (let i = 0; i < rowsToProcess.length; i++) {
    const rawRow = rowsToProcess[i];
    const rowIndex = i + 1;
    
    try {
      // Map to canonical schema
      const canonicalRow = mapRowToCanonical(rawRow, columnMappings, unmappedColumns);
      
      // Validate and clean
      const validation = validateRow(canonicalRow, rowIndex);
      
      if (validation.errors.length > 0) {
        results.errorRows++;
        results.errors.push({
          row: rowIndex,
          data: rawRow,
          errors: validation.errors
        });
        continue;
      }
      
      if (validation.warnings.length > 0) {
        results.warningRows++;
        results.warnings.push({
          row: rowIndex,
          data: canonicalRow,
          warnings: validation.warnings
        });
      }
      
      // Check for duplicates
      if (results.duplicateKeys.has(canonicalRow.importKey)) {
        results.warnings.push({
          row: rowIndex,
          data: canonicalRow,
          warnings: ['Duplicate import key - will be upserted']
        });
      } else {
        results.duplicateKeys.add(canonicalRow.importKey);
      }
      
      results.processedData.push({
        ...canonicalRow,
        sourceRow: rowIndex,
        sourceFile: filePath
      });
      
      results.validRows++;
      
    } catch (error) {
      results.errorRows++;
      results.errors.push({
        row: rowIndex,
        data: rawRow,
        errors: [`Processing error: ${error.message}`]
      });
    }
    
    results.processedRows++;
    
    if (rowIndex % 10 === 0 || rowIndex === rowsToProcess.length) {
      process.stdout.write(`\r   Processed ${rowIndex}/${rowsToProcess.length} rows...`);
    }
  }
  
  console.log('\n');
  
  // Generate timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Create output directory
  const outputDir = './backup';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check for critical missing fields
  const criticalFields = ['counterpartyName', 'quantityAvailable', 'pricePerUnit'];
  const missingCritical = [];
  
  criticalFields.forEach(field => {
    const hasField = results.processedData.some(row => row[field] && row[field] !== 0);
    if (!hasField) {
      missingCritical.push(field);
    }
  });
  
  // Generate report
  const report = {
    timestamp,
    config: CONFIG,
    sourceFile: filePath,
    sheetName: selectedSheet.name,
    columnMappings: mappingSummary,
    unmappedColumns: Array.from(unmappedColumns),
    missingCriticalFields: missingCritical,
    summary: {
      totalRows: results.totalRows,
      processedRows: results.processedRows,
      validRows: results.validRows,
      errorRows: results.errorRows,
      warningRows: results.warningRows,
      duplicates: results.duplicateKeys.size,
      criticalFieldsIssues: missingCritical.length > 0
    },
    errors: results.errors,
    warnings: results.warnings,
    sampleData: results.processedData.slice(0, 10), // Show first 10 as requested
    allProcessedData: CONFIG.dryRun ? results.processedData : [] // Include all data in dry-run
  };
  
  // Write preview/report file
  const reportFileName = CONFIG.dryRun 
    ? `import_preview_${timestamp}.json`
    : `import_report_${timestamp}.json`;
  const reportPath = path.join(outputDir, reportFileName);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Display summary
  console.log('\n📊 Import Summary:');
  console.log(`   Total rows: ${results.totalRows}`);
  console.log(`   Processed: ${results.processedRows}`);
  console.log(`   Valid: ${results.validRows}`);
  console.log(`   Errors: ${results.errorRows}`);
  console.log(`   Warnings: ${results.warningRows}`);
  console.log(`   Unique records: ${results.duplicateKeys.size}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors found:');
    results.errors.slice(0, 5).forEach(error => {
      console.log(`   Row ${error.row}: ${error.errors.join(', ')}`);
    });
    if (results.errors.length > 5) {
      console.log(`   ... and ${results.errors.length - 5} more errors`);
    }
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    results.warnings.slice(0, 5).forEach(warning => {
      console.log(`   Row ${warning.row}: ${warning.warnings.join(', ')}`);
    });
    if (results.warnings.length > 5) {
      console.log(`   ... and ${results.warnings.length - 5} more warnings`);
    }
  }
  
  console.log(`\n📄 Report saved: ${reportPath}`);
  
  // Copy report to docs/ for easy access
  if (!fs.existsSync('./docs')) {
    fs.mkdirSync('./docs', { recursive: true });
  }
  fs.writeFileSync('./docs/latest_import_report.json', JSON.stringify(report, null, 2));
  
  if (CONFIG.dryRun) {
    console.log('\n🔍 DRY RUN COMPLETE - No data imported');
    console.log('Run without --dry-run to perform actual import');
    
    // Show first 10 preview records as requested
    if (results.processedData.length > 0) {
      console.log('\n📊 First 10 Preview Records:');
      results.processedData.slice(0, 10).forEach((row, i) => {
        console.log(`\n${i + 1}. ${row.counterpartyName || 'Unknown'} - ${row.commodityType || 'Unknown'}`);
        console.log(`   Quantity: ${row.quantityAvailable || 0}${row.unit || ''}`);
        console.log(`   Price: ${row.currency || ''}${row.pricePerUnit || 0}/${row.unit || 'unit'}`);
        if (row.qualitySpecs) console.log(`   Quality: ${row.qualitySpecs}`);
        if (row.socialImpactScore) console.log(`   Social Score: ${row.socialImpactScore}`);
        if (row.metadata && Object.keys(row.metadata).length > 0) {
          const metaKeys = Object.keys(row.metadata).slice(0, 2);
          console.log(`   Metadata: ${metaKeys.join(', ')}${Object.keys(row.metadata).length > 2 ? '...' : ''}`);
        }
      });
    }
    
    // Check for critical missing fields
    if (missingCritical.length > 0) {
      console.log('\n❌ CRITICAL FIELDS MISSING:');
      missingCritical.forEach(field => {
        console.log(`   - ${field}: Required for import`);
      });
      console.log('\nPlease review the Excel file and ensure these fields have valid data.');
      console.log('Rows marked as incomplete will be skipped during real import.');
    }
  } else {
    console.log('\n✅ Import completed successfully');
  }
  
  // Show sample data
  if (results.processedData.length > 0) {
    console.log('\n📋 Sample processed data:');
    results.processedData.slice(0, 3).forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.counterpartyName || 'Unknown'} - ${row.commodityType || 'Unknown'}`);
      console.log(`   Quantity: ${row.quantityAvailable}${row.unit || ''}`);
      console.log(`   Price: ${row.currency || ''}${row.pricePerUnit}/${row.unit || 'unit'}`);
      if (row.qualitySpecs) console.log(`   Quality: ${row.qualitySpecs}`);
      if (row.socialImpactScore) console.log(`   Social Score: ${row.socialImpactScore}`);
    });
  }
  
  return report;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  importExcelListings()
    .then(report => {
      console.log('\n🎉 Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Script failed:', error.message);
      if (CONFIG.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    });
}

export { importExcelListings };