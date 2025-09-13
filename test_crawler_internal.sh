#!/bin/bash

echo "🧪 Testing Internal Database Crawler"
echo "===================================="

# Test 1: Basic internal DB query
echo "📋 Test 1: Basic cannabis search"
curl -s -X POST http://localhost:5000/api/listings/match \
  -H "Content-Type: application/json" \
  -d '{
    "connectors": {"internalDB": ""},
    "criteria": {"productType": "cannabis", "quantity": 100},
    "options": {"timeoutMs": 3000}
  }' | head -c 1000

echo -e "\n\n📋 Test 2: High-value cannabis search"
curl -s -X POST http://localhost:5000/api/listings/match \
  -H "Content-Type: application/json" \
  -d '{
    "connectors": {"internalDB": ""},
    "criteria": {
      "commodityType": "cannabis",
      "priceRange": {"min": 25000, "max": 35000},
      "minSocialImpactScore": 50
    },
    "options": {"timeoutMs": 3000}
  }' | head -c 1000

echo -e "\n\n📋 Test 3: Location-based search"
curl -s -X POST http://localhost:5000/api/listings/match \
  -H "Content-Type: application/json" \
  -d '{
    "connectors": {"internalDB": ""},
    "criteria": {
      "productType": "cannabis",
      "region": "South Africa"
    },
    "options": {"timeoutMs": 3000}
  }' | head -c 1000

echo -e "\n\n✅ Internal crawler tests completed"