import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_FILE_PATH = path.join(__dirname, '..', 'attached_assets', 'Izenzo Trading Platfrom V1_1755168960137.xlsx');

// Inspect the Excel file structure
async function inspectExcel() {
  try {
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetNames = workbook.SheetNames;
    
    console.log('=== EXCEL FILE INSPECTION ===');
    console.log('Sheets found:', sheetNames);
    
    for (const sheetName of sheetNames) {
      console.log(`\n--- Sheet: ${sheetName} ---`);
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      console.log(`Rows: ${data.length}`);
      console.log('Columns:', Object.keys(data[0] || {}));
      
      // Show first 3 rows
      console.log('\nFirst 3 rows:');
      data.slice(0, 3).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, row);
      });
    }
  } catch (error) {
    console.error('Error inspecting Excel:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  inspectExcel();
}