import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MapView } from '@/components/map/map-container';
import { GeoSearch } from '@/components/map/geo-search';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Listing, CannabisProduct, User } from '@shared/schema';
import { MapPin, List, Grid3X3 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ListingCardSkeletonGrid } from '@/components/skeletons/listing-card-skeleton';

// Interface for the geo search params
interface GeoSearchParams {
  location?: string;
  radius?: number;
  category?: string;
}

export default function GeographicPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<GeoSearchParams>({
    radius: 100, // Default radius in km
  });
  const [activeTab, setActiveTab] = useState('map');

  // Query for getting listings with coordinates
  const {
    data: listings = [],
    isLoading: isListingsLoading,
    isError: isListingsError,
  } = useQuery({
    queryKey: ['/api/listings/geo'],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (searchParams.location) params.append('location', searchParams.location);
        if (searchParams.radius) params.append('radius', String(searchParams.radius));
        if (searchParams.category) params.append('category', searchParams.category);
        
        const response = await apiRequest('GET', `/api/listings/geo?${params.toString()}`);
        const data = await response.json();
        return data;
      } catch (error) {
        // If API not ready, get default listings
        const response = await apiRequest('GET', '/api/listings');
        return await response.json();
      }
    },
  });

  // Handle geo search form submission
  const handleSearch = (data: GeoSearchParams) => {
    setSearchParams(data);
    toast({
      title: 'Searching...',
      description: `Looking for listings within ${data.radius}km of ${data.location || 'your area'}`,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Geographic Search</h1>
          <p className="text-muted-foreground mb-6">
            Find hemp and cannabis products near you or in specific regions
          </p>

          <GeoSearch onSearch={handleSearch} isLoading={isListingsLoading} />
        </div>

        <Tabs defaultValue="map" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="map" className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center">
                <List className="mr-2 h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="grid" className="flex items-center">
                <Grid3X3 className="mr-2 h-4 w-4" />
                Grid View
              </TabsTrigger>
            </TabsList>

            <div className="text-sm text-muted-foreground">
              {listings.length} results found
            </div>
          </div>

          <TabsContent value="map" className="mt-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Hemp & Cannabis Listings Map</CardTitle>
                <CardDescription>
                  Visualize product locations across South Africa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isListingsError ? (
                  <div className="h-[500px] flex items-center justify-center bg-muted rounded-md">
                    <p className="text-center text-muted-foreground">
                      Error loading map data. Please try again.
                    </p>
                  </div>
                ) : (
                  <MapView 
                    listings={listings} 
                    height="600px" 
                    width="100%" 
                    showPopups={true} 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="mt-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Listings List View</CardTitle>
                <CardDescription>
                  Detailed list of available products
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isListingsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {listings.length > 0 ? (
                      listings.map((listing: Listing) => (
                        <div
                          key={listing.id}
                          className="p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg">{listing.title}</h3>
                            <Badge>{listing.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{listing.description.substring(0, 150)}...</p>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{listing.location}</span>
                          </div>
                          <div className="mt-2 text-sm font-medium">
                            {listing.price} {listing.currency} | {listing.quantity} {listing.unit}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No listings found matching your criteria.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grid" className="mt-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Listings Grid View</CardTitle>
                <CardDescription>
                  Grid layout of available products
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isListingsLoading ? (
                  <ListingCardSkeletonGrid count={6} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.length > 0 ? (
                      listings.map((listing: Listing) => (
                        <div
                          key={listing.id}
                          className="p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{listing.title}</h3>
                            <Badge variant="outline">{listing.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{listing.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{listing.location}</span>
                          </div>
                          <div className="mt-2 text-sm font-medium">
                            {listing.price} {listing.currency}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground col-span-full">
                        No listings found matching your criteria.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}