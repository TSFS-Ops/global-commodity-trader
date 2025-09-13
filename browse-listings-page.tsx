import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Calendar, Package, DollarSign } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/main-layout";
import { apiRequest } from "@/lib/queryClient";

type Listing = {
  id: number;
  title: string;
  description?: string;
  region?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  category_code?: string;
  category_label?: string;
  subcategory_code?: string;
  status: string;
  createdAt: string;
  sellerId: number;
};

type BrowseFilters = {
  category_code?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

async function fetchListings(filters: BrowseFilters) {
  const params = new URLSearchParams();
  if (filters.category_code) params.set('category_code', filters.category_code);
  if (filters.q) params.set('q', filters.q);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());
  
  const res = await apiRequest("GET", `/api/listings?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch listings');
  return res.json();
}

async function fetchTaxonomy() {
  const res = await apiRequest("GET", "/api/taxonomy");
  if (!res.ok) throw new Error('Failed to fetch taxonomy');
  const data = await res.json();
  return data.taxonomy;
}

export function BrowseListingsPage() {
  const location = useLocation();
  const { data: taxonomy } = useQuery({
    queryKey: ['/api/taxonomy'],
    queryFn: fetchTaxonomy,
  });
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const initialCategoryCode = urlParams.get('category_code') || '';
  
  const [filters, setFilters] = useState<BrowseFilters>({
    category_code: initialCategoryCode,
    q: '',
    limit: 24,
    offset: 0
  });

  const [searchInput, setSearchInput] = useState('');

  // Update filters when URL changes
  useEffect(() => {
    const newCategoryCode = urlParams.get('category_code') || '';
    setFilters(prev => ({ ...prev, category_code: newCategoryCode, offset: 0 }));
  }, [location.search]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['/api/listings', filters],
    queryFn: () => fetchListings(filters),
  });

  const listings = response?.items || [];

  const handleCategoryChange = (categoryCode: string) => {
    setFilters(prev => ({ 
      ...prev, 
      category_code: categoryCode || undefined,
      offset: 0 
    }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ 
      ...prev, 
      q: searchInput || undefined,
      offset: 0 
    }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ 
      ...prev, 
      offset: (prev.offset || 0) + (prev.limit || 24)
    }));
  };

  const clearFilters = () => {
    setFilters({ limit: 24, offset: 0 });
    setSearchInput('');
  };

  if (!taxonomy) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-[1200px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Listings</h1>
          <p className="text-gray-600">
            Discover cannabis, hemp, and wellness products from verified sellers
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={filters.category_code || ''} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {taxonomy.categories.map(cat => (
                    <SelectItem key={cat.code} value={cat.code}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search listings..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(filters.category_code || filters.q) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filters.category_code && (
                <Badge variant="secondary">
                  {taxonomy.categories.find(c => c.code === filters.category_code)?.label}
                </Badge>
              )}
              {filters.q && (
                <Badge variant="secondary">
                  Search: "{filters.q}"
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Failed to load listings</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-600 mb-4">
              {filters.category_code || filters.q
                ? "Try adjusting your filters or search terms"
                : "Be the first to create a listing!"
              }
            </p>
            {(!filters.category_code && !filters.q) && (
              <Link to="/listings/create">
                <Button>Create Listing</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {listings.length} listing{listings.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listings.map((listing: Listing) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1 line-clamp-2">
                          {listing.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {listing.description}
                        </CardDescription>
                      </div>
                      {listing.status === 'live' && (
                        <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                          Live
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Category */}
                      {listing.category_label && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{listing.category_label}</span>
                        </div>
                      )}
                      
                      {/* Location */}
                      {listing.region && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{listing.region}</span>
                        </div>
                      )}
                      
                      {/* Price & Quantity */}
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {listing.currency} {listing.pricePerUnit.toFixed(2)} per {listing.unit}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {listing.quantity} {listing.unit} available
                        </span>
                      </div>
                      
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(listing.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t">
                      <Link to={`/listings/${listing.id}`}>
                        <Button className="w-full">View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {response?.nextOffset && (
              <div className="text-center">
                <Button onClick={handleLoadMore} variant="outline">
                  Load More Listings
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}