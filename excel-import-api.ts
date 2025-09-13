import { Router } from 'express';
import { importFromExcel } from './import-excel';
import { db } from './db';
import { listings } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// API endpoint to trigger Excel import
router.post('/api/admin/import-excel', async (req, res) => {
  try {
    const result = await importFromExcel();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : String(error)}`,
      imported: 0
    });
  }
});

// API endpoint to get import status and stats
router.get('/api/admin/import-status', async (req, res) => {
  try {
    const totalListings = await db.select().from(listings);
    const importedListings = await db.select().from(listings).where(
      eq(listings.sellerId, (await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, 'excel-import')
      }))?.id || 0)
    );

    res.json({
      success: true,
      total_listings: totalListings.length,
      imported_listings: importedListings.length,
      last_import: importedListings.length > 0 ? importedListings[0].createdAt : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Status check failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

// API endpoint to clear imported data (for testing/rollback)
router.delete('/api/admin/clear-imported', async (req, res) => {
  try {
    const importUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'excel-import')
    });

    if (!importUser) {
      return res.json({ success: true, message: 'No import user found', deleted: 0 });
    }

    const result = await db.delete(listings).where(eq(listings.sellerId, importUser.id));
    
    res.json({
      success: true,
      message: `Cleared ${result.rowCount || 0} imported listings`,
      deleted: result.rowCount || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Clear failed: ${error instanceof Error ? error.message : String(error)}`,
      deleted: 0
    });
  }
});

export { router as excelImportRouter };