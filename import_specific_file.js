#!/usr/bin/env node

// Import specific Excel file directly
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const targetFile = 'attached_assets/Izenzo Trading Platfrom V1_1755170867011.xlsx';

console.log('🔍 Analyzing New Excel File');
console.log('============================');

if (!fs.existsSync(targetFile)) {
  console.log('❌ New Excel file not found');
  process.exit(1);
}

console.log(`📄 Analyzing: ${targetFile}`);

try {
  const workbook = XLSX.readFile(targetFile);
  const sheetNames = workbook.SheetNames;
  
  console.log(`📊 Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`);
  
  // Analyze first sheet
  const firstSheet = workbook.Sheets[sheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  
  console.log(`📋 Sheet "${sheetNames[0]}" has ${jsonData.length} rows`);
  
  if (jsonData.length > 0) {
    console.log('\n🔤 Column Headers:');
    const headers = jsonData[0];
    headers.forEach((header, i) => {
      console.log(`   ${i + 1}. ${header}`);
    });
    
    console.log('\n📊 First 5 Data Rows:');
    jsonData.slice(1, 6).forEach((row, i) => {
      console.log(`\nRow ${i + 2}:`);
      headers.forEach((header, j) => {
        if (row[j]) {
          console.log(`   ${header}: ${row[j]}`);
        }
      });
    });
  }
  
  // Compare with original file
  const originalFile = 'attached_assets/Izenzo Trading Platfrom V1_1755168960137.xlsx';
  if (fs.existsSync(originalFile)) {
    const originalWorkbook = XLSX.readFile(originalFile);
    const originalData = XLSX.utils.sheet_to_json(originalWorkbook.Sheets[originalWorkbook.SheetNames[0]], { header: 1 });
    
    console.log('\n🔄 Comparison with Original:');
    console.log(`   Original: ${originalData.length} rows`);
    console.log(`   New: ${jsonData.length} rows`);
    console.log(`   Difference: ${jsonData.length - originalData.length} rows`);
    
    if (jsonData.length !== originalData.length) {
      console.log('📈 NEW DATA DETECTED - Continue with import');
    } else {
      console.log('📋 Same data size - May be duplicate');
    }
  }
  
} catch (error) {
  console.error('❌ Error analyzing file:', error.message);
}

console.log('\n✅ Analysis complete');