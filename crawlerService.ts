import path from 'path';
import fs from 'fs';
import pLimit from 'p-limit';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TIMEOUT = parseInt(process.env.CRAWLER_DEFAULT_TIMEOUT_MS || '3000', 10);
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '60000', 10);
const CONNECTORS_DIR = path.join(__dirname, '..', '..', 'connectors');

interface CacheEntry {
  ts: number;
  value: any[];
}

interface ConnectorModule {
  name: string;
  fetchAndNormalize: (token: string | null, criteria: any) => Promise<any[]>;
}

interface ConnectorTask {
  name: string;
  token: string | null;
  connector: ConnectorModule;
  cacheKey: string;
}

interface ConnectorResponse {
  name: string;
  success: boolean;
  results?: any[];
  fromCache?: boolean;
  error?: string;
}

interface CrawlerOptions {
  timeoutMs?: number;
  concurrency?: number;
}

interface CrawlerRequest {
  connectors?: { [name: string]: string };
  criteria?: any;
  options?: CrawlerOptions;
}

const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): any[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key: string, value: any[]): void {
  cache.set(key, { ts: Date.now(), value });
}

async function loadConnectors(): Promise<{ [name: string]: ConnectorModule }> {
  const connectors: { [name: string]: ConnectorModule } = {};
  
  // Dynamic discovery of connectors - mock connectors have been disabled
  // Future real external connectors can be added to the connectors directory
  try {
    const fs = await import('fs');
    if (fs.existsSync(CONNECTORS_DIR)) {
      const files = fs.readdirSync(CONNECTORS_DIR);
      for (const file of files) {
        // Skip disabled mock connectors and non-JS/TS files
        if (file.startsWith('_') || file.endsWith('.md') || 
            (!file.endsWith('.js') && !file.endsWith('.ts'))) {
          continue;
        }
        
        try {
          const modulePath = path.join(CONNECTORS_DIR, file);
          const connector = await import(modulePath);
          if (connector.name && connector.fetchAndNormalize) {
            connectors[connector.name] = connector;
          }
        } catch (err: any) {
          console.warn(`Failed to load connector ${file}:`, err.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('Error loading connectors directory:', err.message);
  }

  return connectors;
}

async function callConnectorWithTimeout(
  connector: ConnectorModule, 
  token: string | null, 
  criteria: any, 
  timeoutMs: number
): Promise<any[]> {
  const callPromise = connector.fetchAndNormalize(token, criteria);
  if (!timeoutMs || timeoutMs <= 0) {
    return callPromise;
  }
  
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Connector ${connector.name} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const results = await Promise.race([callPromise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return results;
  } catch (err) {
    if (timeoutId!) clearTimeout(timeoutId!);
    throw err;
  }
}

export async function fetchFromConnectors({ 
  connectors = {}, 
  criteria = {}, 
  options = {} 
}: CrawlerRequest = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const concurrency = options.concurrency ?? 5;

  const availableConnectors = await loadConnectors();
  const tasks: ConnectorTask[] = [];
  
  // If specific connectors are requested, use those
  for (const [name, token] of Object.entries(connectors)) {
    const connector = availableConnectors[name];
    if (!connector) {
      console.warn(`Requested connector ${name} not found`);
      continue;
    }
    const cacheKey = `${name}:${JSON.stringify(criteria)}`;
    tasks.push({ name, token, connector, cacheKey });
  }
  
  // If no specific connectors requested, use all available
  if (tasks.length === 0) {
    for (const [name, connector] of Object.entries(availableConnectors)) {
      const cacheKey = `${name}:${JSON.stringify(criteria)}`;
      tasks.push({ name, token: null, connector, cacheKey });
    }
  }

  const limit = pLimit(concurrency);
  const promises = tasks.map(task => limit(async (): Promise<ConnectorResponse> => {
    const cached = cacheGet(task.cacheKey);
    if (cached) {
      return { name: task.name, success: true, results: cached, fromCache: true };
    }
    
    try {
      const results = await callConnectorWithTimeout(task.connector, task.token, criteria, timeoutMs);
      const arr = Array.isArray(results) ? results : [];
      cacheSet(task.cacheKey, arr);
      return { name: task.name, success: true, results: arr, fromCache: false };
    } catch (err: any) {
      return { name: task.name, success: false, error: err.message || String(err) };
    }
  }));

  const responses = await Promise.all(promises);
  const all: any[] = [];
  const meta = { successes: [], failures: [] };
  
  for (const r of responses) {
    if (r.success) {
      (meta.successes as any).push({ name: r.name, count: r.results!.length, cached: !!r.fromCache });
      for (const item of r.results!) all.push(item);
    } else {
      (meta.failures as any).push({ name: r.name, error: r.error });
    }
  }
  
  // Log warning if all connectors failed
  if (meta.successes.length === 0 && meta.failures.length > 0) {
    console.warn('All connectors failed:', meta.failures);
  }
  
  return { meta, results: all };
}