const path = require('path');
const fs = require('fs');
const pLimitModule = require('p-limit');
const pLimit = pLimitModule.default || pLimitModule;

const DEFAULT_TIMEOUT = parseInt(process.env.CRAWLER_DEFAULT_TIMEOUT_MS || '3000', 10);
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '60000', 10);
const CONNECTORS_DIR = path.join(__dirname, '..', 'connectors');

const cache = new Map();
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}
function cacheSet(key, value) {
  cache.set(key, { ts: Date.now(), value });
}

function loadConnectors() {
  const connectors = {};
  if (!fs.existsSync(CONNECTORS_DIR)) return connectors;
  const files = fs.readdirSync(CONNECTORS_DIR);
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const modulePath = path.join(CONNECTORS_DIR, f);
    try {
      const mod = require(modulePath);
      if (mod && mod.name && typeof mod.fetchAndNormalize === 'function') {
        connectors[mod.name] = mod;
      } else {
        console.warn(`Connector ${f} missing required exports (name, fetchAndNormalize).`);
      }
    } catch (err) {
      console.warn(`Failed to load connector ${f}: ${err.message}`);
    }
  }
  return connectors;
}

async function callConnectorWithTimeout(connector, token, criteria, timeoutMs) {
  const callPromise = connector.fetchAndNormalize(token, criteria);
  if (!timeoutMs || timeoutMs <= 0) {
    return callPromise;
  }
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Connector ${connector.name} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const results = await Promise.race([callPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    return results;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchFromConnectors({ connectors = {}, criteria = {}, options = {} } = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const concurrency = options.concurrency ?? 5;
  const noCache = !!options.noCache;

  const availableConnectors = loadConnectors();
  const tasks = [];
  for (const [name, token] of Object.entries(connectors)) {
    const connector = availableConnectors[name];
    if (!connector) {
      console.warn(`Requested connector ${name} not found`);
      continue;
    }
    const cacheKey = `${name}:${JSON.stringify(criteria)}`;
    tasks.push({ name, token, connector, cacheKey });
  }
  if (tasks.length === 0) {
    throw new Error('No connectors specified. For this demo, pass { "connectors": { "internalDB": "" } }.');
  }

  const limit = pLimit(concurrency);
  const promises = tasks.map(task => limit(async () => {
    const cached = noCache ? null : cacheGet(task.cacheKey);
    if (cached) {
      return { name: task.name, success: true, results: cached, fromCache: true };
    }
    try {
      const results = await callConnectorWithTimeout(task.connector, task.token, criteria, timeoutMs);
      const arr = Array.isArray(results) ? results : [];
      cacheSet(task.cacheKey, arr);
      return { name: task.name, success: true, results: arr, fromCache: false };
    } catch (err) {
      return { name: task.name, success: false, error: err.message || String(err) };
    }
  }));

  const responses = await Promise.all(promises);
  const all = [];
  const meta = { successes: [], failures: [] };
  for (const r of responses) {
    if (r.success) {
      meta.successes.push({ name: r.name, count: r.results.length, cached: !!r.fromCache });
      for (const item of r.results) all.push(item);
    } else {
      meta.failures.push({ name: r.name, error: r.error });
    }
  }
  return { meta, results: all };
}

module.exports = { fetchFromConnectors };