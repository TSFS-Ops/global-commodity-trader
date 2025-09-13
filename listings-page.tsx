import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ListingCard, ListingProps } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Plus, Search, SlidersHorizontal } from "lucide-react";
import { ListingCardSkeletonGrid } from "@/components/skeletons/listing-card-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function ListingsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  
  const { data: listings, isLoading } = useQuery({
    queryKey: ["/api/listings"],
    staleTime: 60 * 1000, // 1 minute
  });

  const locations = [
    "Eastern Cape, SA",
    "Pondoland, SA",
    "Grahamstown, SA",
    "Mtata, SA",
    "Multiple Regions"
  ];
  
  const formatListingData = (listing: any): ListingProps => ({
    id: listing.id,
    title: listing.title,
    description: listing.description || "",
    category: listing.category,
    price: `$${listing.pricePerUnit}`,
    priceNumeric: listing.pricePerUnit,
    unit: listing.unit,
    location: listing.location,
    image: listing.images && listing.images.length > 0 ? listing.images[0] : undefined,
    status: listing.status === 'active' ? 'available' : (listing.status === 'pending' ? 'limited' : 'sold'),
    minOrder: `${listing.minOrderQuantity} ${listing.unit}`,
    isFeatured: listing.isFeatured,
  });
  
  const filteredAndSortedListings = listings
    ? listings
        .filter((listing: any) => {
          // Search filter
          const matchesSearch = searchQuery === "" || 
            listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            listing.description.toLowerCase().includes(searchQuery.toLowerCase());
          
          // Category filter
          const matchesCategory = category === "all" || listing.category === category;
          
          // Price filter
          const matchesPrice = listing.pricePerUnit >= priceRange[0] && 
                              listing.pricePerUnit <= priceRange[1];
          
          // Location filter
          const matchesLocation = selectedLocations.length === 0 || 
                                selectedLocations.includes(listing.location);
          
          return matchesSearch && matchesCategory && matchesPrice && matchesLocation;
        })
        .sort((a: any, b: any) => {
          switch (sortOrder) {
            case "newest":
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case "oldest":
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case "price-asc":
              return a.pricePerUnit - b.pricePerUnit;
            case "price-desc":
              return b.pricePerUnit - a.pricePerUnit;
            default:
              return 0;
          }
        })
        .map(formatListingData)
    : [];

  const handleLocationChange = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location)
        ? prev.filter(loc => loc !== location)
        : [...prev, location]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategory("all");
    setPriceRange([0, 1000]);
    setSelectedLocations([]);
    setSortOrder("newest");
  };

  return (
    <MainLayout>
      {/* Page header and search */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2 md:mb-0">Market Listings</h1>
          
          {user?.role === 'seller' && (
            <Link href="/listings/new">
              <Button className="bg-primary hover:bg-primary-dark text-white" asChild>
                <a>
                  <Plus size={18} className="mr-2" />
                  Create Listing
                </a>
              </Button>
            </Link>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="Search products, titles, descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="hemp">Hemp</SelectItem>
                <SelectItem value="cannabis">Cannabis Products</SelectItem>
                <SelectItem value="biochar">Biochar</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Listings</SheetTitle>
                  <SheetDescription>
                    Refine your search with these filters
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-6">
                  <Accordion type="single" collapsible defaultValue="price" className="w-full">
                    <AccordionItem value="price">
                      <AccordionTrigger>Price Range</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <Slider
                            value={priceRange}
                            min={0}
                            max={1000}
                            step={10}
                            onValueChange={(value) => setPriceRange(value as [number, number])}
                          />
                          <div className="flex justify-between items-center">
                            <div>
                              <Label htmlFor="min-price">Min Price</Label>
                              <Input
                                id="min-price"
                                type="number"
                                value={priceRange[0]}
                                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="max-price">Max Price</Label>
                              <Input
                                id="max-price"
                                type="number"
                                value={priceRange[1]}
                                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="location">
                      <AccordionTrigger>Location</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {locations.map((location) => (
                            <div key={location} className="flex items-center space-x-2">
                              <Checkbox
                                id={`location-${location}`}
                                checked={selectedLocations.includes(location)}
                                onCheckedChange={() => handleLocationChange(location)}
                              />
                              <Label htmlFor={`location-${location}`}>{location}</Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      
      {/* Listings grid */}
      {isLoading ? (
        <ListingCardSkeletonGrid count={8} />
      ) : (
        <>
          {filteredAndSortedListings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-800 mb-2">No listings found</h3>
              <p className="text-neutral-600 mb-6">Try adjusting your search or filter criteria</p>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedListings.map((listing) => (
                <ListingCard key={listing.id} {...listing} />
              ))}
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}
