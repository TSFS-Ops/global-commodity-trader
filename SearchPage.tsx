import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/layout/main-layout";
import { SmartSearchBar } from "@/components/search/smart-search-bar";
import { CommodityFilters } from "@/components/search/commodity-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SearchResultsSkeletonGrid } from "@/components/skeletons/search-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Leaf, MapPin, DollarSign, Star, Clock, TrendingUp } from "lucide-react";

type Result = {
  counterpartyId?: string;
  counterpartyName?: string;
  commodityType?: string;
  quantityAvailable?: number;
  pricePerUnit?: number;
  region?: string;
  qualitySpecs?: string;
  licenseStatus?: boolean;
  socialImpactScore?: number;
  socialImpactCategory?: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [commodityType, setCommodityType] = useState('');
  const [region, setRegion] = useState('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [useListings, setUseListings] = useState(true);
  const [useSignals, setUseSignals] = useState(false);
  const [signalsEnabled, setSignalsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Load saved preferences and recent searches
  useEffect(() => {
    const savedRecentSearches = localStorage.getItem('recentSearches');
    if (savedRecentSearches) {
      setRecentSearches(JSON.parse(savedRecentSearches));
    }

    const savedCommodity = localStorage.getItem('preferredCommodity');
    if (savedCommodity) {
      setCommodityType(savedCommodity);
    }

    const savedRegion = localStorage.getItem('preferredRegion');
    if (savedRegion) {
      setRegion(savedRegion);
    }

    // Check if signals are enabled
    async function checkSignalsEnabled() {
      try {
        const res = await fetch('/api/signals/search?limit=1');
        if (res.ok) {
          setSignalsEnabled(true);
        }
      } catch (err) {
        setSignalsEnabled(false);
      }
    }
    checkSignalsEnabled();
  }, []);

  // Generate search suggestions based on input
  useEffect(() => {
    if (query.length > 2) {
      const suggestions = [
        `${query} in ${region || 'South Africa'}`,
        `Premium ${query}`,
        `Organic ${query}`,
        `${query} wholesale`,
        `${query} extract`
      ].filter(Boolean);
      setSearchSuggestions(suggestions.slice(0, 3));
    } else {
      setSearchSuggestions([]);
    }
  }, [query, region]);

  // Save search preferences
  const savePreferences = () => {
    if (commodityType) {
      localStorage.setItem('preferredCommodity', commodityType);
    }
    if (region) {
      localStorage.setItem('preferredRegion', region);
    }
  };

  // Add to recent searches
  const addToRecentSearches = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      // Build connectors object from toggles
      const connectors: any = {};
      if (useListings) connectors.internalDB = '';
      if (useSignals && signalsEnabled) connectors.internalSignals = '';

      const body: any = {
        query,
        commodityType: commodityType.trim() || '',
        region: region.trim() || '',
        priceMin: priceMin !== '' ? Number(priceMin) : null,
        priceMax: priceMax !== '' ? Number(priceMax) : null,
        useListings,
        useSignals: useSignals && signalsEnabled,
        connectors,
        options: { timeoutMs: 3000, noCache: true }
      };

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Search failed');
      setMeta(json.meta);
      setResults(json.results || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const retrySearch = () => {
    setError(null);
    runSearch();
  };

  const clearSearch = () => {
    setQuery('');
    setCommodityType('');
    setRegion('');
    setPriceMin('');
    setPriceMax('');
    setResults([]);
    setError(null);
    setHasSearched(false);
  };

  // Handle smart search
  const handleSmartSearch = (searchQuery: string, filters?: any) => {
    setQuery(searchQuery);
    if (filters?.category?.length > 0) {
      setCommodityType(filters.category.join(', '));
    }
    if (filters?.region) {
      setRegion(filters.region);
    }
    
    // Trigger search with new parameters
    setTimeout(() => {
      runSearch();
    }, 100);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">Search Cannabis Products</h1>
          <p className="text-neutral-600">Find authentic cannabis and hemp products from verified suppliers</p>
        </div>

        {/* Smart Search Bar */}
        <div className="flex justify-center">
          <SmartSearchBar 
            onSearch={handleSmartSearch}
            isLoading={loading}
            placeholder="Search cannabis, hemp, CBD products by name, category, or location..."
          />
        </div>

        {/* Advanced Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
              <input 
                className="w-full border border-gray-300 rounded-md p-2 text-sm" 
                placeholder="e.g. cannabis, hemp, cbd" 
                value={commodityType} 
                onChange={e=>setCommodityType(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input 
                className="w-full border border-gray-300 rounded-md p-2 text-sm" 
                placeholder="e.g. Western Cape" 
                value={region} 
                onChange={e=>setRegion(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Min (R)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full border border-gray-300 rounded-md p-2 text-sm" 
                value={priceMin} 
                onChange={e=>setPriceMin(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Max (R)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full border border-gray-300 rounded-md p-2 text-sm" 
                value={priceMax} 
                onChange={e=>setPriceMax(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={useListings} 
                  onChange={(e) => setUseListings(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Internal Listings</span>
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={useSignals && signalsEnabled} 
                  onChange={(e) => setUseSignals(e.target.checked)}
                  disabled={!signalsEnabled}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Signals {!signalsEnabled && '(disabled)'}</span>
              </label>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-green-600 text-sm font-medium">✓ Authentic cannabis/hemp data only</span>
              <button 
                type="submit" 
                onClick={runSearch}
                disabled={loading}
                className="bg-[#173c1e] hover:bg-[#173c1e]/90 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* Commodity Quick Filters */}
        <CommodityFilters 
          selected={commodityType} 
          onSelect={setCommodityType} 
        />

        {/* Results section */}
        <ErrorBoundary error={error} onRetry={retrySearch}>
          {loading ? (
            <SearchResultsSkeletonGrid count={4} />
          ) : !hasSearched ? (
            <EmptyState
              icon={<Search size={48} />}
              title="Ready to search cannabis products"
              description="Use the search bar above to find cannabis, hemp, CBD, and other products from verified suppliers across South Africa."
              actions={[
                {
                  label: "Search Cannabis",
                  onClick: () => {
                    setCommodityType('cannabis');
                    runSearch();
                  }
                },
                {
                  label: "Search Hemp",
                  onClick: () => {
                    setCommodityType('hemp');
                    runSearch();
                  },
                  variant: "outline"
                }
              ]}
              suggestions={[
                "Try specific product names like 'CBD oil' or 'indoor cannabis'",
                "Filter by region to find local suppliers",
                "Use price ranges to find products in your budget"
              ]}
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Search size={48} />}
              title="No results found"
              description="We couldn't find any products matching your search criteria. This search only shows authentic cannabis/hemp listings from verified suppliers."
              actions={[
                {
                  label: "Clear Search",
                  onClick: clearSearch
                },
                {
                  label: "Try Again", 
                  onClick: retrySearch,
                  variant: "outline"
                }
              ]}
              suggestions={[
                "Try different keywords or remove some filters",
                "Check spelling of product names",
                "Expand your price range or region"
              ]}
            />
          ) : null}
        </ErrorBoundary>

      <div className="grid md:grid-cols-2 gap-4">
        {results.map((r, i) => (
          <div key={r.counterpartyId || i} className="border rounded p-3">
            <div className="font-medium">{r.counterpartyName || 'Unknown counterparty'}</div>
            <div className="text-sm mt-1">
              <div><b>Commodity:</b> {r.commodityType || '—'}</div>
              <div><b>Region:</b> {r.region || '—'}</div>
              <div><b>Quantity:</b> {r.quantityAvailable ?? '—'}</div>
              <div><b>Price:</b> {typeof r.pricePerUnit === 'number' ? r.pricePerUnit : '—'}</div>
              <div><b>Quality:</b> {r.qualitySpecs || '—'}</div>
              <div><b>License:</b> {r.licenseStatus ? 'Yes' : (r.licenseStatus === false ? 'No' : '—')}</div>
            </div>
          </div>
        ))}
      </div>

      {meta && (
        <div className="mt-6 text-sm text-slate-500">
          <div><b>Connectors:</b> {Array.isArray(meta.successes) ? meta.successes.map((s:any)=>`${s.name}${s.cached?'(cached)':''}[${s.count}]`).join(', ') : '—'}</div>
          {meta.failures && meta.failures.length > 0 && (
            <div className="text-red-600"><b>Failures:</b> {meta.failures.map((f:any)=>`${f.name}: ${f.error}`).join('; ')}</div>
          )}
        </div>
      )}
      </div>
    </MainLayout>
  );
}