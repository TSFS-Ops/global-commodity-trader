const express = require('express');
const router = express.Router();
const crawlerService = require('../services/crawlerService');

router.post('/search', async (req, res) => {
  try {
    const { criteria = {}, connectors = {}, options = {} } = req.body;
    const response = await crawlerService.fetchFromConnectors({
      connectors,
      criteria,
      options
    });
    res.json({ ok: true, meta: response.meta, results: response.results });
  } catch (err) {
    console.error('Crawler search error', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

module.exports = router;