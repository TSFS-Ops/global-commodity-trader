# Connectors Directory

This directory contains external data source connectors for the commodity trading platform.

## Status

Mock connectors have been disabled and moved to backup. The platform now uses real data imported from Excel files.

## Connector Structure

Each connector should export:
- `name`: string identifier for the connector
- `fetchAndNormalize`: function that takes (token, criteria) and returns normalized data

## Disabled Mock Connectors

- `_mock-hemp-supplier.disabled.ts` - Demo hemp supplier data
- `_mock-cannabis-exchange.disabled.ts` - Demo cannabis exchange data  
- `_mock-carbon-credits.disabled.ts` - Demo carbon credits data

These files are preserved for reference but are not loaded by the crawler service.