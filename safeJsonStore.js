import { promises as fs } from 'fs';

export async function readJson(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

export async function writeJson(filePath, data) {
  // Atomic write using temporary file
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (err) {
    // Clean up temp file if something went wrong
    try {
      await fs.unlink(tempPath);
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
    throw err;
  }
}