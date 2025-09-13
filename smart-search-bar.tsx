import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, History, TrendingUp, Filter, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  text: string;
  type: "recent" | "popular" | "category" | "location";
  metadata?: {
    category?: string;
    count?: number;
    region?: string;
  };
}

interface SmartSearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  placeholder?: string;
  isLoading?: boolean;
}

interface SearchFilters {
  category?: string[];
  region?: string;
  priceRange?: { min: number; max: number };
}

export function SmartSearchBar({ 
  onSearch, 
  placeholder = "Search cannabis, hemp, CBD products...",
  isLoading = false 
}: SmartSearchBarProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<SearchFilters>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cannabis-search-history");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to parse search history");
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(q => q !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("cannabis-search-history", JSON.stringify(updated));
  };

  // Get search suggestions based on query
  const { data: suggestions = [] } = useQuery<SearchSuggestion[]>({
    queryKey: ["/api/search/suggestions", query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.suggestions || [];
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Popular cannabis categories for quick selection
  const popularCategories = [
    { name: "Cannabis", count: "120+" },
    { name: "Hemp", count: "85+" },
    { name: "CBD", count: "67+" },
    { name: "THC", count: "43+" },
  ];

  // Popular regions
  const popularRegions = [
    "Western Cape", "Eastern Cape", "KwaZulu-Natal", "Gauteng"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      saveRecentSearch(finalQuery);
      onSearch(finalQuery, selectedFilters);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const addCategoryFilter = (category: string) => {
    const current = selectedFilters.category || [];
    if (!current.includes(category)) {
      setSelectedFilters({
        ...selectedFilters,
        category: [...current, category]
      });
    }
  };

  const removeCategoryFilter = (category: string) => {
    setSelectedFilters({
      ...selectedFilters,
      category: selectedFilters.category?.filter(c => c !== category)
    });
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "recent": return <History size={16} className="text-gray-400" />;
      case "popular": return <TrendingUp size={16} className="text-orange-500" />;
      case "category": return <Badge variant="secondary" className="text-xs">Category</Badge>;
      case "location": return <Badge variant="outline" className="text-xs">Location</Badge>;
      default: return <Search size={16} className="text-gray-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(query.length > 0 || recentSearches.length > 0)}
          placeholder={placeholder}
          className="pl-10 pr-20 h-12 text-base border-2 border-gray-200 focus:border-[#a8c566] focus:ring-[#a8c566]/20"
          disabled={isLoading}
        />
        
        {/* Clear and Action Buttons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearSearch}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-8 w-8 p-0",
              showFilters && "bg-[#a8c566]/20 text-[#173c1e]"
            )}
          >
            <Filter size={16} />
          </Button>

          <Button 
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="bg-[#173c1e] hover:bg-[#173c1e]/90 text-white px-4 h-8"
          >
            {isLoading ? "..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedFilters.category?.length || selectedFilters.region) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedFilters.category?.map((category) => (
            <Badge 
              key={category} 
              variant="secondary" 
              className="bg-[#a8c566]/20 text-[#173c1e] hover:bg-[#a8c566]/30"
            >
              {category}
              <X 
                size={12} 
                className="ml-1 cursor-pointer" 
                onClick={() => removeCategoryFilter(category)}
              />
            </Badge>
          ))}
          {selectedFilters.region && (
            <Badge variant="outline">
              📍 {selectedFilters.region}
              <X 
                size={12} 
                className="ml-1 cursor-pointer" 
                onClick={() => setSelectedFilters({ ...selectedFilters, region: undefined })}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Quick Filters Panel */}
      {showFilters && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 border-2 border-gray-100 shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Popular Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {popularCategories.map((cat) => (
                    <Button
                      key={cat.name}
                      variant="outline"
                      size="sm"
                      onClick={() => addCategoryFilter(cat.name.toLowerCase())}
                      className="text-xs h-8"
                    >
                      {cat.name} <span className="text-gray-400 ml-1">({cat.count})</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Popular Regions</h3>
                <div className="flex flex-wrap gap-2">
                  {popularRegions.map((region) => (
                    <Button
                      key={region}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFilters({ ...selectedFilters, region })}
                      className="text-xs h-8"
                    >
                      📍 {region}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (query.length > 0 || recentSearches.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-40 border-2 border-gray-100 shadow-lg max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <History size={14} className="mr-1" />
                  Recent Searches
                </h4>
                {recentSearches.map((search, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick({ id: search, text: search, type: "recent" })}
                    className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer rounded text-sm"
                  >
                    <Search size={14} className="text-gray-400 mr-2" />
                    {search}
                  </div>
                ))}
                <Separator className="mt-2" />
              </div>
            )}

            {/* Smart Suggestions */}
            {query.length > 0 && (
              <div className="p-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Suggestions</h4>
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 cursor-pointer rounded text-sm"
                    >
                      <div className="flex items-center">
                        {getSuggestionIcon(suggestion.type)}
                        <span className="ml-2">{suggestion.text}</span>
                      </div>
                      {suggestion.metadata?.count && (
                        <span className="text-xs text-gray-400">
                          {suggestion.metadata.count} results
                        </span>
                      )}
                    </div>
                  ))
                ) : query.length >= 2 && (
                  <div className="py-2 px-3 text-sm text-gray-500">
                    No suggestions found for "{query}"
                  </div>
                )}
              </div>
            )}

            {/* Quick Category Suggestions */}
            {!query && (
              <div className="p-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <TrendingUp size={14} className="mr-1" />
                  Popular Categories
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {popularCategories.map((category) => (
                    <div
                      key={category.name}
                      onClick={() => handleSuggestionClick({ 
                        id: category.name, 
                        text: category.name.toLowerCase(), 
                        type: "category" 
                      })}
                      className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 cursor-pointer rounded text-sm"
                    >
                      <span>{category.name}</span>
                      <span className="text-xs text-gray-400">{category.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}